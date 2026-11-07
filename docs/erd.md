# Entity Relationship Diagram

```mermaid
erDiagram
    GROUP ||--o{ MEMBER : "has"
    GROUP ||--o{ TASK : "has"
    MEMBER ||--o{ TASK : "is assigned"

    GROUP {
        int id PK
        string name
        datetime created_at
    }

    MEMBER {
        int id PK
        int group_id FK
        string name
        string email
        float capacity "1.0 = normal load"
    }

    TASK {
        int id PK
        int group_id FK
        string title
        string description
        int weight "1-10 effort estimate"
        int assignee_id FK "null until allocated"
    }
```

## Design notes

**Why capacity sits on Member rather than a separate table.** Capacity is
per-sprint in the full vision, which would need its own table keyed by sprint.
For the MVP there is one allocation round, so a single column keeps it simple.
Moving it later is a migration, not a redesign.

**Why assignee_id is nullable.** Tasks exist before they are allocated, and a
group may deliberately leave one unassigned. `ON DELETE SET NULL` means removing
a member returns their tasks to the pool rather than deleting the work.

**Why the weight check is in the database.** The Pydantic schema validates it too,
but the constraint belongs with the data — a bad weight silently corrupts every
future allocation, and that is worth catching at both layers.
