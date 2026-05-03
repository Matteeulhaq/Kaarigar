import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import BidForm from './bid-form'
import ProviderJobActions from './provider-job-actions'
import type { Bid, Job, Profile, Category } from '@/lib/supabase/types'

type JobRow = Omit<Job, 'category' | 'buyer'> & {
  category: Category | null
  buyer: Profile | null
}

const urgencyConfig = {
  low: { label: 'Low', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  high: { label: 'Urgent', className: 'bg-red-100 text-red-700 border-red-200' },
}

export default async function ProviderJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch job with category + buyer profile
  const { data: jobData, error: jobError } = await supabase
    .from('jobs')
    .select(
      `
      *,
      category:categories(id, name, icon, description),
      buyer:profiles!jobs_buyer_id_fkey(id, name, avatar_url, created_at, role, phone)
    `
    )
    .eq('id', id)
    .single()

  if (jobError || !jobData) notFound()

  const job = jobData as unknown as JobRow

  // Fetch provider's existing bid on this job
  const { data: existingBidData } = await supabase
    .from('bids')
    .select('*')
    .eq('job_id', id)
    .eq('provider_id', user.id)
    .maybeSingle()

  const existingBid = existingBidData as Bid | null

  // Signed URLs for photos (if any)
  const signedPhotoUrls: string[] = []
  if (job.photo_urls?.length > 0) {
    const { data: signed } = await supabase.storage
      .from('job-photos')
      .createSignedUrls(
        job.photo_urls.map((p) => (p.startsWith('http') ? p.split('/job-photos/')[1] : p)),
        60 * 60
      )
    if (signed) {
      signedPhotoUrls.push(...signed.map((s) => s.signedUrl))
    }
  }

  const urgency = urgencyConfig[job.urgency] ?? urgencyConfig.low
  const postedAt = new Date(job.created_at)
  const minutesAgo = Math.floor((Date.now() - postedAt.getTime()) / 60000)
  const timeLabel =
    minutesAgo < 1
      ? 'just now'
      : minutesAgo < 60
      ? `${minutesAgo}m ago`
      : minutesAgo < 1440
      ? `${Math.floor(minutesAgo / 60)}h ago`
      : postedAt.toLocaleDateString()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Back link */}
      <a href="/provider/dashboard" className="text-sm text-orange-600 hover:underline">
        ← Back to dashboard
      </a>

      {/* Job header */}
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
              {job.category?.name} · {timeLabel}
            </p>
          </div>
          <Badge variant="outline" className={urgency.className}>
            {urgency.label}
          </Badge>
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

      {/* Buyer info */}
      {job.buyer && (
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={job.buyer.avatar_url ?? undefined} />
              <AvatarFallback>
                {job.buyer.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{job.buyer.name ?? 'Buyer'}</p>
              <p className="text-xs text-muted-foreground">
                Member since {new Date(job.buyer.created_at).getFullYear()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Bid form or status */}
      <BidForm
        jobId={job.id}
        existingBid={existingBid}
        jobStatus={job.status}
      />

      {/* Start Job / Mark Complete — shown when this provider's bid was accepted */}
      {existingBid?.status === 'accepted' && (
        <ProviderJobActions jobId={job.id} jobStatus={job.status} />
      )}
    </div>
  )
}
