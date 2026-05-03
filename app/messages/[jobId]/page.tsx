import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Chat from './chat'
import type { Message, Profile, Job } from '@/lib/supabase/types'

type MessageRow = Omit<Message, 'sender'> & {
  sender: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
}

type JobRow = Pick<
  Job,
  'id' | 'title' | 'status' | 'buyer_id' | 'accepted_bid_id'
>

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch job metadata
  const { data: jobData, error: jobErr } = await supabase
    .from('jobs')
    .select('id, title, status, buyer_id, accepted_bid_id')
    .eq('id', jobId)
    .single()

  if (jobErr || !jobData) notFound()

  const job = jobData as unknown as JobRow

  // Determine if caller is the buyer
  const isBuyer = job.buyer_id === user.id

  // Determine if caller is the accepted provider
  let isAcceptedProvider = false
  if (!isBuyer && job.accepted_bid_id) {
    const { data: bid } = await supabase
      .from('bids')
      .select('provider_id')
      .eq('id', job.accepted_bid_id)
      .single()
    isAcceptedProvider = bid?.provider_id === user.id
  }

  // Only buyer or accepted provider may access this chat
  if (!isBuyer && !isAcceptedProvider) {
    redirect(isBuyer ? '/buyer/dashboard' : '/provider/dashboard')
  }

  // Messages are only visible after a bid is accepted
  const canChat = ['accepted', 'in_progress', 'completed'].includes(job.status)

  // Fetch message history
  const { data: msgData } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id, name, avatar_url)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  const messages = (msgData ?? []) as unknown as MessageRow[]

  const backHref = isBuyer
    ? `/buyer/jobs/${jobId}`
    : `/provider/jobs/${jobId}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a href={backHref} className="text-sm text-orange-600 hover:underline shrink-0">
          ←
        </a>
        <div>
          <h1 className="text-lg font-bold leading-tight">{job.title}</h1>
          <p className="text-xs text-muted-foreground capitalize">
            {job.status.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Chat */}
      <Chat
        jobId={jobId}
        currentUserId={user.id}
        initialMessages={messages}
        canChat={canChat}
      />
    </div>
  )
}
