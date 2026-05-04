import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Authenticated users go straight to their dashboard
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    redirect(profile?.role === 'provider' ? '/provider/dashboard' : '/buyer/dashboard')
  }

  // Fetch categories for the category grid (public read RLS)
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .order('name')

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Navbar ─────────────────────────────────────── */}
      <header className="border-b sticky top-0 z-50 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-xl tracking-tight text-orange-600">Kaarigar</span>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-orange-50 via-white to-amber-50 py-20 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
              🇵🇰 Rawalpindi &amp; Islamabad
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Get Any Home Job Done — <span className="text-orange-600">Today</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Post a job, get competitive bids from nearby skilled workers, and hire the best one. Fast, transparent, and stress-free.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto text-base px-8">
                  Post a Job — It&apos;s Free
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 w-full sm:w-auto text-base px-8">
                  Join as a Provider
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">No upfront cost. Pay only when the job is done.</p>
          </div>
        </section>

        {/* ── How It Works ───────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              {[
                { step: '1', icon: '📋', title: 'Post a Job', description: 'Describe what you need, set urgency, and pin your location. Takes under 2 minutes.' },
                { step: '2', icon: '🏷️', title: 'Receive Bids', description: 'Nearby verified providers send competitive bids with their price and estimated arrival time.' },
                { step: '3', icon: '✅', title: 'Pick Your Pro', description: 'Compare profiles, ratings, and prices. Accept the best bid and track progress in real time.' },
              ].map(({ step, icon, title, description }) => (
                <div key={step} className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 font-bold text-lg flex items-center justify-center">
                    {step}
                  </div>
                  <span className="text-3xl">{icon}</span>
                  <h3 className="font-semibold text-base">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Category Grid ──────────────────────────────── */}
        {categories && categories.length > 0 && (
          <section className="py-16 px-4 bg-gray-50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-2">Browse by Service</h2>
              <p className="text-center text-muted-foreground text-sm mb-8">
                From plumbing to painting — we have experts for every job.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <Link key={cat.id} href="/signup">
                    <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer">
                      <span className="text-3xl">{cat.icon}</span>
                      <span className="text-sm font-medium text-center">{cat.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── What We Offer ──────────────────────────────── */}
        <section className="py-12 px-4 bg-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">What We Offer</h2>
            <p className="text-muted-foreground leading-relaxed">
              From plumbing and electrical work to AC servicing and carpentry — Kaarigar connects you to verified specialists near you.
              Whatever the job, find skilled professionals ready to help.
            </p>
          </div>
        </section>

        {/* ── Trust Signals ──────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">Why Kaarigar?</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {[
                { icon: '⭐', stat: '4.8/5', label: 'Average provider rating' },
                { icon: '🔒', stat: 'Verified', label: 'Providers background-checked' },
                { icon: '⚡', stat: '<15 min', label: 'Average first bid time' },
                { icon: '🛡️', stat: '100%', label: 'Secure, transparent payments' },
              ].map(({ icon, stat, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-xl border">
                  <span className="text-3xl">{icon}</span>
                  <span className="text-xl font-bold text-orange-600">{stat}</span>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────── */}
        <section className="py-16 px-4 bg-orange-600 text-white text-center">
          <div className="max-w-xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold">Ready to get started?</h2>
            <p className="text-orange-100">Join hundreds of households already using Kaarigar.</p>
            <Link href="/signup">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-semibold mt-2">
                Create a Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t py-6 px-4 text-center text-xs text-muted-foreground">
        <p>© 2026 Kaarigar. Built for Rawalpindi &amp; Islamabad.</p>
      </footer>
    </div>
  )
}
