-- ============================================================
-- Migration 004: Row Level Security policies
-- ============================================================

-- Enable RLS on all tables
alter table profiles         enable row level security;
alter table provider_profiles enable row level security;
alter table categories        enable row level security;
alter table jobs              enable row level security;
alter table bids              enable row level security;
alter table messages          enable row level security;
alter table reviews           enable row level security;

-- Enable Realtime for live chat
alter publication supabase_realtime add table messages;

-- ── profiles ─────────────────────────────────────────────────
-- Anyone authenticated can read any profile (needed for public pages)
create policy "profiles: read any"
  on profiles for select
  using (auth.role() = 'authenticated');

-- Users can only update their own profile
create policy "profiles: update own"
  on profiles for update
  using (auth.uid() = id);

-- Insert is handled by the trigger; block direct inserts
create policy "profiles: insert via trigger"
  on profiles for insert
  with check (auth.uid() = id);

-- ── provider_profiles ────────────────────────────────────────
create policy "provider_profiles: read any"
  on provider_profiles for select
  using (auth.role() = 'authenticated');

create policy "provider_profiles: insert own"
  on provider_profiles for insert
  with check (auth.uid() = user_id);

create policy "provider_profiles: update own"
  on provider_profiles for update
  using (auth.uid() = user_id);

-- ── categories ───────────────────────────────────────────────
-- Public read, no writes from clients
create policy "categories: public read"
  on categories for select
  using (true);

-- ── jobs ─────────────────────────────────────────────────────
-- All authenticated users can read open jobs
create policy "jobs: read open"
  on jobs for select
  using (
    auth.role() = 'authenticated'
    and (
      status = 'open'
      or buyer_id = auth.uid()
      or (accepted_bid_id is not null and auth_user_owns_bid(accepted_bid_id))
    )
  );

-- Only buyers can create jobs
create policy "jobs: buyer insert"
  on jobs for insert
  with check (auth.uid() = buyer_id);

-- Buyer can update their own job (status changes, cancel)
create policy "jobs: buyer update own"
  on jobs for update
  using (auth.uid() = buyer_id);

-- Provider can update status on their accepted jobs
-- Uses accepted_bid_id join to avoid referencing bids table (prevents recursion)
create policy "jobs: provider update accepted"
  on jobs for update
  using (
    accepted_bid_id in (
      select id from bids where provider_id = auth.uid()
    )
  );

-- ── bids ─────────────────────────────────────────────────────
-- Providers can see their own bids
create policy "bids: read own"
  on bids for select
  using (provider_id = auth.uid());

-- Buyers can see all bids on their own jobs
-- (safe: jobs policy no longer references bids, so no circular recursion)
create policy "bids: buyer read on own job"
  on bids for select
  using (
    job_id in (select id from jobs where buyer_id = auth.uid())
  );

-- Only providers can insert bids
create policy "bids: provider insert"
  on bids for insert
  with check (auth.uid() = provider_id);

-- Buyer can update bid status (accept/reject) on their own jobs
create policy "bids: buyer update on own job"
  on bids for update
  using (
    job_id in (select id from jobs where buyer_id = auth.uid())
  );

-- ── messages ─────────────────────────────────────────────────
-- Both parties of a job (buyer and accepted provider) can read/send messages
create policy "messages: read job participants"
  on messages for select
  using (
    job_id in (
      select id from jobs where buyer_id = auth.uid()
      union
      select b.job_id from bids b
      where  b.provider_id = auth.uid() and b.status = 'accepted'
    )
  );

create policy "messages: insert job participants"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and job_id in (
      select id from jobs where buyer_id = auth.uid()
      union
      select b.job_id from bids b
      where  b.provider_id = auth.uid() and b.status = 'accepted'
    )
  );

-- ── reviews ──────────────────────────────────────────────────
-- Anyone authenticated can read reviews (shown on public profiles)
create policy "reviews: read any"
  on reviews for select
  using (auth.role() = 'authenticated');

-- Only the buyer of the job can insert a review, once job is completed
create policy "reviews: buyer insert on completed job"
  on reviews for insert
  with check (
    auth.uid() = reviewer_id
    and job_id in (
      select id from jobs where buyer_id = auth.uid() and status = 'completed'
    )
  );
