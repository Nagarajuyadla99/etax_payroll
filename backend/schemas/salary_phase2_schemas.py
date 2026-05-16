from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ============================================================
# PHASE 2: SALARY COMPONENTS (V2)
# ============================================================


class SalaryComponentV2Base(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

    component_category: str  # earning|deduction|employer_contribution|statutory
    calculation_type: str  # fixed|formula|system

    formula_expression: Optional[str] = None
    system_code: Optional[str] = None

    rounding_rule: dict[str, Any] = Field(default_factory=dict)
    meta: dict[str, Any] = Field(default_factory=dict)

    is_active: bool = True


class SalaryComponentV2Create(SalaryComponentV2Base):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "code": "BASIC",
                    "name": "Basic",
                    "description": None,
                    "component_category": "earning",
                    "calculation_type": "fixed",
                    "formula_expression": None,
                    "system_code": None,
                    "rounding_rule": {"scale": 2},
                    "meta": {},
                    "is_active": True,
                }
            ]
        }
    )


class SalaryComponentV2Update(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None

    component_category: Optional[str] = None
    calculation_type: Optional[str] = None

    formula_expression: Optional[str] = None
    system_code: Optional[str] = None

    rounding_rule: Optional[dict[str, Any]] = None
    meta: Optional[dict[str, Any]] = None

    is_active: Optional[bool] = None


class SalaryComponentV2Out(SalaryComponentV2Base):
    component_id: UUID
    organisation_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_component(cls, data: Any) -> Any:
        if isinstance(data, dict):
            row = dict(data)
            component_type = row.get("component_type")
            calc_type = row.get("calc_type")
            formula = row.get("formula")
        else:
            component_type = getattr(data, "component_type", None)
            calc_type = getattr(data, "calc_type", None)
            formula = getattr(data, "formula", None)
            row = {
                "component_id": getattr(data, "component_id", None),
                "organisation_id": getattr(data, "organisation_id", None),
                "code": getattr(data, "code", None),
                "name": getattr(data, "name", None),
                "description": getattr(data, "description", None),
                "component_category": getattr(data, "component_category", None),
                "calculation_type": getattr(data, "calculation_type", None),
                "formula_expression": getattr(data, "formula_expression", None),
                "system_code": getattr(data, "system_code", None),
                "rounding_rule": getattr(data, "rounding_rule", None),
                "meta": getattr(data, "meta", None),
                "is_active": getattr(data, "is_active", True),
                "created_at": getattr(data, "created_at", None),
                "updated_at": getattr(data, "updated_at", None),
            }

        row["component_category"] = row.get("component_category") or component_type or "earning"
        row["calculation_type"] = row.get("calculation_type") or calc_type or "fixed"
        row["code"] = row.get("code") or row.get("name") or (
            str(row["component_id"]) if row.get("component_id") else "COMPONENT"
        )
        if not row.get("formula_expression") and formula:
            row["formula_expression"] = formula
        if row.get("rounding_rule") is None:
            row["rounding_rule"] = {}
        if row.get("meta") is None:
            row["meta"] = {}
        return row


# ============================================================
# PHASE 2: COMPONENT GROUPS
# ============================================================


class SalaryComponentGroupBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class SalaryComponentGroupCreate(SalaryComponentGroupBase):
    pass


class SalaryComponentGroupUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SalaryComponentGroupOut(SalaryComponentGroupBase):
    group_id: UUID
    organisation_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SalaryComponentGroupItemCreate(BaseModel):
    component_id: UUID
    sequence: int = 1


class SalaryComponentGroupItemOut(BaseModel):
    id: UUID
    group_id: UUID
    component_id: UUID
    sequence: int

    model_config = ConfigDict(from_attributes=True)


class SalaryComponentGroupWithItemsOut(SalaryComponentGroupOut):
    items: list[SalaryComponentGroupItemOut] = []


# ============================================================
# PHASE 2: DERIVED VARIABLES
# ============================================================


class SalaryDerivedVariableBase(BaseModel):
    code: str
    name: str
    expression: str
    data_type: str = "number"  # number|boolean
    is_active: bool = True


class SalaryDerivedVariableCreate(SalaryDerivedVariableBase):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "code": "PF_WAGE",
                    "name": "PF Wage",
                    "expression": "BASIC",
                    "data_type": "number",
                    "is_active": True,
                }
            ]
        }
    )


class SalaryDerivedVariableUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    expression: Optional[str] = None
    data_type: Optional[str] = None
    is_active: Optional[bool] = None


class SalaryDerivedVariableOut(SalaryDerivedVariableBase):
    variable_id: UUID
    organisation_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# PHASE 2: ORG STATUTORY CONFIGS
# ============================================================


class OrgStatutoryConfigBase(BaseModel):
    statutory_code: str
    is_enabled: bool = True
    effective_from: date
    effective_to: Optional[date] = None
    settings: dict[str, Any] = Field(default_factory=dict)


class OrgStatutoryConfigCreate(OrgStatutoryConfigBase):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "statutory_code": "PF",
                    "is_enabled": True,
                    "effective_from": "2026-05-08",
                    "effective_to": None,
                    "settings": {
                        "pf_wage_context_key": "PF_WAGE",
                        "employee_rate": 12,
                        "is_capped": True,
                        "wage_limit": 15000,
                    },
                }
            ]
        }
    )


class OrgStatutoryConfigUpdate(BaseModel):
    statutory_code: Optional[str] = None
    is_enabled: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    settings: Optional[dict[str, Any]] = None


class OrgStatutoryConfigOut(OrgStatutoryConfigBase):
    config_id: UUID
    organisation_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# PHASE 2: TEMPLATE GROUP LINKS
# ============================================================


class SalaryTemplateGroupLinkCreate(BaseModel):
    group_id: UUID
    sequence: int = 1
    is_active: bool = True


class SalaryTemplateGroupLinkUpdate(BaseModel):
    sequence: Optional[int] = None
    is_active: Optional[bool] = None


class SalaryTemplateGroupLinkOut(BaseModel):
    id: UUID
    template_id: UUID
    group_id: UUID
    sequence: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# PHASE 2: EMPLOYEE SALARY OVERRIDES (additive)
# ============================================================


class EmployeeSalaryStructureOverridesUpdate(BaseModel):
    overrides: dict[str, Any] = Field(default_factory=dict)


class FormulaValidateRequest(BaseModel):
    expression: str
    context: str = "generic"
    known_identifiers: Optional[list[str]] = Field(
        default=None,
        description="Component codes, derived variable codes, and allowed symbols for dependency audit.",
    )
    strict_unknown_identifiers: bool = Field(
        default=False,
        description="If true, unknown formula identifiers fail validation (after syntax check).",
    )
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"expression": "round(BASIC * 0.4)", "context": "generic"},
                {"expression": "if(BASIC > 15000, BASIC, 15000)", "context": "generic"},
            ]
        }
    )


class FormulaValidateResponse(BaseModel):
    is_valid: bool
    dependencies: list[str] = []
    error: Optional[str] = None
    warnings: list[str] = Field(default_factory=list)
    unknown_dependencies: list[str] = Field(default_factory=list)
    risk_hints: list[str] = Field(default_factory=list)


# ============================================================
# PHASE 2: SALARY PREVIEW (CALCULATION ONLY)
# ============================================================


class SalaryPreviewRequest(BaseModel):
    employee_id: Optional[UUID] = None
    template_id: UUID
    ctc: float
    as_of_date: date
    pay_period_id: Optional[UUID] = Field(
        default=None,
        description="When set with employee_id, merge attendance + LOP for this period into overrides (same as payroll run).",
    )
    overrides: dict[str, Any] = Field(default_factory=dict)
    save_snapshot: bool = Field(
        default=False,
        description="Persist audit-grade preview snapshot rows when true.",
    )
    include_versions: bool = Field(
        default=False,
        description="Include resolved configuration version ids in the preview response.",
    )
    include_engine_audit: bool = Field(
        default=False,
        description="When true, include preview_audit (attendance merge, wage proration factor, etc.).",
    )
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "employee_id": None,
                    "template_id": "00000000-0000-0000-0000-000000000000",
                    "ctc": 120000,
                    "as_of_date": "2026-05-08",
                    "overrides": {},
                    "save_snapshot": False,
                    "include_versions": False,
                }
            ]
        }
    )


class SalaryPreviewLineOut(BaseModel):
    component_id: UUID
    component_code: str
    name: str
    category: str
    amount: float
    source: str
    breakdown: Optional[dict[str, Any]] = None


class SalaryPreviewResponse(BaseModel):
    as_of_date: date
    template_id: UUID
    ctc: float
    trace_id: Optional[str] = None
    variables: dict[str, float] = Field(default_factory=dict)
    lines: list[SalaryPreviewLineOut] = Field(default_factory=list)
    totals: dict[str, float] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)
    template_version_id: Optional[UUID] = Field(
        default=None,
        description="Set when preview resolved an effective salary_template_versions row.",
    )
    resolved_versions: Optional[dict[str, Any]] = Field(
        default=None,
        description="Filled when include_versions=true on the request.",
    )
    template_engine_meta: Optional[dict[str, Any]] = Field(
        default=None,
        description="Template-level engine flags (e.g. prorate_with_attendance) passed into the calculator.",
    )
    preview_audit: Optional[dict[str, Any]] = Field(
        default=None,
        description="Populated when include_engine_audit=true on the request.",
    )


# ============================================================
# VERSION PUBLISH (effective-dated snapshots)
# ============================================================


class SalaryVersionPublishBody(BaseModel):
    effective_from: date


class SalaryTemplateVersionPublishBody(BaseModel):
    effective_from: date
    label: Optional[str] = None
    engine_meta: Optional[dict[str, Any]] = Field(
        default=None,
        description="Merged into the new template version meta (e.g. prorate_with_attendance).",
    )


class PublishedSalaryComponentVersionOut(BaseModel):
    version_id: UUID
    component_id: UUID
    effective_from: date
    effective_to: Optional[date] = None


class PublishedSalaryDerivedVariableVersionOut(BaseModel):
    version_id: UUID
    variable_id: UUID
    effective_from: date
    effective_to: Optional[date] = None


class PublishedSalaryGroupVersionOut(BaseModel):
    group_version_id: UUID
    group_id: UUID
    effective_from: date
    effective_to: Optional[date] = None


class PublishedSalaryTemplateVersionOut(BaseModel):
    template_version_id: UUID
    template_id: UUID
    effective_from: date
    effective_to: Optional[date] = None
    label: Optional[str] = None

