'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(
  jobId: string,
  revieweeId: string,
  rating: number,
  comment: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Validate rating value
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Rating must be between 1 and 5' }
  }

  // Verify the job is completed and the caller is the buyer
  const { data: job } = await supabase
    .from('jobs')
    .select('buyer_id, status, accepted_bid_id')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }
  if (job.buyer_id !== user.id) return { error: 'Not authorized' }
  if (job.status !== 'completed') return { error: 'Job is not completed yet' }

  // Verify reviewee is the accepted provider
  if (job.accepted_bid_id) {
    const { data: bid } = await supabase
      .from('bids')
      .select('provider_id')
      .eq('id', job.accepted_bid_id)
      .single()
    if (bid?.provider_id !== revieweeId) return { error: 'Invalid provider' }
  }

  // Idempotency — check if review already submitted for this job by this reviewer
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('job_id', jobId)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  if (existing) return { error: 'You have already reviewed this job' }

  const { error } = await supabase.from('reviews').insert({
    job_id: jobId,
    reviewer_id: user.id,
    reviewee_id: revieweeId,
    rating,
    comment: comment.trim() || null,
  })

  if (error) return { error: error.message }

  revalidatePath(`/buyer/jobs/${jobId}`)
  revalidatePath(`/profile/${revieweeId}`)
  return {}
}
