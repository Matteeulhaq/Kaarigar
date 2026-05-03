import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BidNotifier from '@/components/shared/bid-notifier'
import { Separator } from '@/components/ui/separator'
import type { Job } from '@/lib/supabase/types'

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-700',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function ProviderDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if the provider has set up their profile yet
  const { data: providerProfile } = await supabase
    .from('provider_profiles')
    .select('id, lat, lng, service_radius_km')
    .eq('user_id', user.id)
    .single()

  if (!providerProfile) {
    // First time — nudge them to set up profile
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <p className="text-5xl">🔧</p>
        <h2 className="text-xl font-bold">Set up your profile first</h2>
        <p className="text-muted-foreground max-w-xs">
          Add your skills, service area, and location so we can show you nearby jobs.
        </p>
        <Link href="/provider/profile/setup">
          <Button className="bg-orange-600 hover:bg-orange-700">Set up profile</Button>
        </Link>
      </div>
    )
  }

  // Fetch nearby open jobs using provider lat/lng and radius
  let jobs: Job[] = []
  if (providerProfile.lat && providerProfile.lng) {
    const radiusMeters = (providerProfile.service_radius_km ?? 10) * 1000
    const { data } = await supabase.rpc('get_nearby_jobs', {
      provider_lat: providerProfile.lat,
      provider_lng: providerProfile.lng,
      radius_m: radiusMeters,
    })
    jobs = data ?? []
  } else {
    // Fallback: just show all open jobs if location not set
    const { data } = await supabase
      .from('jobs')
      .select('*, category:categories(name, icon)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20)
    jobs = data ?? []
  }

  // Also get jobs provider has already bid on
  const { data: myBids } = await supabase
    .from('bids')
    .select('job_id')
    .eq('provider_id', user.id)
  const bidJobIds = new Set((myBids ?? []).map((b: { job_id: string }) => b.job_id))

  // Fetch completed jobs where this provider was the accepted provider
  const { data: completedBids } = await supabase
    .from('bids')
    .select(`
      price,
      job:jobs!bids_job_id_fkey(
        id, title, status, created_at,
        category:categories(name, icon)
      )
    `)
    .eq('provider_id', user.id)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(20)

  type AcceptedBid = {
    price: number
    job: { id: string; title: string; status: string; created_at: string; category: { name: string; icon: string } | null } | null
  }
  const allAcceptedBids = (completedBids ?? []) as unknown as AcceptedBid[]
  const activeJobs = allAcceptedBids.filter((b) => b.job?.status === 'accepted' || b.job?.status === 'in_progress')
  const completedJobs = allAcceptedBids.filter((b) => b.job?.status === 'completed')
  const totalEarnings = completedJobs.reduce((sum, b) => sum + b.price, 0)

  return (
    <div className="space-y-6">
      {/* Invisible realtime listener — toasts when a bid is accepted */}
      <BidNotifier providerId={user.id} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Nearby Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Within {providerProfile.service_radius_km ?? 10} km of your location
          </p>
        </div>
        <Link href="/provider/profile/setup">
          <Button variant="outline" size="sm">Edit Profile</Button>
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="text-4xl mb-2">📭</p>
          <p>No open jobs in your area right now.</p>
          <p className="text-sm mt-1">Check back soon or expand your service radius.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(jobs as (Job & { category?: { name: string; icon: string } })[]).map((job) => {
            const alreadyBid = bidJobIds.has(job.id)
            return (
              <Link key={job.id} href={`/provider/jobs/${job.id}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${alreadyBid ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{job.title}</CardTitle>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap ${URGENCY_COLORS[job.urgency]}`}
                      >
                        {job.urgency}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{job.category?.icon}</span>
                      <span>{job.category?.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>📍 {job.address ?? 'Location set'}</span>
                      <span>{timeAgo(job.created_at)}</span>
                    </div>
                    {alreadyBid && (
                      <Badge variant="secondary" className="text-xs">Bid submitted</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <Separator />

      {/* Active accepted / in-progress jobs */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
          Active Jobs ({activeJobs.length})
        </h2>

        {activeJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No active jobs yet — submit a bid on a nearby job to get started!
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeJobs.map((b, i) =>
              b.job ? (
                <Link key={b.job.id ?? i} href={`/provider/jobs/${b.job.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-orange-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{b.job.title}</CardTitle>
                        <Badge className={`text-xs capitalize whitespace-nowrap ${
                          b.job.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {b.job.status === 'in_progress' ? 'In Progress' : 'Accepted'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{b.job.category?.icon}</span>
                        <span>{b.job.category?.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {new Date(b.job.created_at).toLocaleDateString('en-PK', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                        <span className="font-semibold text-orange-600">
                          PKR {b.price.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : null
            )}
          </div>
        )}
      </section>

      <Separator />

      {/* Completed jobs & earnings */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
            Completed Jobs ({completedJobs.length})
          </h2>
          <span className="text-sm font-semibold text-orange-600">
            PKR {totalEarnings.toLocaleString()} earned
          </span>
        </div>

        {completedJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No completed jobs yet — keep bidding!
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {completedJobs.map((b, i) =>
              b.job ? (
                <Link key={b.job.id ?? i} href={`/provider/jobs/${b.job.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full opacity-80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base leading-snug">{b.job.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{b.job.category?.icon}</span>
                        <span>{b.job.category?.name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {new Date(b.job.created_at).toLocaleDateString('en-PK', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                        <span className="font-semibold text-orange-600">
                          PKR {b.price.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : null
            )}
          </div>
        )}
      </section>
    </div>
  )
}
