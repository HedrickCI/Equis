"""Equis API.

Routes are grouped by resource: groups, their members, their tasks, and the
allocation endpoint that ties them together.
"""

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas
from .allocator import Member as AllocMember
from .allocator import Task as AllocTask
from .allocator import allocate, fairness_score
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Equis",
    description="Fair allocation of group-project tasks by effort and capacity.",
    version="0.1.0",
)

# The Vite dev server runs on 5173.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_group(db: Session, group_id: int) -> models.Group:
    group = db.get(models.Group, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return group


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/groups", response_model=schemas.GroupOut, status_code=201)
def create_group(payload: schemas.GroupCreate, db: Session = Depends(get_db)):
    group = models.Group(name=payload.name)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@app.get("/groups/{group_id}", response_model=schemas.GroupOut)
def get_group(group_id: int, db: Session = Depends(get_db)):
    return _get_group(db, group_id)


@app.post(
    "/groups/{group_id}/members", response_model=schemas.MemberOut, status_code=201
)
def add_member(
    group_id: int, payload: schemas.MemberCreate, db: Session = Depends(get_db)
):
    _get_group(db, group_id)
    member = models.Member(group_id=group_id, **payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@app.post("/groups/{group_id}/tasks", response_model=schemas.TaskOut, status_code=201)
def add_task(
    group_id: int, payload: schemas.TaskCreate, db: Session = Depends(get_db)
):
    _get_group(db, group_id)
    task = models.Task(group_id=group_id, **payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@app.post("/groups/{group_id}/allocate", response_model=schemas.AllocationResult)
def run_allocation(group_id: int, db: Session = Depends(get_db)):
    """Distribute this group's tasks across its members and save the result."""
    group = _get_group(db, group_id)

    if not group.tasks:
        raise HTTPException(status_code=400, detail="Group has no tasks to allocate")
    if not any(m.capacity > 0 for m in group.members):
        raise HTTPException(
            status_code=400, detail="Group has no members with capacity above zero"
        )

    alloc_members = [
        AllocMember(id=m.id, name=m.name, capacity=m.capacity) for m in group.members
    ]
    alloc_tasks = [AllocTask(id=t.id, title=t.title, weight=t.weight) for t in group.tasks]

    result = allocate(alloc_tasks, alloc_members)

    # Write the assignments back to the database.
    assignment_of = {
        task.id: member.id for member in result for task in member.assigned
    }
    for task in group.tasks:
        task.assignee_id = assignment_of.get(task.id)
    db.commit()

    for task in group.tasks:
        db.refresh(task)

    return schemas.AllocationResult(
        group_id=group_id,
        fairness_score=round(fairness_score(result), 3),
        assignments=group.tasks,
    )


@app.patch("/tasks/{task_id}/assignee", response_model=schemas.TaskOut)
def reassign_task(
    task_id: int, member_id: int | None = None, db: Session = Depends(get_db)
):
    """Override the allocator when the group disagrees with a placement."""
    task = db.get(models.Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if member_id is not None:
        member = db.get(models.Member, member_id)
        if member is None or member.group_id != task.group_id:
            raise HTTPException(
                status_code=400, detail="Member is not in this task's group"
            )

    task.assignee_id = member_id
    db.commit()
    db.refresh(task)
    return task
