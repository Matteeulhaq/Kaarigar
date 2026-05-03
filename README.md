# Kaarigar MVP

Two-sided on-demand marketplace for skilled workers in Rawalpindi/Islamabad, Pakistan.

**Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL + PostGIS) + Tailwind CSS + shadcn/ui

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier OK)
- `.env` file with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  ```

### Setup

```bash
# Install deps
npm install

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — unauthenticated users see the landing page.

## Troubleshooting

### Email Rate Limit Exceeded
**Cause:** Too many signup attempts with the same email within ~1 hour (Supabase default).

**Solutions:**
1. **Use a different email** — e.g., `test2@example.com`, `test3@example.com`, etc.
2. **Disable rate limiting for development:**
   - Supabase Dashboard → Authentication → Providers → Email
   - Set **"Rate limit per email"** to `0` (unlimited)
3. **Wait 1 hour** for automatic reset
4. **Incognito mode** — May bypass IP-based limits

### Database Migrations Not Running
```bash
# Push migrations to Supabase
supabase db push
```

### Realtime Not Working
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Check Supabase project → Realtime → Tables → Enable your tables

## Project Structure

```
app/
  page.tsx              ← Landing page (unauthenticated)
  (buyer)/              ← Buyer routes (protected)
  (provider)/           ← Provider routes (protected)
  actions/              ← Server actions
  messages/             ← In-app chat
  
components/
  shared/               ← Nav, Realtime components
  ui/                   ← shadcn/ui components
  
lib/
  supabase/             ← Supabase helpers & types
  
supabase/
  migrations/           ← SQL migrations (001-005)
```

## Key Features

✅ Email/password auth with role selection (buyer/provider)
✅ Job posting (multi-step form with geolocation)
✅ Proximity-based job feed (PostGIS ST_DWithin)
✅ Real-time bidding & notifications (Supabase Realtime)
✅ In-app messaging
✅ Review system & public provider profiles
✅ Role-based dashboards with job history & earnings
✅ Responsive design with mobile-first approach
✅ Loading skeletons & error boundaries

## Testing Checklist

- [ ] Sign up as buyer (email/password)
- [ ] Sign up as provider (email/password + skills setup)
- [ ] Post a job (buyer)
- [ ] Submit bid (provider)
- [ ] Accept bid (buyer)
- [ ] Start job → Mark complete (provider)
- [ ] Submit review (buyer)
- [ ] View public provider profile
- [ ] Send/receive messages (both)
- [ ] Check dashboard history

## Learn More

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
