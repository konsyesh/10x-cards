
-- =============================================================================
-- 1. Disable RLS on tables for MVP development
-- =============================================================================

-- Disable RLS on generations table
alter table generations disable row level security;

-- Disable RLS on generation_error_logs table
alter table generation_error_logs disable row level security;

-- Disable RLS on flashcards table
alter table flashcards disable row level security;

-- Disable RLS on collections table
alter table collections disable row level security;
