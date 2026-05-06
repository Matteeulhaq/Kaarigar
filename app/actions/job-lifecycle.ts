'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

// ─── Start Job (provider: accepted → in_progress) ───────────────────────────
export async function startJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify caller is the accepted provider for this job
  const { data: job } = await supabase
    .from('jobs')
    .select('status, accepted_bid_id')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }
  if (job.status !== 'accepted') return { error: 'Job is not in accepted state' }

  const { data: bid } = await supabase
    .from('bids')
    .select('provider_id')
    .eq('id', job.accepted_bid_id!)
    .single()

  if (!bid || bid.provider_id !== user.id) return { error: 'Not authorized' }

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'in_progress' })
    .eq('id', jobId)

  if (error) return { error: error.message }

  // Track job start if in test mode
  const cookieStore = await cookies()
  const testerId = cookieStore.get('test_tester_id')?.value
  if (testerId) {
    cookieStore.set('test_track_action', JSON.stringify({
      action: 'start_job',
      jobId,
      timestamp: Date.now(),
    }), { maxAge: 60 })
  }

  revalidatePath(`/provider/jobs/${jobId}`)
  revalidatePath(`/buyer/jobs/${jobId}`)
  return {}
}

// ─── Complete Job (provider: in_progress → completed) ───────────────────────
export async function completeJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: job } = await supabase
    .from('jobs')
    .select('status, accepted_bid_id')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }
  if (job.status !== 'in_progress') return { error: 'Job is not in progress' }

  const { data: bid } = await supabase
    .from('bids')
    .select('provider_id')
    .eq('id', job.accepted_bid_id!)
    .single()

  if (!bid || bid.provider_id !== user.id) return { error: 'Not authorized' }

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'completed' })
    .eq('id', jobId)

  if (error) return { error: error.message }

  // Track job completion if in test mode
  const cookieStore = await cookies()
  const testerId = cookieStore.get('test_tester_id')?.value
  if (testerId) {
    cookieStore.set('test_track_action', JSON.stringify({
      action: 'complete_job',
      jobId,
      timestamp: Date.now(),
    }), { maxAge: 60 })
  }

  revalidatePath(`/provider/jobs/${jobId}`)
  revalidatePath(`/buyer/jobs/${jobId}`)
  return {}
}

// ─── Cancel Job (buyer: open | accepted → cancelled) ────────────────────────
export async function cancelJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: job } = await supabase
    .from('jobs')
    .select('buyer_id, status')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }
  if (job.buyer_id !== user.id) return { error: 'Not authorized' }
  if (!['open', 'accepted'].includes(job.status)) {
    return { error: 'Job cannot be cancelled once work has started' }
  }

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'cancelled' })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath(`/buyer/jobs/${jobId}`)
  revalidatePath('/buyer/dashboard')
  return {}
}

// ─── Pay Job (buyer: simulated payment → payment_status = paid) ─────────────
export async function payJob(jobId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: job } = await supabase
    .from('jobs')
    .select('buyer_id, status, payment_status')
    .eq('id', jobId)
    .single()

  if (!job) return { error: 'Job not found' }
  if (job.buyer_id !== user.id) return { error: 'Not authorized' }
  if (job.status !== 'completed') return { error: 'Job is not completed yet' }
  if (job.payment_status === 'paid') return { error: 'Already paid' }

  const { error } = await supabase
    .from('jobs')
    .update({ payment_status: 'paid' })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath(`/buyer/jobs/${jobId}`)
  return {}
}
