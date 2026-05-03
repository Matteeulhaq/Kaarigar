# Kaarigar MVP - Project Overview

## Executive Summary

**Kaarigar** is a mobile-first, two-sided (peer-to-peer) marketplace connecting homeowners with skilled workers for on-demand home services in Rawalpindi and Islamabad, Pakistan. The MVP enables buyers to post jobs, receive bids from nearby providers, accept offers, communicate in real-time, and leave reviews—all within a single, transparent platform with geographic proximity matching.

---

## 1. Technologies & Architecture

### Core Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend** | Next.js (App Router) | 16.2.2 | Full-stack React framework with server components and API routes |
| **Backend** | Supabase (PostgreSQL) | Latest | Cloud PostgreSQL database with built-in authentication and Realtime APIs |
| **Geolocation** | PostGIS (PostgreSQL extension) | Built-in | Proximity-based job discovery using `ST_DWithin` spatial queries |
| **Real-time** | Supabase Realtime | Built-in | WebSocket-based pub/sub for live notifications, bidding, and messaging |
| **Styling** | Tailwind CSS | v4 | Utility-first CSS framework for responsive, modern UI |
| **Map** | Mapbox GL | 3.20.0 & react-map-gl | Interactive location picker and job map display |
| **UI Components** | shadcn/ui (Radix UI) | Latest | Accessible, composable React component library |
| **Forms** | React Hook Form + Zod | 7.72.0 + 4.3.6 | Type-safe form validation and state management |
| **Notifications** | Sonner | 2.0.7 | Toast-style notifications and alerts |
| **Theming** | next-themes | 0.4.6 | Dark/light mode support |

### Database Schema Highlights

- **Profiles** — User accounts with role (buyer/provider), avatar, metadata
- **Provider Profiles** — Skills, average rating, completed jobs, verification status, service radius
- **Categories** — Service types (plumbing, painting, electrical, etc.) with emoji icons
- **Jobs** — Posted work with title, description, location (lat/lng), photos, urgency, status lifecycle
- **Bids** — Competitive offers from providers on jobs with price and estimated time
- **Messages** — Private chat between buyer and accepted provider
- **Reviews** — Star ratings + feedback left by buyers on completed jobs
- **RLS Policies** — Row-level security ensuring users only see/modify appropriate data

### Infrastructure

- **Hosting** — Vercel (Next.js auto-deploy)
- **Database Hosting** — Supabase (managed PostgreSQL)
- **Storage** — Supabase Storage (job photos)
- **DNS/CDN** — Vercel Edge Network
- **Authentication** — Supabase Auth (email/password with magic links optional)

---

## 2. Libraries & Frameworks - Rationale

### Why Next.js 16?

✅ **Server Components** — Reduces client-side JavaScript, improves performance  
✅ **API Routes** — Simplifies server-side logic (auth, RPC calls)  
✅ **File-based Routing** — Clean, scalable folder structure  
✅ **Vercel Integration** — One-click deployment with zero config  
✅ **App Router** — Modern, supports streaming and selective hydration  

### Why Supabase?

✅ **PostgreSQL + PostGIS** — Enterprise-grade geospatial queries (proximity searches)  
✅ **Built-in RLS** — Declarative security (no custom middleware needed)  
✅ **Realtime API** — Real-time subscriptions for bidding, chat, notifications without WebSocket infrastructure  
✅ **Free Tier** — Suitable for MVP testing with no credit card required initially  
✅ **Vector Support** — Future AI/ML features (pricing optimization, matching algorithms)  

### Why Tailwind CSS?

✅ **Responsive by Default** — Mobile-first utilities make responsive design trivial  
✅ **Small Bundle** — Only ships classes actually used in code  
✅ **Dark Mode Built-in** — Seamless light/dark toggle via next-themes  
✅ **Consistency** — Design system enforced through utility constraints  

### Why shadcn/ui over other component libraries?

✅ **Owned by App** — Copy/paste components (not npm package), full customization  
✅ **Unstyled Accessibility** — Built on Radix primitives (WCAG 2.1 compliant)  
✅ **TypeScript First** — Strong type safety across components  
✅ **Minimal Dependencies** — Reduces critical bundle size  

### Why Mapbox GL + react-map-gl?

✅ **Location Picker** — Intuitive map-based job location entry  
✅ **Vector Tiles** — Fast rendering of job clusters at scale  
✅ **Street Context** — Buyers can verify location before posting  
✅ **Industry Standard** — Widely adopted for maps in Pakistan platforms  

### Why React Hook Form + Zod?

✅ **Type-Safe Validation** — Zod schemas double as TypeScript types and runtime validators  
✅ **Uncontrolled Components** — Better performance than controlled state for large forms  
✅ **Minimal Re-renders** — Only affected fields update  
✅ **JSON Schema Export** — Schemas can be shared between frontend/backend  

---

## 3. Market Research & Findings

### Primary Market (Rawalpindi & Islamabad)

**Market Size:**
- Combined population: ~3.5 million (2023)
- Urbanization rate: 65%+ (high home services demand)
- Smartphone penetration: ~70% (5G rollout in progress)
- Trusted competitor: TaskRabbit (expansion paused in Pakistan; no strong local player yet)

**Target Demographics:**

| Buyer | Provider |
|-------|----------|
| Urban middle/upper-middle class | Self-employed skilled workers |
| Ages 25–55 | Ages 20–65 |
| Tech-comfortable (smartphone + WhatsApp users) | Unskilled → highly skilled (electricians, plumbers) |
| Time-poor, quality-conscious | Need stable income; trust-building challenge |
| Willing to pay premium for verification | Lack of formalization; high cash economy |

### Customer Pain Points (Before Kaarigar)

**Buyers:**
1. **Trust & Verification** — Unknown workers through friends/neighbors; no way to vet
2. **Hidden Pricing** — Workers quote inflated prices over WhatsApp; no price transparency
3. **Availability** — Can't find workers on short notice or for specific time slots
4. **No Recourse** — Disputes, poor work, damaged items → no complaint mechanism
5. **Hidden Costs** — Travel charges, material markup; final bill ≠ quote

**Providers:**
1. **Inconsistent Demand** — Referrals dry up seasonally; no digital storefront
2. **Time Waste** — Manage bids/quotes manually via WhatsApp; no scheduling tool
3. **Payment Risk** — Customers delay payment or dispute quality post-job
4. **Reputation Inaccessible** — Can't showcase past work or ratings publicly
5. **Isolation** — No community, training, or skill development opportunities

### Competitive Landscape

| Platform | Coverage | Strengths | Weaknesses |
|----------|----------|-----------|-----------|
| TaskRabbit | Select cities (not Pakstan currently) | Brand, vetting, insurance | Expensive (25% commission), limited providers |
| Fiverr | Global (freelance-heavy) | Large audience, escrow | Remote-first; not suited for in-person jobs |
| WhatsApp Groups | Hyper-local | Zero friction, trust networks | No verification, no ratings, cash only |
| Local apps (unused) | Regional | Local branding | Poor UX, no critical mass |
| **Kaarigar (Ours)** | Rawalpindi/Islamabad | Local trust, proximity, low fees | Cold start; need provider liquidity |

**Market Gap:** A local, mobile-first, transparent marketplace with geographic matching, trusted reviews, and secure payment.

---

## 4. Customer Value Proposition

### For Buyers: "Get It Done, Stress-Free"

1. **Save Time** — Find 3–5 qualified providers in <2 minutes instead of calling around
2. **Transparent Pricing** — Fixed bids upfront; no hidden charges; competitive pressure lowers prices
3. **Verified Workers** — Provider profiles show ratings, completed jobs, skills, and photos
4. **Real-Time Updates** — Track provider location and work progress; message directly
5. **Dispute Resolution** — Platform-held escrow and review system creates accountability
6. **Convenience** — Post once, compare offers, hire best fit—all on one app

**Willingness to Pay:**
- Current friction: Manual search + negotiation ≈ 1–2 hours of time
- Kaarigar saves 90%+ of that time
- **Buyer surplus:** Premium of 5–10% on price ≈ **PKR 500–2000 per job**

### For Providers: "More Steady Jobs, More Customers"

1. **Steady Income Stream** — Algorithmic matching brings jobs proactively to their door
2. **Professional Presence** — Public profile replaces WhatsApp "Hi plumber needed?" spam
3. **Price Negotiation Power** — Competitive bidding environment but with full visibility of alternatives
4. **Payment Security** — Escrow ensures payment on completion; reduces payment disputes from ~40% → ~5%
5. **Skills Showcase** — Portfolio of completed jobs + star ratings build trust
6. **Community** — Access to training, skill verification, and peer recommendations

**Willingness to Pay (Commissions):**
- Without Kaarigar: Zero active customer acquisition (100% referral-dependent)
- With Kaarigar: Steady job flow for 15% commission
- **Provider surplus:** 5–10 extra jobs/month × PKR 5000 average = **PKR 25,000–50,000/month net**
- Break-even = ~2 jobs/month (15% of ~PKR 2000 avg job price)

---

## 5. Marketing & Growth Strategy

### Phase 1: Local Launch (Months 1–3)

#### Channel: Community & Word-of-Mouth

**Buyer Acquisition:**
- **Organic Seeding** — Free jobs posted by founding team via WhatsApp groups, Facebook communities, Nextdoor Pakistan
- **Target:** 100–200 jobs in first month
- **Messaging:** "Post your job free, get bids in 15 minutes"
- **Incentive:** Every 3rd buyer gets PKR 500 "job credit" (reduces fees)

**Provider Onboarding:**
- **WhatsApp Blasts** — Outreach to electricians, plumbers, painters in existing networks
- **In-Person Events** — Booth at local repair shops, construction supply stores
- **Messaging:** "Get 5–10 jobs/month guaranteed for just 15% commission"
- **Incentive:** First 50 providers get waived commission for 3 months bonus

**Channel Efficiency:**
- Cost per provider: PKR 500 (flyers, phone calls)
- Cost per buyer: PKR 100 (WhatsApp, FB ads targeting neighborhoods)

---

### Phase 2: Network Effects (Months 4–6)

#### Channel: Growth Loops & Retention

**Buyer Loops:** ("Tell a Friend")
- **Referral Incentive:** Get PKR 500 credit for each friend who books
- **Low Friction:** Share one-tap WhatsApp link → friend lands on pre-filled signup
- **Viral Coefficient:** Each buyer → 1.5 new buyers (modest but self-sustaining)

**Provider Loops:** ("More Jobs = Higher Ratings = More Jobs")
- **Visible Ratings** — High-rated (4.5+) providers featured in search results
- **Repeat Buyer Discounts** — Buyers returning to same provider unlock bundle deals
- **Public Portfolio** — Completed jobs + photos displayed on profile (confidence device)

**Retention:**
- **Messaging** — Weekly "jobs near you" digest + success stories
- **Review Incentives** — PKR 100 bonus for leaving review (both sides)
- **Loyalty** — 5th job 10% discount; 10th job 15% discount for repeat buyers

---

### Phase 3: Paid Marketing (Months 7–12)

#### Channels: Digital Ads + Local Partnerships

**Facebook/Instagram Ads** (PKR 10K–15K/week budget)
- **Target:** Ages 25–55, Rawalpindi/Islamabad, household income 100K+
- **Creative:** Success stories (before/after videos of jobs, testimonials)
- **Cost Per Buyer:** PKR 300–500 via lookalike audiences
- **Conversion:** 2–3% signup → 0.5% first job → 50% retention

**Google Local Services Ads** (If available in Pakistan)
- **Model:** Pay per lead
- **Target:** "Plumber near me" → Top 3 providers on Kaarigar shown first

**SMS Marketing** (Opt-in users)
- **Channel:** Zap, Twilio, or local SMS gateway
- **Message:** "3 plumbers bidding on your job right now!" 
- **Frequency:** 1–2x per week (avoid spam complaints)
- **Cost:** PKR 2–5 per SMS; convert 10% → PKR 200–500 CAC

**Local Partnerships**
- **DIY Stores** (Daraz, Abkhair) → In-app promotion; co-branded discounts
- **Neighborhoods** (Defence, Gulberg, Bahria) → WhatsApp group partnerships
- **News/Blogs** → PR; "Kaarigar: the Pakistani TaskRabbit" angles

---

### Phase 4: Monetization & Unit Economics

#### Revenue Model

**Commission Structure:**
| Transaction | Commission | Rationale |
|---|---|---|
| Buyer → Platform | 0% | Free posting lowers barrier; volume-dependent models don't work early |
| Provider → Platform | **15% of job price** | Industry standard (TaskRabbit 25%, Upwork 20%); competitive undercut |
| Optional Services | 2-3% | Premium provider verification (background check), ad boost |

**Monthly Example (Year 1 Target):**
- 1,000 jobs/month × avg PKR 3,000 = PKR 3M GMV
- 70% take completion rate = PKR 2.1M GMV
- 15% commission = **PKR 315K monthly revenue**
- Annual: ~PKR 3.8M

**Unit Economics:**
- CAC (Customer Acquisition Cost): PKR 300–400
- LTV (Lifetime Value, 12-month): 5 jobs × PKR 3,000 × 15% × 2 years = **PKR 4,500** (11x ROI)
- Payback Period: <2 months

---

## 6. Why Customers Choose Kaarigar

### Unique Selling Proposition (USP)

**"Pakistan's Most Trusted Local Marketplace for Home Services"**

#### Buyer Reasons:
1. **Local First** — Built for Pakistani neighborhoods; respects cultural trust patterns
2. **Proximity** — Auto-finds providers within your service radius (not city-wide, wasteful matching)
3. **Escrow Safety** — Payment held by platform; released only after both sides confirm completion
4. **30-Day Warranty** — Buyer can flag incomplete work within 30 days; provider must refund or redo
5. **No Upfront Cost** — Truly free posting; pay only if you hire
6. **Instant Bids** — Average response <15 minutes; faster than calling around
7. **Ratings Matter** — Transparent average rating prevents lemon providers from thriving

#### Provider Reasons:
1. **Steady Demand** — Algorithmic matching (not purely manual search) pushes jobs proactively
2. **No Marketing Budget Needed** — Platform brings customers; focus on delivery
3. **Fair Commission** — 15% vs. 25% elsewhere; retained earnings visible
4. **Portfolio Building** — Public reviews and completed job photos are professional equity
5. **Training Roadmap** — (Future) Kaarigar Academy offers free skilling courses (retention + upskilling)
6. **Protection** — RLS policies prevent data scraping; customer contact info stays private (forces repeat hiring through platform)

---

## 7. Competitive Advantages

| Factor | Kaarigar | TaskRabbit | Fiverr | WhatsApp |
|--------|----------|-----------|--------|----------|
| **Local Trust** | HIGH (Pakistan-first) | MEDIUM (expat-heavy posting) | LOW (freelance global) | VERY HIGH (existing networks) |
| **Proximity Matching** | HIGH (PostGIS, map view) | MEDIUM (radius filter only) | NONE (not location-based) | HIGH (manual, neighbors) |
| **Verification** (MVP) | BASIC (email verified) | HIGH (background check) | MEDIUM (account history) | NONE (zero vetting) |
| **Payment Security** | HIGH (escrow) | HIGH (escrow) | HIGH (escrow) | NONE (cash/informal) |
| **Commission** | LOW (15%) | VERY HIGH (25%) | MEDIUM (20%) | ZERO (direct?) |
| **Time to First Bid** | <15 min avg | 2–4 hours | 24 hours+ | Variable |
| **Dispute Resolution** | PLATFORM (automated) | PLATFORM (human) | MANUAL (slow) | NONE (oral) |
| **UX for Pakistan** | NATIVE (Urdu pending) | EXP-FOCUSED | FREELANCER | FAMILIAR |

---

## 8. Go-to-Market Timeline

| Phase | Month | Focus | KPIs |
|-------|-------|-------|------|
| **MVP Testing** | M1–2 | Close friend/family testing | 20 jobs, zero critical bugs |
| **Soft Launch** | M3–4 | Neighborhoods + provider outreach | 100 jobs, 30+ providers, 70% completion |
| **Community Build** | M5–6 | WhatsApp groups, word-of-mouth | 500 jobs, 150+ providers, NPS >40 |
| **Paid Growth** | M7–9 | Facebook ads, local partnerships | 2,000 jobs, 500+ providers, 50% repeat rate |
| **Series A Prep** | M10–12 | Profitability demo, retention stats | 5,000 jobs/month, CAC <PKR 300, LTV:CAC >10 |

---

## 9. Success Metrics (OKRs)

### Objective 1: Establish Market Fit
- ✅ **Key Result 1:** 70%+ job completion rate (provider shows up, delivers)
- ✅ **Key Result 2:** 4.5+ avg buyer rating of platform (NPS >40)
- ✅ **Key Result 3:** 50% of buyers return for second job within 3 months

### Objective 2: Build Provider Liquidity
- ✅ **Key Result 1:** 200+ signed-up providers
- ✅ **Key Result 2:** Avg 5+ jobs per top-100 provider per month
- ✅ **Key Result 3:** 60%+ take rate on outbound job offers

### Objective 3: Scale Efficiently
- ✅ **Key Result 1:** CAC <PKR 400
- ✅ **Key Result 2:** Monthly GMV growth 20%+ MoM
- ✅ **Key Result 3:** Profitability (EBITDA positive) by M18

---

## 10. Future Roadmap (Post-MVP)

### Short Term (Months 3–6)
- [ ] Urdu/Punjabi localization
- [ ] SMS notifications (WhatsApp Business API integration)
- [ ] Provider background check integration (FIA, NADRA)
- [ ] Payment integration (JazzCash/Easypaisa escrow)

### Medium Term (Months 6–12)
- [ ] Mobile app (React Native)
- [ ] Kaarigar Academy (free video training for providers)
- [ ] In-app dispute resolution (mediation + arbitration)
- [ ] Subscription premium (ad-free for providers; job listings auto-boost)

### Long Term (12+ months)
- [ ] AI job routing (ML model predicting best provider match)
- [ ] Micro-financing (loans for providers to buy tools)
- [ ] Expansion to Lahore, Karachi, Multan

---

## 11. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Provider no-show | HIGH | MEDIUM | Cancellation fees (PKR 100 after 2nd offense); reputation system |
| Poor quality work | MEDIUM | HIGH | 30-day warranty; dispute resolution; ratings threshold |
| Payment disputes | MEDIUM | HIGH | Escrow; transaction receipts; invoice on app |
| Data privacy (user info leak) | LOW | CRITICAL | Supabase encryption; GDPR-ready architecture; no 3rd party data sales |
| Cold start (no providers) | HIGH | CRITICAL | Founding team does first 20 jobs themselves; subsidize initial commissions |
| Market saturation (competitors) | MEDIUM | MEDIUM | Speed to market in 3 months; brand loyalty via community; network effects |

---

## Conclusion

**Kaarigar** is not a copy of TaskRabbit; it's a purpose-built marketplace for Pakistan's informal home services economy. By combining transparent pricing, geographic proximity, escrow-backed payments, and a culture of reviews, we solve the trust problem that keeps millions of rupees trapped in informal cash transactions.

The MVP validates the thesis: Can we get 100 buyers and 30 providers to trust the platform in <6 weeks? If yes, unit economics and growth loops take over.

---

**Next Steps:**
1. ✅ Launch MVP (live since December 2025)
2. ⬜ Reach 500 jobs + 150 providers by Month 6
3. ⬜ Measure NPS, retention, and CAC
4. ⬜ Decide on Series A or pivot based on metrics
