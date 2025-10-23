-- Migration: Disable RLS policies for flashcards, generations, and generation_error_logs
-- Purpose: Remove all row-level security policies from the specified tables
-- Created: 2025-10-23

-- =============================================================================
-- 1. Drop policies from collections table
-- =============================================================================

drop policy if exists "collections_select_own" on collections;
drop policy if exists "collections_insert_own" on collections;
drop policy if exists "collections_update_own" on collections;
drop policy if exists "collections_delete_own" on collections;

-- =============================================================================
-- 2. Drop policies from flashcards table
-- =============================================================================

drop policy if exists "flashcards_select_own" on flashcards;
drop policy if exists "flashcards_insert_own" on flashcards;
drop policy if exists "flashcards_update_own" on flashcards;
drop policy if exists "flashcards_delete_own" on flashcards;

-- =============================================================================
-- 3. Drop policies from generations table
-- =============================================================================

drop policy if exists "generations_select_own" on generations;
drop policy if exists "generations_insert_own" on generations;
drop policy if exists "generations_update_own" on generations;
drop policy if exists "generations_delete_own" on generations;

-- =============================================================================
-- 4. Drop policies from generation_error_logs table
-- =============================================================================

drop policy if exists "generation_error_logs_select_own" on generation_error_logs;
drop policy if exists "generation_error_logs_insert_own" on generation_error_logs;
drop policy if exists "generation_error_logs_delete_own" on generation_error_logs;
