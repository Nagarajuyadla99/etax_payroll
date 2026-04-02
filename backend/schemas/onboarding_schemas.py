from pydantic import BaseModel
from typing import List, Optional


class ManagerSchema(BaseModel):
    name: str
    email: str


class SetupSchema(BaseModel):
    departments: List[str]
    designations: List[str]
    locations: List[str]
    manager: Optional[ManagerSchema] = None