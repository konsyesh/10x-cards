-- Migration: Add status column to generations and disable RLS for MVP development
-- Purpose: (1) Track generation session states, (2) Allow development without RLS constraints
-- Created: 2025-10-24
-- Rationale: The generations table was missing 'status' column. RLS policies require JWT auth middleware (not yet implemented).
-- Note: RLS should be re-enabled in production with proper auth middleware.

-- =============================================================================
-- 1. Add status column to generations table
-- =============================================================================

alter table generations
add column status varchar not null default 'pending'
check (status in ('pending', 'completed', 'failed'));

-- Create an index on status for efficient filtering
create index generations_status_idx on generations(status);

-- Add comment to document the column
comment on column generations.status is 'Status of the generation session: pending (in progress), completed (finished successfully), failed (encountered an error)';
