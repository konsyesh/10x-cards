-- Migration: Re-enable RLS on application tables
-- Purpose: Reverse 20251025082449_disable_rls.sql and restore RLS
-- Created: 2025-11-17
-- Affected tables: generations, generation_error_logs, flashcards, collections
-- Notes: Policies were created in 20251021143000_create_core_schema.sql and remain intact;
--        this migration only re-enables RLS on the tables.

-- =============================================================================
-- 1. Re-enable RLS on tables previously disabled for MVP
-- =============================================================================

-- Re-enable RLS on generations table
alter table if exists generations enable row level security;

-- Re-enable RLS on generation_error_logs table
alter table if exists generation_error_logs enable row level security;

-- Re-enable RLS on flashcards table
alter table if exists flashcards enable row level security;

-- Re-enable RLS on collections table
alter table if exists collections enable row level security;

