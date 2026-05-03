import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import BidList, { type BidRow } from './bid-list'
import BuyerJobActions from './buyer-job-actions'
import ReviewForm from './review-form'
import type { Job, Category } from '@/lib/supabase/types'

type JobRow = Omit<Job, 'category' | 'buyer'> & {
  category: Category | null
  bids: BidRow[]
  payment_status: string
}

const urgencyConfig = {
  low: { label: 'Low', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  high: { label: 'Urgent', className: 'bg-red-100 text-red-700 border-red-200' },
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-100 text-green-700 border-green-200' },
  accepted: { label: 'Accepted', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 border-red-200' },
}

export default async function BuyerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch job with category + all bids (with provider info)
  const { data: jobData, error } = await supabase
    .from('jobs')
    .select(
      `
      *,
      category:categories(id, name, icon, description),
      bids!bids_job_id_fkey(
        *,
        provider:profiles!bids_provider_id_fkey(id, name, avatar_url, created_at, role, phone)
      )
    `
    )
    .eq('id', id)
    .eq('buyer_id', user.id) // ensures buyer can only see their own jobs
    .single()

  if (error || !jobData) {
    console.error('[buyer job detail] query error:', error)
    notFound()
  }

  const jobRaw = jobData as unknown as Omit<JobRow, 'bids'> & {
    bids: (Omit<BidRow, 'provider_profile'> & { provider_profile?: BidRow['provider_profile'] })[]
  }

  // Fetch provider_profiles separately (no direct FK from bids to provider_profiles)
  const providerIds = [...new Set(jobRaw.bids.map((b) => b.provider_id).filter(Boolean))]
  const { data: providerProfilesRaw } = providerIds.length > 0
    ? await supabase
        .from('provider_profiles')
        .select('user_id, avg_rating, completed_jobs, is_verified, skills')
        .in('user_id', providerIds)
    : { data: [] }

  const ppByUserId = Object.fromEntries(
    (providerProfilesRaw ?? []).map((pp) => [pp.user_id, pp])
  )

  const job: JobRow = {
    ...(jobRaw as unknown as JobRow),
    bids: jobRaw.bids.map((b) => ({
      ...b,
      provider_profile: ppByUserId[b.provider_id] ?? null,
    })),
  }

  // Signed URLs for photos
  const signedPhotoUrls: string[] = []
  if (job.photo_urls?.length > 0) {
    const { data: signed } = await supabase.storage
      .from('job-photos')
      .createSignedUrls(
        job.photo_urls.map((p) => (p.startsWith('http') ? p.split('/job-photos/')[1] : p)),
        60 * 60
      )
    if (signed) signedPhotoUrls.push(...signed.map((s) => s.signedUrl))
  }

  const urgency = urgencyConfig[job.urgency] ?? urgencyConfig.low
  const status = statusConfig[job.status] ?? statusConfig.open

  const acceptedBid = job.bids.find((b) => b.status === 'accepted')
  const acceptedProviderName = acceptedBid?.provider?.name ?? null
  const acceptedProviderId = acceptedBid?.provider_id ?? null

  // Check if buyer already reviewed this job
  let alreadyReviewed = false
  if (job.status === 'completed' && acceptedProviderId) {
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('job_id', id)
      .eq('reviewer_id', user.id)
      .maybeSingle()
    alreadyReviewed = !!existingReview
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <a href="/buyer/dashboard" className="text-sm text-orange-600 hover:underline">
        ← Back to dashboard
      </a>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          {job.category && (
            <span className="text-3xl" aria-hidden="true">
              {job.category.icon}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight">{job.title}</h1>
            <p className="text-sm text-muted-foreground">
              {job.category?.name} ·{' '}
              {new Date(job.created_at).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
            <Badge variant="outline" className={urgency.className}>
              {urgency.label} priority
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Description */}
      {job.description && (
        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
              Description
            </h2>
            <p className="text-sm whitespace-pre-wrap">{job.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Location */}
      <Card>
        <CardContent className="pt-4">
          <h2 className="text-sm font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
            Location
          </h2>
          <p className="text-sm">
            {job.address ?? `${job.lat.toFixed(4)}, ${job.lng.toFixed(4)}`}
          </p>
        </CardContent>
      </Card>

      {/* Photos */}
      {signedPhotoUrls.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
            Photos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {signedPhotoUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Job photo ${i + 1}`}
                className="rounded-lg object-cover aspect-square w-full"
              />
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Cancel / Pay actions */}
      <BuyerJobActions
        jobId={job.id}
        initialJobStatus={job.status}
        initialPaymentStatus={job.payment_status}
        acceptedProviderName={acceptedProviderName}
      />

      {/* Review prompt — show after payment for unpreviewed completed jobs */}
      {job.status === 'completed' && !alreadyReviewed && acceptedProviderId && (
        <ReviewForm
          jobId={job.id}
          revieweeId={acceptedProviderId}
          revieweeName={acceptedProviderName}
        />
      )}

      {/* Realtime bid list */}
      <BidList
        jobId={job.id}
        initialJobStatus={job.status}
        initialBids={job.bids}
      />
    </div>
  )
}

