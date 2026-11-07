-- Equis database schema (PostgreSQL)
-- Mirrors backend/app/models.py. SQLAlchemy creates these tables on startup;
-- this file documents the schema and seeds a local database if you prefer SQL.

CREATE TABLE groups (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE members (
    id        SERIAL PRIMARY KEY,
    group_id  INTEGER      NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name      VARCHAR(120) NOT NULL,
    email     VARCHAR(255),
    -- Relative share of work this member can take; 1.0 is a normal load.
    capacity  REAL         NOT NULL DEFAULT 1.0 CHECK (capacity >= 0 AND capacity <= 2)
);

CREATE TABLE tasks (
    id           SERIAL PRIMARY KEY,
    group_id     INTEGER       NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    title        VARCHAR(200)  NOT NULL,
    description  VARCHAR(2000),
    -- Effort estimate, 1 (trivial) to 10 (a sprint's work).
    weight       INTEGER       NOT NULL CHECK (weight BETWEEN 1 AND 10),
    assignee_id  INTEGER       REFERENCES members(id) ON DELETE SET NULL
);

CREATE INDEX idx_members_group ON members(group_id);
CREATE INDEX idx_tasks_group   ON tasks(group_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
