'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

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
    .select('id, status, price')
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

  // Track bid acceptance if in test mode
  const cookieStore = await cookies()
  const testerId = cookieStore.get('test_tester_id')?.value
  if (testerId) {
    // We'll use a client-side event for tracking since this is a server action
    // Set a cookie to trigger client-side tracking
    cookieStore.set('test_track_action', JSON.stringify({
      action: 'accept_bid',
      bidId,
      jobId,
      price: bid.price,
      timestamp: Date.now(),
    }), { maxAge: 60 })
  }

  revalidatePath(`/buyer/jobs/${jobId}`)
  return {}
}
