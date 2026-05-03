'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function acceptBid(
  bidId: string,
  jobId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Authorisation: caller must be the job's buyer
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('buyer_id, status')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) return { error: 'Job not found' }
  if (job.buyer_id !== user.id) return { error: 'Not authorized' }
  if (job.status !== 'open') return { error: 'Job is no longer open for bids' }

  // Verify bid belongs to this job
  const { data: bid, error: bidErr } = await supabase
    .from('bids')
    .select('id, status')
    .eq('id', bidId)
    .eq('job_id', jobId)
    .single()

  if (bidErr || !bid) return { error: 'Bid not found' }
  if (bid.status !== 'pending') return { error: 'Bid is no longer pending' }

  // Run the atomic stored procedure
  const { error: rpcErr } = await supabase.rpc('accept_bid', {
    p_bid_id: bidId,
    p_job_id: jobId,
  })

  if (rpcErr) return { error: rpcErr.message }

  revalidatePath(`/buyer/jobs/${jobId}`)
  return {}
}
