from datetime import date
from uuid import uuid4

import pytest
from pydantic import ValidationError

from schemas.salary_phase2_schemas import (
    OrgStatutoryConfigCreate,
    SalaryComponentGroupItemCreate,
    SalaryComponentV2Create,
    SalaryDerivedVariableCreate,
    SalaryPreviewRequest,
)


def test_component_requires_required_fields():
    with pytest.raises(ValidationError):
        SalaryComponentV2Create.model_validate({"code": "BASIC"})


def test_group_item_requires_uuid_component_id():
    with pytest.raises(ValidationError):
        SalaryComponentGroupItemCreate.model_validate({"component_id": "not-a-uuid", "sequence": 1})


def test_derived_variable_requires_expression():
    with pytest.raises(ValidationError):
        SalaryDerivedVariableCreate.model_validate({"code": "X", "name": "X"})


def test_statutory_config_requires_effective_from():
    with pytest.raises(ValidationError):
        OrgStatutoryConfigCreate.model_validate({"statutory_code": "PF", "settings": {}})


def test_preview_requires_template_id_and_date():
    with pytest.raises(ValidationError):
        SalaryPreviewRequest.model_validate({"ctc": 100000})

    req = SalaryPreviewRequest.model_validate(
        {"template_id": str(uuid4()), "ctc": 120000, "as_of_date": str(date.today()), "overrides": {}}
    )
    assert req.template_id

