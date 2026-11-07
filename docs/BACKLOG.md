# Equis product backlog

Each item below becomes one GitHub issue. Format: user story plus acceptance
criteria, so "done" is not a matter of opinion.

Labels to create first: `sprint-1`, `sprint-2`, `sprint-3`, `backend`,
`frontend`, `database`, `docs`, `testing`, `risk`.

---

## Sprint 1 — Foundation

### 1. Set up the project repository
`docs`
As a developer, I want a structured repository so that the codebase is navigable.
- [ ] README explains the problem, the approach and how to run it
- [ ] `.gitignore` covers Python, Node and environment files
- [ ] Backend and frontend directories separated

### 2. Create the database schema
`database`
As a developer, I want the tables defined so that data has somewhere to live.
- [ ] `groups`, `members` and `tasks` tables created
- [ ] Foreign keys with the right cascade behaviour
- [ ] Weight constrained to 1–10 at the database level

### 3. Set up the FastAPI application
`backend`
As a developer, I want a running API so that the frontend has something to call.
- [ ] `uvicorn app.main:app` starts without error
- [ ] `/health` returns 200
- [ ] `/docs` shows the generated OpenAPI page

### 4. Implement the allocation algorithm
`backend` `testing`
As a group owner, I want tasks distributed by effort and capacity so that the
split is fair.
- [ ] LPT heuristic implemented
- [ ] Capacity of 0 excludes a member from allocation
- [ ] Fairness score returned alongside the assignments
- [ ] Unit tests cover equal capacity, unequal capacity, zero capacity, and the
      no-available-members error

### 5. Set up the React frontend
`frontend`
As a developer, I want a running frontend so that the API has a client.
- [ ] `npm run dev` serves on port 5173
- [ ] API wrapper module in place
- [ ] Base styles defined

---

## Sprint 2 — Core flow

### 6. Create a group
`backend` `frontend`
As a group owner, I want to create a group so that I have somewhere to add work.
- [ ] `POST /groups` creates and returns the group
- [ ] Form in the UI, with validation on an empty name
- [ ] The created group becomes the active one

### 7. Add members with capacity
`backend` `frontend`
As a group owner, I want to add members and set how much each can take on.
- [ ] `POST /groups/{id}/members` accepts name, optional email and capacity
- [ ] Capacity defaults to 1.0 and is bounded 0–2
- [ ] Members listed in the UI with their capacity

### 8. Add tasks with effort weights
`backend` `frontend`
As a group owner, I want to record the work and how heavy each piece is.
- [ ] `POST /groups/{id}/tasks` accepts title, optional description and weight
- [ ] Weight rejected outside 1–10 with a clear message
- [ ] Tasks listed in the UI with weight and assignee

### 9. Run an allocation
`backend` `frontend`
As a group owner, I want the system to distribute tasks so that I do not have to
argue about it.
- [ ] `POST /groups/{id}/allocate` assigns every task
- [ ] Assignments persist to the database
- [ ] Fairness score shown to the user
- [ ] Clear error when the group has no tasks or no available members

### 10. Reassign a task manually
`backend` `frontend`
As a group member, I want to swap a task so that the group can override the
algorithm when it knows better.
- [ ] `PATCH /tasks/{id}/assignee` changes or clears the assignee
- [ ] Rejects a member who is not in that task's group
- [ ] UI control on each task row

---

## Sprint 3 — Polish and evaluation

### 11. Show the load breakdown per member
`frontend`
As a group member, I want to see everyone's total weight so that I can judge the
split for myself.
- [ ] Per-member total weight displayed
- [ ] Visual indication of who is over or under their share

### 12. Handle API errors in the UI
`frontend`
As a user, I want to be told what went wrong rather than seeing nothing happen.
- [ ] Failed requests surface the API's message
- [ ] Buttons disabled while a request is in flight

### 13. Write the API tests
`testing` `backend`
As a developer, I want the routes covered so that refactoring is safe.
- [ ] Happy path for each endpoint
- [ ] 404 on a missing group
- [ ] 400 on allocating an empty group

### 14. Evaluate the allocator against a real group
`docs` `risk`
As the author, I want evidence the algorithm actually helps so that the claim in
my report is supported.
- [ ] Run it on a real past group project's task list
- [ ] Compare the fairness score against how the work was actually split
- [ ] Write up the result, including where it did worse

### 15. Write the user guide
`docs`
As a new user, I want to know how to use Equis without being told.
- [ ] Walkthrough of the full flow with screenshots
- [ ] The capacity scale explained

---

## Known risks

| Risk | Mitigation |
|---|---|
| Effort weights are guesses, so a "fair" split may not feel fair | Issue 14 tests this against a real group; manual reassignment (issue 10) is the escape hatch |
| Scope creep toward peer reporting and analytics | Those are explicitly out of the MVP; they stay in the backlog unassigned to a sprint |
| Learning FastAPI while building | Ntwali is on the same stack in this PLD — ask rather than stall |
