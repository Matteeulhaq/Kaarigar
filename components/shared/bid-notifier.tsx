'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Bid } from '@/lib/supabase/types'

interface Props {
  providerId: string
}

/**
 * Invisible client component mounted on the provider dashboard.
 * Subscribes to the provider's bids and fires a toast when any
 * bid transitions to 'accepted', prompting them to open the chat.
 */
export default function BidNotifier({ providerId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    channelRef.current = supabase
      .channel(`provider-bids-${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bids',
          filter: `provider_id=eq.${providerId}`,
        },
        (payload) => {
          const updated = payload.new as Bid
          if (updated.status === 'accepted') {
            toast.success('🎉 Your bid was accepted! Open the chat to get started.', {
              duration: 10000,
              action: {
                label: 'Open Chat',
                onClick: () => router.push(`/messages/${updated.job_id}`),
              },
            })
            // Refresh the dashboard so job cards reflect new state
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [supabase, providerId, router])

  return null
}
