-- ============================================================
-- Migration 001: Enable extensions
-- ============================================================

-- PostGIS for proximity/location queries
create extension if not exists postgis;

-- pgcrypto for gen_random_uuid (available by default in Supabase, but explicit is safe)
create extension if not exists pgcrypto;
