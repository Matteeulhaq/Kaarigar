import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import BuyerBidNotifier from '@/components/shared/buyer-bid-notifier'
import type { Job, Profile } from '@/lib/supabase/types'

type JobWithExtras = Omit<Job, 'accepted_bid'> & {
  category: { name: string; icon: string } | null
  accepted_bid: {
    price: number
    provider: Pick<Profile, 'id' | 'name'> | null
  } | null
  review_count: number
  bid_count: number
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  accepted: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function BuyerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: jobsRaw, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      *,
      category:categories(name, icon),
      bids!bids_job_id_fkey(id)
    `)
    .eq('buyer_id', user!.id)
    .order('created_at', { ascending: false })

  if (jobsError) console.error('[buyer dashboard] jobs query error:', jobsError)

  // Fetch review counts per job for this buyer (to show "Reviewed" badge)
  const { data: reviewedJobs } = await supabase
    .from('reviews')
    .select('job_id')
    .eq('reviewer_id', user!.id)
  const reviewedJobIds = new Set((reviewedJobs ?? []).map((r: { job_id: string }) => r.job_id))

  // Fetch accepted bids separately to get provider name + price (avoids FK hint issues)
  const jobIds = (jobsRaw ?? []).map((j: Record<string, unknown>) => j.id as string)
  const { data: acceptedBidsRaw } = jobIds.length > 0
    ? await supabase
        .from('bids')
        .select('job_id, price, provider:profiles!bids_provider_id_fkey(id, name)')
        .in('job_id', jobIds)
        .eq('status', 'accepted')
    : { data: [] }

  type AcceptedBidMap = Record<string, { price: number; provider: Pick<Profile, 'id' | 'name'> | null }>
  type RawAcceptedBid = { job_id: string; price: number; provider: { id: string; name: string }[] }
  const acceptedBidByJob: AcceptedBidMap = {}
  for (const b of (acceptedBidsRaw ?? []) as unknown as RawAcceptedBid[]) {
    acceptedBidByJob[b.job_id] = {
      price: b.price,
      provider: b.provider?.[0] ?? null,
    }
  }

  const jobs: JobWithExtras[] = (jobsRaw ?? []).map((j: Record<string, unknown>) => ({
    ...(j as unknown as Job),
    category: j.category as JobWithExtras['category'],
    accepted_bid: acceptedBidByJob[j.id as string] ?? null,
    review_count: reviewedJobIds.has(j.id as string) ? 1 : 0,
    bid_count: Array.isArray(j.bids) ? (j.bids as unknown[]).length : 0,
  }))

  const activeJobs = jobs.filter((j) => !['completed', 'cancelled'].includes(j.status))
  const pastJobs = jobs.filter((j) => ['completed', 'cancelled'].includes(j.status))

  const openJobIds = activeJobs
    .filter((j) => j.status === 'open')
    .map((j) => j.id)

  return (
    <div className="space-y-6">
      <BuyerBidNotifier openJobIds={openJobIds} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <Link href="/buyer/jobs/post">
          <Button className="bg-orange-600 hover:bg-orange-700">+ Post a Job</Button>
        </Link>
      </div>

      {/* Active jobs */}
      <section>
        <h2 className="text-base font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Active ({activeJobs.length})
        </h2>
        {activeJobs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-2">📋</p>
            <p>No active jobs yet.</p>
            <Link href="/buyer/jobs/post">
              <Button variant="link" className="text-orange-600 mt-1">Post your first job →</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeJobs.map((job) => (
              <JobCard key={job.id} job={job} reviewed={false} />
            ))}
          </div>
        )}
      </section>

      {/* Job history */}
      {pastJobs.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            History ({pastJobs.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {pastJobs.map((job) => (
              <JobCard key={job.id} job={job} reviewed={job.review_count > 0} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function JobCard({ job, reviewed }: { job: JobWithExtras; reviewed: boolean }) {
  const isPast = ['completed', 'cancelled'].includes(job.status)
  return (
    <Link href={`/buyer/jobs/${job.id}`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${isPast ? 'opacity-75' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{job.title}</CardTitle>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap ${
                STATUS_COLORS[job.status]
              }`}
            >
              {job.status.replace('_', ' ')}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{job.category?.icon}</span>
            <span>{job.category?.name}</span>
            <span>·</span>
            <Badge variant="outline" className="capitalize text-xs">{job.urgency}</Badge>
          </div>

          {/* Bid count badge for open jobs */}
          {job.status === 'open' && (
            <div className="flex items-center gap-2">
              {job.bid_count > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded-full px-2 py-0.5">
                  🏷️ {job.bid_count} bid{job.bid_count !== 1 ? 's' : ''} received — tap to review
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Waiting for bids…</span>
              )}
            </div>
          )}

          {/* Accepted provider row */}
          {job.accepted_bid?.provider && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {job.accepted_bid.provider.name?.charAt(0)?.toUpperCase() ?? 'P'}
                </AvatarFallback>
              </Avatar>
              <span>{job.accepted_bid.provider.name}</span>
              <span>· PKR {job.accepted_bid.price.toLocaleString()}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {new Date(job.created_at).toLocaleDateString('en-PK', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
            {job.status === 'completed' && reviewed && (
              <span className="text-xs text-yellow-600 font-medium">★ Reviewed</span>
            )}
            {job.status === 'completed' && !reviewed && (
              <span className="text-xs text-orange-600 font-medium">Rate provider →</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
