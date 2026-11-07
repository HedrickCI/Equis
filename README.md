# Equis — Group work the fair way

Equis allocates group-project tasks fairly. A group owner adds the tasks with an
effort weight, records how much capacity each member has, and Equis distributes
the work so that no one carries a disproportionate share.

**Author:** Credo Hedrick Iranzi — African Leadership University, BSE
**Course:** Introduction to Software Engineering (PLD 14)

---

## The problem

Group projects distribute work badly. Tasks are claimed by whoever speaks first,
effort is invisible until the deadline, and free-riding is only discovered when
it is too late to correct. Students end up carrying unequal loads, and the marks
do not reflect who did what.

## The approach

Equis treats allocation as a load-balancing problem:

1. Each task carries an **effort weight** (1–10) set by the group owner.
2. Each member declares a **capacity** — the relative share of work they can take
   this sprint (for example, a member sitting an exam that week sets a lower one).
3. The allocator assigns tasks so each member's assigned weight lands as close as
   possible to their fair share of the total.

### The allocation algorithm

Equis uses the **Longest Processing Time first (LPT)** heuristic:

```
sort tasks by effort weight, heaviest first
for each task:
    assign it to the member whose current load, relative to their
    capacity, is the lowest
```

LPT is a well-known greedy approximation for multiprocessor scheduling. It is not
guaranteed optimal, but it is simple, fast, and produces a result within a known
bound of the optimum — which matters more here than perfection, because the
weights are human estimates anyway.

`backend/app/allocator.py` holds the implementation and its reasoning.

---

## MVP scope

In scope for the first release:

- Create a group and add members
- Add tasks with effort weights
- Set per-member capacity
- Run the allocation and view the result
- Reassign a task manually if the group disagrees

Deliberately out of scope for now (noted in the SRS as future work):

- Self and peer reporting of actual effort spent
- Free-riding detection and alerts
- Lecturer dashboard and cross-group analytics
- Integration with a learning management system

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Python + FastAPI | Automatic OpenAPI docs, type hints via Pydantic, light to learn |
| Database | PostgreSQL | Relational data with clear foreign keys; SQLAlchemy ORM |
| Frontend | React + Vite | Fast dev server, component model suits the task board |
| Testing | pytest | Allocation logic needs unit tests more than anything else does |

---

## Running it locally

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then set DATABASE_URL
uvicorn app.main:app --reload
```

API docs at http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App at http://localhost:5173

---

## Project status

Planning and design complete. Implementation in progress — see the
[issue backlog](../../issues) for the current sprint.

## Repository layout

```
backend/
  app/
    main.py          FastAPI application and routes
    models.py        SQLAlchemy ORM models
    schemas.py       Pydantic request/response schemas
    database.py      Engine and session management
    allocator.py     The allocation algorithm
  requirements.txt
frontend/
  src/               React components
docs/
  schema.sql         Database schema
  erd.md             Entity relationship diagram
```
