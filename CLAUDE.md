# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Push Supabase migrations (when schema changes)
supabase db push

# Seed categories table
supabase db reset
```

## Architecture

This is a **two-sided marketplace** (buyer/provider) built with Next.js App Router and Supabase.

### Role-Based Route Groups
- `app/(buyer)/` — Protected buyer routes, accessible only to users with `role: 'buyer'`
- `app/(provider)/` — Protected provider routes, accessible only to users with `role: 'provider'`
- Role protection is enforced in `middleware.ts` via database profile lookup

### Authentication Flow
- Email/password auth via Supabase
- Role selection happens at signup (`user_metadata.role`)
- `handle_new_user()` trigger automatically creates a `profiles` row on signup
- Provider users must complete `app/provider/profile/setup` before accessing the dashboard

### Database Architecture

**Core Tables:**
- `profiles` — Base user profile (id, role, name, phone, avatar_url)
- `provider_profiles` — Extended provider data (skills, service_radius_km, lat/lng, ratings)
- `jobs` — Job listings with lat/lng for PostGIS proximity queries
- `bids` — Provider bids (one per provider per job, enforced by unique constraint)
- `messages` — Chat messages between buyer and accepted provider
- `reviews` — Reviews that trigger `update_provider_rating()` to update aggregated stats

**PostGIS & Location:**
- Jobs and providers have flat `lat`/`lng` columns
- `ST_MakePoint(lng, lat)` is used for spatial queries
- `get_nearby_jobs()` RPC fetches open jobs within radius using `ST_DWithin`
- Client-side proximity filtering in `RealtimeJobFeed` for instant feedback

### Row Level Security (RLS)
All tables have RLS enabled. Key patterns:
- Jobs: Buyers see own jobs; providers see jobs they have bids on; everyone sees open jobs
- Bids: Providers see own bids; buyers see all bids on their jobs
- Messages: Only buyer and accepted provider can read/send
- Uses `auth_user_owns_bid()` helper function to avoid circular RLS recursion

### Realtime Features
- Messages table is published to `supabase_realtime`
- `RealtimeJobFeed` component subscribes to INSERT/UPDATE on jobs table
- Bid notification components (`bid-notifier.tsx`, `buyer-bid-notifier.tsx`) subscribe to bids table

### Server Actions
Located in `app/actions/`:
- `accept-bid.ts` — Calls `accept_bid()` RPC to atomically accept bid, reject others, update job status
- `job-lifecycle.ts` — Job status transitions (cancel, start, complete)
- `submit-review.ts` — Inserts review, triggers rating recalculation via trigger

All server actions:
1. Get user via `supabase.auth.getUser()`
2. Authorize via database checks (e.g., `buyer_id === user.id`)
3. Perform operation
4. Call `revalidatePath()` for cache invalidation

### UI Components
- `components/ui/` — shadcn/ui components (Button, Card, Input, etc.)
- `components/shared/` — Shared components (Nav, RealtimeJobFeed, bid notifiers)
- Styling: Tailwind CSS with `@/*` path alias for clean imports

### Supabase Client Pattern
- `lib/supabase/client.ts` — Browser client (uses `@supabase/ssr` createBrowserClient)
- `lib/supabase/server.ts` — Server client (uses cookies for auth, safe for RSCs)
- Import based on context: server components/actions use server client, client components use browser client

### Type Definitions
All database types defined in `lib/supabase/types.ts` and used throughout the app for type safety.

## Common Patterns

**Job Status Flow:** `open` → (bid accepted) → `accepted` → (provider starts) → `in_progress` → (provider marks complete) → `completed`

**Bid Flow:** `pending` → `accepted` or `rejected`. One bid accepted triggers `accept_bid()` RPC which rejects all others.

**Provider Onboarding:** Signup → profile setup (skills, location, radius) → dashboard shows nearby jobs via `get_nearby_jobs()` RPC
