'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { acceptBid } from '@/app/actions/accept-bid'
import type { Bid, Profile, ProviderProfile } from '@/lib/supabase/types'

export type BidRow = Omit<Bid, 'provider' | 'provider_profile'> & {
  provider: Profile | null
  provider_profile: Pick<
    ProviderProfile,
    'avg_rating' | 'completed_jobs' | 'is_verified' | 'skills'
  > | null
}

interface Props {
  jobId: string
  initialJobStatus: string
  initialBids: BidRow[]
}

function formatEta(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}

export default function BidList({ jobId, initialJobStatus, initialBids }: Props) {
  const supabase = createClient()
  const [bids, setBids] = useState<BidRow[]>(initialBids)
  const [jobStatus, setJobStatus] = useState(initialJobStatus)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    channelRef.current = supabase
      .channel(`bids-job-${jobId}`)
      // New bid arrives
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `job_id=eq.${jobId}` },
        async (payload) => {
          const newBid = payload.new as Bid

          // Fetch joins for the new bid
          const [{ data: pData }, { data: ppData }] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, name, avatar_url, created_at, role, phone')
              .eq('id', newBid.provider_id)
              .single(),
            supabase
              .from('provider_profiles')
              .select('avg_rating, completed_jobs, is_verified, skills')
              .eq('user_id', newBid.provider_id)
              .single(),
          ])

          const enriched: BidRow = {
            ...newBid,
            provider: (pData ?? null) as Profile | null,
            provider_profile: (ppData ?? null) as BidRow['provider_profile'],
          }

          setBids((prev) => {
            if (prev.some((b) => b.id === newBid.id)) return prev
            return [...prev, enriched]
          })

          toast.info(
            `New bid: PKR ${newBid.price.toLocaleString()} from ${pData?.name ?? 'a provider'}`,
            { duration: 6000 }
          )
        }
      )
      // Bid status updated (e.g., after accept_bid RPC)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bids', filter: `job_id=eq.${jobId}` },
        (payload) => {
          const updated = payload.new as Bid
          setBids((prev) =>
            prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
          )
        }
      )
      // Job status updated (so we close the bid form when accepted)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
        (payload) => {
          const updatedJob = payload.new as { status: string }
          setJobStatus(updatedJob.status)
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [supabase, jobId])

  function handleAccept(bid: BidRow) {
    setAcceptingId(bid.id)
    startTransition(async () => {
      const result = await acceptBid(bid.id, jobId)
      if (result.error) {
        toast.error(result.error)
        setAcceptingId(null)
        return
      }
      toast.success(`${bid.provider?.name ?? 'Provider'}'s bid accepted!`)
      // Optimistic update — Realtime will confirm shortly
      setJobStatus('accepted')
      setBids((prev) =>
        prev.map((b) => ({
          ...b,
          status: b.id === bid.id ? 'accepted' : 'rejected',
        }))
      )
      setAcceptingId(null)
    })
  }

  const pendingBids = bids.filter((b) => b.status === 'pending')
  const acceptedBid = bids.find((b) => b.status === 'accepted')
  const isOpen = jobStatus === 'open'

  return (
    <div className="space-y-4">
      {/* ── Accepted provider ── */}
      {acceptedBid && (
        <div>
          <h2 className="text-sm font-semibold mb-2 text-green-700 uppercase tracking-wide">
            ✓ Accepted Provider
          </h2>
          <BidCard
            bid={acceptedBid}
            jobId={jobId}
            onAccept={() => {}}
            accepting={false}
            disabled={true}
            showAcceptButton={false}
          />
        </div>
      )}

      {/* ── Pending bids (only while job is open) ── */}
      {isOpen && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Bids ({pendingBids.length})
          </h2>
          {pendingBids.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No bids yet — providers in your area have been notified.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingBids.map((bid) => (
                <BidCard
                  key={bid.id}
                  bid={bid}
                  jobId={jobId}
                  onAccept={() => handleAccept(bid)}
                  accepting={acceptingId === bid.id && isPending}
                  disabled={isPending}
                  showAcceptButton={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Closed state (no accepted bid) ── */}
      {!isOpen && !acceptedBid && (
        <p className="text-sm text-muted-foreground text-center py-8">
          This job is no longer accepting bids.
        </p>
      )}
    </div>
  )
}

function BidCard({
  bid,
  jobId,
  onAccept,
  accepting,
  disabled,
  showAcceptButton,
}: {
  bid: BidRow
  jobId: string
  onAccept: () => void
  accepting: boolean
  disabled: boolean
  showAcceptButton: boolean
}) {
  const rating = bid.provider_profile?.avg_rating ?? 0
  const completedJobs = bid.provider_profile?.completed_jobs ?? 0

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        {/* Provider row */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={bid.provider?.avatar_url ?? undefined} />
            <AvatarFallback>
              {bid.provider?.name?.charAt(0)?.toUpperCase() ?? 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">
                {bid.provider?.name ?? 'Provider'}
              </p>
              {bid.status === 'accepted' && (
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 border-green-200 text-xs shrink-0"
                >
                  Accepted
                </Badge>
              )}
              {bid.provider_profile?.is_verified && (
                <span className="text-xs text-blue-600 shrink-0">✓ Verified</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {rating > 0 ? `★ ${rating.toFixed(1)}` : 'New provider'} · {completedJobs} job
              {completedJobs !== 1 ? 's' : ''} done
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-orange-600">
              PKR {bid.price.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{formatEta(bid.eta_minutes)}</p>
          </div>
        </div>

        {/* Optional message */}
        {bid.message && (
          <p className="text-sm text-muted-foreground border-l-2 border-border pl-3 italic">
            {bid.message}
          </p>
        )}

        {/* View public profile link */}
        {bid.provider_id && (
          <a
            href={`/profile/${bid.provider_id}`}
            className="text-xs text-orange-600 hover:underline"
          >
            View profile →
          </a>
        )}

        {/* Accept button */}
        {showAcceptButton && (
          <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={onAccept}
            disabled={disabled}
          >
            {accepting ? 'Accepting…' : 'Accept this Bid'}
          </Button>
        )}

        {/* Chat link once accepted */}
        {bid.status === 'accepted' && (
          <a
            href={`/messages/${jobId}`}
            className="block text-center w-full rounded-md bg-green-600 hover:bg-green-700 text-white py-2 text-sm font-medium transition-colors"
          >
            Open Chat →
          </a>
        )}
      </CardContent>
    </Card>
  )
}
