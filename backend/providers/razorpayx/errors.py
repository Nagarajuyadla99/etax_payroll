from __future__ import annotations

from typing import Any


class RazorpayXAPIError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        http_status: int | None = None,
        error_code: str | None = None,
        raw: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.http_status = http_status
        self.error_code = error_code
        self.raw = raw or {}
