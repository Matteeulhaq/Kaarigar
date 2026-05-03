-- ============================================================
-- Migration 003: Database functions and triggers
-- ============================================================

-- ── auth_user_owns_bid ──────────────────────────────────────
-- Security-definer helper used in RLS policies.
-- Returns true if the calling user has a bid with the given ID.
-- Runs bypassing RLS (security definer) to prevent circular policy recursion.
create or replace function auth_user_owns_bid(bid_id uuid)
returns boolean
language sql
security definer stable
as $$
  select exists(select 1 from bids where id = bid_id and provider_id = auth.uid())
$$;

-- ── accept_bid ───────────────────────────────────────────────
-- Atomically accepts one bid, rejects all others for the same job,
-- and updates the job status to 'accepted'.
create or replace function accept_bid(p_bid_id uuid, p_job_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Reject all other pending bids for this job
  update bids
  set    status = 'rejected'
  where  job_id  = p_job_id
    and  id     != p_bid_id
    and  status  = 'pending';

  -- Accept the chosen bid
  update bids
  set    status = 'accepted'
  where  id = p_bid_id;

  -- Update the job
  update jobs
  set    status          = 'accepted',
         accepted_bid_id = p_bid_id
  where  id = p_job_id;
end;
$$;

-- ── update_provider_rating ───────────────────────────────────
-- Recalculates a provider's avg_rating and completed_jobs count
-- whenever a new review is inserted.
create or replace function update_provider_rating()
returns trigger
language plpgsql
security definer
as $$
begin
  update provider_profiles
  set
    avg_rating     = (
      select coalesce(avg(rating), 0)
      from   reviews
      where  reviewee_id = new.reviewee_id
    ),
    completed_jobs = (
      select count(*)
      from   reviews
      where  reviewee_id = new.reviewee_id
    )
  where user_id = new.reviewee_id;

  return new;
end;
$$;

create trigger trg_update_provider_rating
after insert on reviews
for each row
execute function update_provider_rating();

-- ── auto-create profile on signup ────────────────────────────
-- When a new auth.users row is created (via OAuth or email), create
-- a matching profiles row.  The role is passed via user_metadata
-- which is set during sign-up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, role, name, avatar_url)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'buyer'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row
execute function handle_new_user();
