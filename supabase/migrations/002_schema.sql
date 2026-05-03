-- ============================================================
-- Migration 002: Core schema
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────
create type user_role      as enum ('buyer', 'provider');
create type job_status     as enum ('open', 'accepted', 'in_progress', 'completed', 'cancelled');
create type bid_status     as enum ('pending', 'accepted', 'rejected');
create type urgency_level  as enum ('low', 'medium', 'high');
create type payment_status as enum ('unpaid', 'paid');

-- ── profiles ─────────────────────────────────────────────────
-- One row per auth.users entry; role is set at sign-up.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null,
  name       text,
  phone      text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ── provider_profiles ────────────────────────────────────────
-- Extended info for provider accounts.
create table provider_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references profiles(id) on delete cascade,
  skills           text[]       not null default '{}',
  bio              text,
  service_radius_km numeric(5,2) not null default 10,
  -- Flat lat/lng columns for easy client-side use;
  -- a generated geography column is used for PostGIS queries.
  lat              double precision,
  lng              double precision,
  portfolio_urls   text[]        not null default '{}',
  avg_rating       numeric(3,2)  not null default 0,
  completed_jobs   integer       not null default 0,
  is_verified      boolean       not null default false,
  created_at       timestamptz   not null default now()
);

-- Spatial index on provider location
create index provider_profiles_location_idx
  on provider_profiles using gist (st_makepoint(lng, lat));

-- ── categories ───────────────────────────────────────────────
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  icon        text not null,          -- emoji or icon name
  description text
);

-- ── jobs ─────────────────────────────────────────────────────
create table jobs (
  id              uuid primary key default gen_random_uuid(),
  buyer_id        uuid not null references profiles(id) on delete cascade,
  category_id     uuid not null references categories(id),
  title           text not null,
  description     text,
  lat             double precision not null,
  lng             double precision not null,
  address         text,
  urgency         urgency_level   not null default 'medium',
  photo_urls      text[]          not null default '{}',
  status          job_status      not null default 'open',
  accepted_bid_id uuid,                         -- FK added after bids table
  payment_status  payment_status  not null default 'unpaid',
  created_at      timestamptz     not null default now()
);

-- Spatial index on job location
create index jobs_location_idx
  on jobs using gist (st_makepoint(lng, lat));

create index jobs_status_idx on jobs (status);
create index jobs_buyer_idx  on jobs (buyer_id);

-- ── bids ─────────────────────────────────────────────────────
create table bids (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid        not null references jobs(id) on delete cascade,
  provider_id uuid        not null references profiles(id) on delete cascade,
  price       numeric(10,2) not null check (price > 0),
  eta_minutes integer     not null check (eta_minutes > 0),
  message     text,
  status      bid_status  not null default 'pending',
  created_at  timestamptz not null default now(),
  -- One bid per provider per job
  unique (job_id, provider_id)
);

create index bids_job_idx      on bids (job_id);
create index bids_provider_idx on bids (provider_id);

-- Now that bids exists, add the FK on jobs
alter table jobs
  add constraint jobs_accepted_bid_fk
  foreign key (accepted_bid_id) references bids(id)
  on delete set null
  deferrable initially deferred;

-- ── messages ─────────────────────────────────────────────────
create table messages (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid        not null references jobs(id) on delete cascade,
  sender_id  uuid        not null references profiles(id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now()
);

create index messages_job_idx on messages (job_id, created_at);

-- ── reviews ──────────────────────────────────────────────────
create table reviews (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid    not null unique references jobs(id) on delete cascade,
  reviewer_id  uuid    not null references profiles(id) on delete cascade,
  reviewee_id  uuid    not null references profiles(id) on delete cascade,
  rating       integer not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now()
);

create index reviews_reviewee_idx on reviews (reviewee_id);
