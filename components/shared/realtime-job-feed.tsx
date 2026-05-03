'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Job } from '@/lib/supabase/types'

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-700',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type JobWithCategory = Omit<Job, 'category'> & {
  category?: { id: string; name: string; icon: string; description: string | null }
}

interface Props {
  initialJobs: JobWithCategory[]
  bidJobIds: string[]
  providerLat: number | null
  providerLng: number | null
  radiusKm: number
}

export default function RealtimeJobFeed({
  initialJobs,
  bidJobIds: initialBidJobIds,
  providerLat,
  providerLng,
  radiusKm,
}: Props) {
  const supabase = createClient()
  const [jobs, setJobs] = useState<JobWithCategory[]>(initialJobs)
  const [bidJobIds, setBidJobIds] = useState<Set<string>>(new Set(initialBidJobIds))
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // Subscribe to new jobs being inserted
    channelRef.current = supabase
      .channel('new-jobs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'jobs' },
        async (payload) => {
          const newJob = payload.new as Job

          // Only show if status is open
          if (newJob.status !== 'open') return

          // Proximity check on the client side (avoid showing out-of-range jobs)
          if (providerLat !== null && providerLng !== null) {
            const R = 6371000 // Earth radius in metres
            const dLat = ((newJob.lat - providerLat) * Math.PI) / 180
            const dLng = ((newJob.lng - providerLng) * Math.PI) / 180
            const a =
              Math.sin(dLat / 2) ** 2 +
              Math.cos((providerLat * Math.PI) / 180) *
                Math.cos((newJob.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) ** 2
            const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            if (dist > radiusKm * 1000) return
          }

          // Fetch the category for the new job
          const { data: cat } = await supabase
            .from('categories')
            .select('id, name, icon, description')
            .eq('id', newJob.category_id)
            .single()

          const enriched: JobWithCategory = {
            ...newJob,
            category: cat ? { id: cat.id, name: cat.name, icon: cat.icon, description: cat.description ?? null } : undefined,
          }

          setJobs((prev) => [enriched, ...prev])
          toast.info(`New job nearby: ${newJob.title}`, { duration: 5000 })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs' },
        (payload) => {
          const updated = payload.new as Job
          // Remove jobs that are no longer open
          if (updated.status !== 'open') {
            setJobs((prev) => prev.filter((j) => j.id !== updated.id))
          }
        }
      )
      .subscribe()

    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [supabase, providerLat, providerLng, radiusKm])

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        <p className="text-4xl mb-2">📭</p>
        <p>No open jobs in your area right now.</p>
        <p className="text-sm mt-1">Check back soon or expand your service radius.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {jobs.map((job) => {
        const alreadyBid = bidJobIds.has(job.id)
        return (
          <Link key={job.id} href={`/provider/jobs/${job.id}`}>
            <Card
              className={`hover:shadow-md transition-shadow cursor-pointer h-full ${
                alreadyBid ? 'opacity-60' : ''
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{job.title}</CardTitle>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize whitespace-nowrap ${
                      URGENCY_COLORS[job.urgency]
                    }`}
                  >
                    {job.urgency}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{job.category?.icon}</span>
                  <span>{job.category?.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>📍 {job.address ?? 'Location set'}</span>
                  <span>{timeAgo(job.created_at)}</span>
                </div>
                {alreadyBid && (
                  <Badge variant="secondary" className="text-xs">
                    Bid submitted
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
