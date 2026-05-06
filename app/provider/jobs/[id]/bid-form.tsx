'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Bid } from '@/lib/supabase/types'
import { useTestSession, startTestFlow, completeTestFlow } from '@/lib/hooks/useTestSession'
import { trackBidSubmitted, trackBidError } from '@/lib/tracking'
import { SUSQuestionnaire } from '@/components/testing/SUSQuestionnaire'

const schema = z.object({
  price: z
    .number({ error: 'Enter a valid price' })
    .positive('Price must be greater than 0')
    .max(10_000_000, 'Price seems too high'),
  eta_minutes: z
    .number({ error: 'Enter a valid ETA' })
    .int()
    .min(5, 'Minimum 5 minutes')
    .max(10080, 'Maximum 7 days (10080 minutes)'),
  message: z.string().max(500, 'Max 500 characters').optional(),
})

type FormValues = z.infer<typeof schema>

const ETA_PRESETS = [
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '2 hr', value: 120 },
  { label: 'Today', value: 480 },
  { label: 'Tomorrow', value: 1440 },
]

interface BidFormProps {
  jobId: string
  existingBid: Bid | null
  jobStatus: string
}

export default function BidForm({ jobId, existingBid, jobStatus }: BidFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const { isTestMode } = useTestSession()
  const [loading, setLoading] = useState(false)
  const [showSUS, setShowSUS] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      price: existingBid?.price ?? undefined,
      eta_minutes: existingBid?.eta_minutes ?? 60,
      message: existingBid?.message ?? '',
    },
  })

  const etaValue = watch('eta_minutes')

  // Job is not open — show status message instead of form
  if (jobStatus !== 'open') {
    const messages: Record<string, string> = {
      accepted: 'This job has been accepted by another provider.',
      in_progress: 'This job is currently in progress.',
      completed: 'This job has been completed.',
      cancelled: 'This job was cancelled by the buyer.',
    }
    return (
      <Card>
        <CardContent className="pt-5 text-center text-muted-foreground">
          <p className="text-2xl mb-2">🔒</p>
          <p>{messages[jobStatus] ?? 'This job is no longer accepting bids.'}</p>
        </CardContent>
      </Card>
    )
  }

  // Already bid — show current bid status
  if (existingBid) {
    const statusStyles: Record<string, string> = {
      pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      accepted: 'bg-green-50 border-green-200 text-green-800',
      rejected: 'bg-red-50 border-red-200 text-red-700',
    }

    return (
      <Card className={`border-2 ${statusStyles[existingBid.status] ?? ''}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Bid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-semibold">PKR {existingBid.price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ETA</span>
            <span className="font-semibold">{formatEta(existingBid.eta_minutes)}</span>
          </div>
          {existingBid.message && (
            <div>
              <span className="text-muted-foreground">Message</span>
              <p className="mt-0.5 text-foreground">{existingBid.message}</p>
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-muted-foreground">Status</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
              existingBid.status === 'accepted' ? 'bg-green-100 text-green-800' :
              existingBid.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {existingBid.status}
            </span>
          </div>
          {existingBid.status === 'accepted' && (
            <Button
              className="w-full mt-3 bg-orange-600 hover:bg-orange-700"
              onClick={() => router.push(`/messages/${jobId}`)}
            >
              Open Chat →
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  async function onSubmit(values: FormValues) {
    setLoading(true)

    if (isTestMode) {
      startTestFlow('submit-bid')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be logged in')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('bids').insert({
      job_id: jobId,
      provider_id: user.id,
      price: values.price,
      eta_minutes: values.eta_minutes,
      message: values.message?.trim() || null,
    })

    if (error) {
      // Unique constraint violation = already bid
      if (error.code === '23505') {
        toast.error('You have already submitted a bid for this job.')
        if (isTestMode) trackBidError('Already bid on this job')
      } else {
        toast.error(error.message)
        if (isTestMode) trackBidError(error.message)
      }
      setLoading(false)
      return
    }

    if (isTestMode) {
      trackBidSubmitted({
        price: values.price,
        etaMinutes: values.eta_minutes,
        hasMessage: (values.message?.trim().length ?? 0) > 0,
      })
      completeTestFlow('submit-bid', 0)
      setShowSUS(true)
    }

    toast.success('Bid submitted! The buyer will be notified.')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Submit Your Bid</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Price */}
          <div className="space-y-1">
            <Label htmlFor="price">Your price (PKR) *</Label>
            <Input
              id="price"
              type="number"
              min={1}
              step={50}
              placeholder="e.g. 2500"
              {...register('price', { valueAsNumber: true })}
            />
            {errors.price && (
              <p className="text-xs text-destructive">{errors.price.message}</p>
            )}
          </div>

          {/* ETA presets + manual */}
          <div className="space-y-2">
            <Label>Estimated arrival *</Label>
            <div className="flex flex-wrap gap-2">
              {ETA_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setValue('eta_minutes', p.value, { shouldValidate: true })}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    etaValue === p.value
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'border-border hover:border-orange-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                placeholder="Custom (minutes)"
                className="w-44"
                {...register('eta_minutes', { valueAsNumber: true })}
              />
              <span className="text-sm text-muted-foreground">
                {etaValue ? `= ${formatEta(etaValue)}` : 'minutes'}
              </span>
            </div>
            {errors.eta_minutes && (
              <p className="text-xs text-destructive">{errors.eta_minutes.message}</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-1">
            <Label htmlFor="message">
              Message to buyer{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Briefly describe your approach, experience relevant to this job…"
              rows={3}
              maxLength={500}
              {...register('message')}
            />
            {errors.message && (
              <p className="text-xs text-destructive">{errors.message.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700"
            disabled={loading}
          >
            {loading ? 'Submitting…' : 'Submit Bid'}
          </Button>
        </form>
      </CardContent>

      <SUSQuestionnaire
        open={showSUS}
        onClose={() => setShowSUS(false)}
        flowName="submit-bid"
      />
    </Card>
  )
}

function formatEta(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} hr`
  return `${h} hr ${m} min`
}
