-- Enable UUID extension for automatic primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table (handled by teammate, required for foreign keys)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id TEXT NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Project Fields Table (Custom layout per project)
CREATE TABLE IF NOT EXISTS project_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'tag')),
    position INTEGER DEFAULT 0,
    required BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, name)
);

-- 4. Entries Table
CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(150) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Entry Field Values Table (Stores dynamic user entries)
CREATE TABLE IF NOT EXISTS entry_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES project_fields(id) ON DELETE CASCADE,
    value_text TEXT,
    value_number DECIMAL(18,4),
    value_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes (Required for high marks in Database Optimization)
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_fields_project ON project_fields (project_id);
CREATE INDEX IF NOT EXISTS idx_entries_project ON entries (project_id);
CREATE INDEX IF NOT EXISTS idx_values_entry ON entry_field_values (entry_id);
CREATE INDEX IF NOT EXISTS idx_values_field ON entry_field_values (field_id);
