"""Pydantic schemas for request and response bodies."""

from pydantic import BaseModel, ConfigDict, Field


class MemberCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str | None = None
    capacity: float = Field(default=1.0, ge=0.0, le=2.0)


class MemberOut(MemberCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_id: int


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    weight: int = Field(ge=1, le=10)


class TaskOut(TaskCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    group_id: int
    assignee_id: int | None = None


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    members: list[MemberOut] = []
    tasks: list[TaskOut] = []


class AllocationResult(BaseModel):
    """What the allocator returns: the split plus how even it is."""

    group_id: int
    fairness_score: float = Field(ge=0.0, le=1.0)
    assignments: list[TaskOut]
