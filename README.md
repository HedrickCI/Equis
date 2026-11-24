# Equis

**Group work the fair way.** Equis distributes group-project tasks across members
by effort weight and declared capacity, so that nobody carries a disproportionate
share, and the split is visible to everyone.

Built as the individual project for Introduction to Software Engineering,
African Leadership University.

---

## Live

| | |
|---|---|
| Application | https://equis-frontend.vercel.app |
| API docs | https://equis-api.onrender.com/docs |
| Health check | https://equis-api.onrender.com/health |

> The API runs on a free Render instance and the database on a free Neon
> instance. Both suspend when idle, so the **first request after a quiet period
> can take 40–60 seconds**. Subsequent requests are immediate. If the page looks
> stuck on first load, give it a minute.

---

## The problem

Group projects in universities (starting with ALU) distribute work informally — usually over WhatsApp,
usually by whoever speaks first. That process keeps no record of who agreed to
what and takes no account of how much work each task actually is. A task that
takes one hour and a task that takes eight are treated as one task each.

The result is the free-rider problem: someone receives a grade without having
carried a comparable share. In a survey of ALU undergraduates conducted for this
project (n = 5), four of five respondents reported doing work originally assigned
to someone else.

Equis replaces that with an explicit model: every task carries an effort weight,
every member declares a capacity, and the system produces a split that balances
load against capacity.

## How the allocation works

Assigning weighted tasks to members with differing capacities is a variant of
multiprocessor scheduling, which is NP-hard. Equis uses the **Longest Processing
Time first (LPT)** greedy heuristic:

1. Sort tasks heaviest first.
2. Give each task to whoever is currently least loaded *relative to their capacity*.
3. Break ties by capacity, so an opening task goes to whoever can absorb the most.

LPT is a 4/3-approximation in the equal-capacity case (Graham, 1969), which is
comfortably sufficient here — effort weights are human estimates, so chasing an
exact optimum would be false precision.

A **fairness score** is returned alongside the assignment: `1 - (max - min) / mean`
over the members' relative loads, where 1.0 is a perfectly even split. It gives
the group a single number to judge the result by, and gives the test suite
something to assert against.

---

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy 2.x |
| Database | PostgreSQL in production, SQLite for local development |
| Frontend | React with Vite |
| Tests | pytest |
| Hosting | Render (API), Vercel (frontend), Neon (Postgres) |

## Prerequisites

- **Python 3.12** — 3.13 also works. Avoid 3.14: several pinned dependencies have
  no prebuilt wheels for it and will try to compile from source.
- **Node.js 18 or later**
- **Git**

---

## Running it locally

Clone the repository:

```bash
git clone https://github.com/HedrickCI/Equis.git
cd Equis
```

### Backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# Windows (Command Prompt)
.venv\Scripts\activate.bat

# macOS / Linux
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a file called `.env` inside `backend/` containing one line:

```
DATABASE_URL=sqlite:///./equis.db
```

Start the server:

```bash
uvicorn app.main:app --reload
```

The API is now on **http://localhost:8000**, with interactive documentation at
**http://localhost:8000/docs**. Tables are created automatically on first start;
there is no migration step.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create a file called `.env` inside `frontend/` containing one line:

```
VITE_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

The application is now on **http://localhost:5173**.

> Vite reads environment variables at build time, not run time. If you change
> `.env`, restart `npm run dev` or the old value stays compiled in.

### Walking the flow

1. Create a group.
2. Add three members with different capacities — 1.0, 0.5 and 1.5.
3. Add five or six tasks with weights spread across 1–10.
4. Press **Allocate fairly**.
5. Open the **Dashboard** tab to see each member's load relative to their capacity.

## Tests

From `backend/`, with the virtual environment active:

```bash
pytest
```

Seven tests cover the allocator: equal capacity, unequal capacity, members with
zero capacity, the no-available-members error, and the fairness score.

---

## Project structure

```
Equis/
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI application and routes
│   │   ├── models.py        SQLAlchemy ORM models
│   │   ├── schemas.py       Pydantic request and response models
│   │   ├── database.py      Engine, session, declarative base
│   │   └── allocator.py     The LPT allocation heuristic
│   ├── tests/
│   │   └── test_allocator.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx          UI, one tab per SRS area
│   │   ├── api.js           Thin wrapper over the API
│   │   └── equis.css        Styles
│   └── package.json
└── docs/
    └── BACKLOG.md           User stories and acceptance criteria
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/groups` | Create a group |
| GET | `/groups/{id}` | Group with its members and tasks |
| POST | `/groups/{id}/members` | Add a member with a capacity |
| POST | `/groups/{id}/tasks` | Add a task with an effort weight |
| POST | `/groups/{id}/allocate` | Run the allocation and persist it |
| PATCH | `/tasks/{id}/assignee` | Move a task to another member |

---

## Coverage against the SRS

The interface is organised by SRS area, and each panel is tagged with the
functional requirements it covers.

| SRS area | Implemented | Placeholder |
|---|---|---|
| Accounts | — | FR 1.1–1.3 |
| Groups | FR 2.1, 2.3 | FR 2.2, 2.4 |
| Tasks | FR 3.1 | FR 3.2–3.4 |
| Allocation | FR 4.1, 4.4, 4.5 | FR 4.2, 4.3 |
| Progress | — | FR 5.1–5.3 |
| Dashboard | FR 6.1, 6.4 | FR 6.2, 6.3 |

Placeholders render as visible, labelled controls rather than being hidden, so
the scope of the full system is legible from the interface itself.

## Deviations from the SRS

The SRS was written before implementation was completed. Three decisions diverged from
it, each deliberately:

**Flask → FastAPI.** The SRS specifies Flask. FastAPI was chosen instead for
built-in Pydantic request validation and the automatically generated OpenAPI
documentation at `/docs`, which made the API testable by hand from the first day
of development without writing a client.

**Available hours → relative capacity.** The SRS models capacity as hours per
week. The implementation uses a relative multiplier where 1.0 is a normal load.
Hour estimates assume members can predict their own availability in absolute
terms, which the project survey suggested they cannot; a relative figure is
easier to agree on within a group and the allocation only ever uses the ratio
between members, never the absolute value.

**Tie-break by capacity, not by task count.** Appendix B of the SRS breaks ties
by giving the task to whoever holds fewer tasks. In testing this produced poor
opening moves: every member starts at a relative load of zero, so the first
tasks were assigned in list order, and a heavy task could land on a
half-capacity member before any load information existed. Breaking ties by
capacity instead moved a representative five-task, three-member split from a
fairness score of 0.258 to 0.778.

## Deployment notes

- **Render** — root directory `backend`, build `pip install -r requirements.txt`,
  start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Set `PYTHON_VERSION`
  to `3.12.8`.
- **Vercel** — root directory `frontend`, Vite preset, with `VITE_API_URL` set to
  the API's base URL and no trailing slash.
- **`DATABASE_URL` scheme.** SQLAlchemy 2.1 defaults a bare `postgresql://` URL to
  the psycopg 3 driver. This project installs `psycopg2-binary`, so the
  production URL must be written `postgresql+psycopg2://...` or the application
  fails at import with `ModuleNotFoundError: No module named 'psycopg'`.
- **Connection pooling.** The engine uses `pool_pre_ping` and `pool_recycle`,
  because free-tier managed databases suspend when idle and a pooled connection
  can be dead by the time a request reuses it.

---

## Author

Hedrick Credo Iranzi (c.iranzi@alustudent.com) — African Leadership University
