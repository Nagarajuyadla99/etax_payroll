from __future__ import annotations

import ast
from dataclasses import dataclass
from decimal import Decimal, ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP
import math
import os
import logging
from typing import Any, Iterable


@dataclass(frozen=True)
class FormulaValidationResult:
    is_valid: bool
    dependencies: list[str]
    error: str | None = None


class FormulaError(ValueError):
    pass


_ALLOWED_BINOPS = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod)
_ALLOWED_UNARYOPS = (ast.UAdd, ast.USub, ast.Not)
_ALLOWED_BOOLOPS = (ast.And, ast.Or)
_ALLOWED_CMPOPS = (ast.Gt, ast.GtE, ast.Lt, ast.LtE, ast.Eq, ast.NotEq)

_ALLOWED_FUNCS = {"min", "max", "if", "round", "ceil", "floor", "abs", "sum", "avg"}
_RESERVED_NAMES = {"ctc"}


def _as_decimal(v: Any) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    if isinstance(v, bool):
        return Decimal("1") if v else Decimal("0")
    try:
        return Decimal(str(v))
    except Exception as e:  # noqa: BLE001
        raise FormulaError(f"Unsupported value type: {type(v).__name__}") from e


def _to_bool(v: Any) -> bool:
    if isinstance(v, bool):
        return v
    if isinstance(v, Decimal):
        return v != 0
    if isinstance(v, (int, float)):
        return v != 0
    if v is None:
        return False
    raise FormulaError(f"Unsupported boolean value: {type(v).__name__}")


def _names_in_ast(node: ast.AST) -> set[str]:
    names: set[str] = set()
    for n in ast.walk(node):
        if isinstance(n, ast.Name):
            names.add(n.id)
    return names


def validate_formula(expression: str) -> FormulaValidationResult:
    expr = (expression or "").strip()
    if not expr:
        return FormulaValidationResult(False, [], "expression is required")
    if len(expr) > 500:
        return FormulaValidationResult(False, [], "expression too long (max 500 chars)")

    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as e:
        return FormulaValidationResult(False, [], f"syntax error: {e.msg}")

    try:
        _validate_node(tree.body)
        deps = sorted(
            {
                n
                for n in _names_in_ast(tree.body)
                if n.lower() not in _RESERVED_NAMES and n not in _ALLOWED_FUNCS
            }
        )
        return FormulaValidationResult(True, deps, None)
    except FormulaError as e:
        return FormulaValidationResult(False, [], str(e))


def _validate_node(node: ast.AST) -> None:
    # Literals
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float, bool)) or node.value is None:
            return
        raise FormulaError("only numeric/boolean literals are allowed")

    # Names
    if isinstance(node, ast.Name):
        # Names are resolved from context at runtime.
        return

    # Parentheses are implicit in AST.

    # Unary ops: +x, -x, not x
    if isinstance(node, ast.UnaryOp):
        if not isinstance(node.op, _ALLOWED_UNARYOPS):
            raise FormulaError("unsupported unary operator")
        _validate_node(node.operand)
        return

    # Binary arithmetic
    if isinstance(node, ast.BinOp):
        if not isinstance(node.op, _ALLOWED_BINOPS):
            raise FormulaError("unsupported operator")
        _validate_node(node.left)
        _validate_node(node.right)
        return

    # Boolean operations: a and b, a or b
    if isinstance(node, ast.BoolOp):
        if not isinstance(node.op, _ALLOWED_BOOLOPS):
            raise FormulaError("unsupported boolean operator")
        for v in node.values:
            _validate_node(v)
        return

    # Comparisons: a > b, etc.
    if isinstance(node, ast.Compare):
        _validate_node(node.left)
        for op in node.ops:
            if not isinstance(op, _ALLOWED_CMPOPS):
                raise FormulaError("unsupported comparison operator")
        for c in node.comparators:
            _validate_node(c)
        return

    # Function calls: min/max/if
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in _ALLOWED_FUNCS:
            raise FormulaError("unsupported function")
        for a in node.args:
            _validate_node(a)
        if node.keywords:
            raise FormulaError("keyword arguments are not allowed")
        # arity checks
        if node.func.id in {"min", "max"} and len(node.args) != 2:
            raise FormulaError(f"{node.func.id} expects 2 arguments")
        if node.func.id == "if" and len(node.args) != 3:
            raise FormulaError("if expects 3 arguments: if(condition, x, y)")
        if node.func.id in {"ceil", "floor", "abs"} and len(node.args) != 1:
            raise FormulaError(f"{node.func.id} expects 1 argument")
        if node.func.id == "round" and len(node.args) not in {1, 2}:
            raise FormulaError("round expects 1 or 2 arguments: round(x[, ndigits])")
        if node.func.id in {"sum", "avg"} and len(node.args) < 1:
            raise FormulaError(f"{node.func.id} expects at least 1 argument")
        return

    raise FormulaError(f"unsupported expression element: {type(node).__name__}")


def evaluate_formula(expression: str, context: dict[str, Any]) -> Decimal:
    expr = (expression or "").strip()
    if not expr:
        return Decimal("0")
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as e:
        raise FormulaError(f"syntax error: {e.msg}") from e

    _validate_node(tree.body)
    out = _eval_node(tree.body, context or {})
    if os.getenv("FORMULA_TRACE_LOGS", "false").lower() == "true":
        # Minimal trace: do not log context values (PII/financial); only expression + result
        try:
            logging.getLogger("payroll.formula").info(
                "formula_eval expr=%r result=%s",
                expr,
                str(out),
            )
        except Exception:
            pass
    return out


def _eval_node(node: ast.AST, ctx: dict[str, Any]) -> Decimal:
    if isinstance(node, ast.Constant):
        if node.value is None:
            return Decimal("0")
        return _as_decimal(node.value)

    if isinstance(node, ast.Name):
        key = node.id
        # case-insensitive fallback: allow BASIC vs basic
        if key in ctx:
            return _as_decimal(ctx[key])
        lk = key.lower()
        for k, v in ctx.items():
            if str(k).lower() == lk:
                return _as_decimal(v)
        return Decimal("0")

    if isinstance(node, ast.UnaryOp):
        if isinstance(node.op, ast.Not):
            return Decimal("1") if (not _to_bool(_eval_node(node.operand, ctx))) else Decimal("0")
        val = _eval_node(node.operand, ctx)
        if isinstance(node.op, ast.UAdd):
            return val
        if isinstance(node.op, ast.USub):
            return -val
        raise FormulaError("unsupported unary operator")

    if isinstance(node, ast.BinOp):
        left = _eval_node(node.left, ctx)
        right = _eval_node(node.right, ctx)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            if right == 0:
                return Decimal("0")
            return left / right
        if isinstance(node.op, ast.Mod):
            if right == 0:
                return Decimal("0")
            # Decimal modulo is supported
            return left % right
        raise FormulaError("unsupported operator")

    if isinstance(node, ast.BoolOp):
        if isinstance(node.op, ast.And):
            return Decimal("1") if all(_to_bool(_eval_node(v, ctx)) for v in node.values) else Decimal("0")
        if isinstance(node.op, ast.Or):
            return Decimal("1") if any(_to_bool(_eval_node(v, ctx)) for v in node.values) else Decimal("0")
        raise FormulaError("unsupported boolean operator")

    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, ctx)
        cur_left = left
        for op, comp in zip(node.ops, node.comparators, strict=False):
            right = _eval_node(comp, ctx)
            ok = _cmp(cur_left, op, right)
            if not ok:
                return Decimal("0")
            cur_left = right
        return Decimal("1")

    if isinstance(node, ast.Call):
        func = node.func.id  # validated
        args = [_eval_node(a, ctx) for a in node.args]
        if func == "min":
            return args[0] if args[0] <= args[1] else args[1]
        if func == "max":
            return args[0] if args[0] >= args[1] else args[1]
        if func == "if":
            cond = _to_bool(args[0])
            return args[1] if cond else args[2]
        if func == "abs":
            return args[0].copy_abs()
        if func == "ceil":
            return args[0].to_integral_value(rounding=ROUND_CEILING)
        if func == "floor":
            return args[0].to_integral_value(rounding=ROUND_FLOOR)
        if func == "round":
            if len(args) == 1:
                return args[0].to_integral_value(rounding=ROUND_HALF_UP)
            nd = args[1]
            try:
                # Be strict: ndigits must be an integer (no silent truncation like int(Decimal("1.5")) -> 1)
                if isinstance(nd, Decimal) and nd != nd.to_integral_value():
                    raise ValueError("ndigits must be integer")
                n = int(nd)
            except Exception as e:  # noqa: BLE001
                raise FormulaError("round ndigits must be an integer") from e
            q = Decimal("1").scaleb(-n)
            return args[0].quantize(q, rounding=ROUND_HALF_UP)
        if func == "sum":
            out = Decimal("0")
            for a in args:
                out += a
            return out
        if func == "avg":
            out = Decimal("0")
            for a in args:
                out += a
            return out / Decimal(str(len(args))) if args else Decimal("0")
        raise FormulaError("unsupported function")

    raise FormulaError(f"unsupported expression element: {type(node).__name__}")


def _cmp(left: Decimal, op: ast.cmpop, right: Decimal) -> bool:
    if isinstance(op, ast.Gt):
        return left > right
    if isinstance(op, ast.GtE):
        return left >= right
    if isinstance(op, ast.Lt):
        return left < right
    if isinstance(op, ast.LtE):
        return left <= right
    if isinstance(op, ast.Eq):
        return left == right
    if isinstance(op, ast.NotEq):
        return left != right
    raise FormulaError("unsupported comparison operator")

