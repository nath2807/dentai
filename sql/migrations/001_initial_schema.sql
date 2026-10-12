-- ==============================================================================
-- DENTARITH CLINICAL COPILOT — POSTGRESQL PRODUCTION SCHEMA
-- Migration: 001_initial_schema.sql
-- Description: Core tables for multi-tenant users, clinical cases, and audit logs.
-- ==============================================================================

-- 1. USERS & CLINICIAN ACCOUNTS
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL DEFAULT 'clinician',
  license_number VARCHAR(128),
  organization VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. CLINICAL CASES
-- Stores structured clinical case records with explicit user isolation.
-- Strictly excludes raw radiograph binary content / dataUrl.
CREATE TABLE IF NOT EXISTS clinical_cases (
  id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  analysis_status VARCHAR(32) NOT NULL DEFAULT 'current',
  review_status VARCHAR(32) NOT NULL DEFAULT 'pending',
  case_data JSONB NOT NULL,
  form_values JSONB,
  analysis JSONB,
  review JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (id, user_id)
);

-- Optimize queries by user, sync cursor, and soft-delete state
CREATE INDEX IF NOT EXISTS idx_cases_user_synced ON clinical_cases(user_id, synced_at);
CREATE INDEX IF NOT EXISTS idx_cases_user_deleted ON clinical_cases(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_cases_id ON clinical_cases(id);

-- 3. AUDIT EVENTS
-- Append-only audit trail capturing clinical operations, migrations, and reviews.
CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(64) PRIMARY KEY,
  case_id VARCHAR(64),
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  action VARCHAR(32) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER,
  ip_hash VARCHAR(64),
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_user_timestamp ON audit_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id);
