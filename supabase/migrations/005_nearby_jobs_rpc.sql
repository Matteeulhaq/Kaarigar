-- ============================================================
-- Migration 005: get_nearby_jobs RPC
-- Called from the provider dashboard to fetch open jobs
-- within a given radius of the provider's location.
-- ============================================================

create or replace function get_nearby_jobs(
  provider_lat double precision,
  provider_lng double precision,
  radius_m     double precision default 10000
)
returns table (
  id              uuid,
  buyer_id        uuid,
  category_id     uuid,
  title           text,
  description     text,
  lat             double precision,
  lng             double precision,
  address         text,
  urgency         urgency_level,
  photo_urls      text[],
  status          job_status,
  accepted_bid_id uuid,
  payment_status  payment_status,
  created_at      timestamptz,
  -- joined category columns
  category        json
)
language sql
stable
security definer
as $$
  select
    j.id,
    j.buyer_id,
    j.category_id,
    j.title,
    j.description,
    j.lat,
    j.lng,
    j.address,
    j.urgency,
    j.photo_urls,
    j.status,
    j.accepted_bid_id,
    j.payment_status,
    j.created_at,
    json_build_object('id', c.id, 'name', c.name, 'icon', c.icon) as category
  from jobs j
  join categories c on c.id = j.category_id
  where
    j.status = 'open'
    and ST_DWithin(
      ST_MakePoint(j.lng, j.lat)::geography,
      ST_MakePoint(provider_lng, provider_lat)::geography,
      radius_m
    )
  order by j.created_at desc
  limit 50;
$$;
