-- Migration: Create core schema for 10x-Cards
-- Purpose: Set up initial database structure with tables, indexes, triggers, and RLS policies
-- Created: 2025-10-21
-- Affected tables: collections, generations, generation_error_logs, flashcards
-- Notes: Enables RLS for all custom tables; uses Supabase Auth for user management

-- =============================================================================
-- 1. Helper function for updated_at timestamp
-- =============================================================================

-- Create a reusable function to automatically update the updated_at column
-- This function should be called by a trigger on any table that needs timestamp tracking
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =============================================================================
-- 2. Collections table
-- =============================================================================

-- Table to store flashcard collections per user
-- Allows users to organize flashcards into separate decks/sets
create table collections (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(100) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on collections table
alter table collections enable row level security;

-- Create indexes for common access patterns
create index collections_user_id_idx on collections(user_id);

-- Create trigger to automatically update updated_at column
create trigger collections_set_updated_at
  before update on collections
  for each row
  execute function set_updated_at();

-- RLS Policies for collections
-- Policy: authenticated users can select only their own collections
create policy "collections_select_own" on collections
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: authenticated users can insert collections for themselves
create policy "collections_insert_own" on collections
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: authenticated users can update their own collections
create policy "collections_update_own" on collections
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: authenticated users can delete their own collections
create policy "collections_delete_own" on collections
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 3. Generations table
-- =============================================================================

-- Table to track AI-generated flashcard batches and metrics
-- Records metadata about generation sessions for analytics and AI model performance tracking
create table generations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model varchar not null,
  generated_count integer not null,
  accepted_unedited_count integer,
  accepted_edited_count integer,
  source_text_hash varchar not null,
  source_text_length integer not null check (source_text_length between 1000 and 50000),
  generation_duration_ms integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on generations table
alter table generations enable row level security;

-- Create indexes for common access patterns
create index generations_user_id_idx on generations(user_id);

-- Create trigger to automatically update updated_at column
create trigger generations_set_updated_at
  before update on generations
  for each row
  execute function set_updated_at();

-- RLS Policies for generations
-- Policy: authenticated users can select only their own generation records
create policy "generations_select_own" on generations
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: authenticated users can insert generation records
create policy "generations_insert_own" on generations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: authenticated users can update their own generation records
create policy "generations_update_own" on generations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: authenticated users can delete their own generation records
create policy "generations_delete_own" on generations
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 4. Generation Error Logs table
-- =============================================================================

-- Table to store detailed error information from failed AI generation attempts
-- Used for diagnostics, monitoring, and KPI tracking
create table generation_error_logs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  model varchar not null,
  source_text_hash varchar not null,
  source_text_length integer not null check (source_text_length between 1000 and 50000),
  error_code varchar(100) not null,
  error_message text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS on generation_error_logs table
alter table generation_error_logs enable row level security;

-- Create indexes for common access patterns
create index generation_error_logs_user_id_idx on generation_error_logs(user_id);

-- RLS Policies for generation_error_logs
-- Policy: authenticated users can select only their own error logs
create policy "generation_error_logs_select_own" on generation_error_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: authenticated users can insert error logs
create policy "generation_error_logs_insert_own" on generation_error_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: authenticated users can view/delete their own error logs
create policy "generation_error_logs_delete_own" on generation_error_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =============================================================================
-- 5. Flashcards table
-- =============================================================================

-- Main table storing individual flashcards
-- Each flashcard has front/back content with optional reference to generation or collection
create table flashcards (
  id bigserial primary key,
  front text not null check (char_length(front) between 1 and 200),
  back text not null check (char_length(back) between 1 and 500),
  source varchar not null check (source in ('ai-full', 'ai-edited', 'manual')),
  user_id uuid not null references auth.users(id) on delete cascade,
  collection_id bigint references collections(id) on delete set null,
  generation_id bigint references generations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on flashcards table
alter table flashcards enable row level security;

-- Create indexes for common access patterns
create index flashcards_user_id_idx on flashcards(user_id);
create index flashcards_generation_id_idx on flashcards(generation_id);

-- Create indexes for search functionality (case-insensitive)
create index flashcards_search_front_idx on flashcards(lower(front));
create index flashcards_search_back_idx on flashcards(lower(back));

-- Create trigger to automatically update updated_at column
create trigger flashcards_set_updated_at
  before update on flashcards
  for each row
  execute function set_updated_at();

-- RLS Policies for flashcards
-- Policy: authenticated users can select only their own flashcards
create policy "flashcards_select_own" on flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: authenticated users can insert flashcards for themselves
create policy "flashcards_insert_own" on flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: authenticated users can update their own flashcards
create policy "flashcards_update_own" on flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: authenticated users can delete their own flashcards
create policy "flashcards_delete_own" on flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);
