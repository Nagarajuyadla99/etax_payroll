from __future__ import annotations

import contextvars
from dataclasses import dataclass


@dataclass(frozen=True)
class RequestContext:
    request_id: str | None = None
    correlation_id: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None


_ctx: contextvars.ContextVar[RequestContext] = contextvars.ContextVar("request_context", default=RequestContext())


def set_request_context(ctx: RequestContext) -> None:
    _ctx.set(ctx)


def get_request_context() -> RequestContext:
    return _ctx.get()

