'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  /** All open job IDs owned by this buyer — used to filter realtime events */
  openJobIds: string[]
}

/**
 * Invisible component mounted on the buyer dashboard.
 * Fires a toast whenever a provider submits a new bid on any of the buyer's open jobs.
 */
export default function BuyerBidNotifier({ openJobIds }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (openJobIds.length === 0) return

    channelRef.current = supabase
      .channel('buyer-new-bids')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
        },
        (payload) => {
          const newBid = payload.new as { job_id: string; id: string }
          // Only notify for bids on this buyer's own open jobs
          if (!openJobIds.includes(newBid.job_id)) return

          toast.info('💼 A provider submitted a bid on your job!', {
            duration: 8000,
            action: {
              label: 'View Bids',
              onClick: () => router.push(`/buyer/jobs/${newBid.job_id}`),
            },
          })
          // Refresh dashboard to update bid counts
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [supabase, openJobIds, router])

  return null
}
