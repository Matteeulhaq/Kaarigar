'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cancelJob, payJob } from '@/app/actions/job-lifecycle'

interface Props {
  jobId: string
  initialJobStatus: string
  initialPaymentStatus: string
  acceptedProviderName: string | null
}

export default function BuyerJobActions({
  jobId,
  initialJobStatus,
  initialPaymentStatus,
  acceptedProviderName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [jobStatus, setJobStatus] = useState(initialJobStatus)
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus)

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelJob(jobId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Job cancelled.')
      setJobStatus('cancelled')
      router.refresh()
    })
  }

  function handlePay() {
    startTransition(async () => {
      const result = await payJob(jobId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Payment marked — thank you!')
      setPaymentStatus('paid')
      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {/* Pay Now — only when completed + unpaid */}
      {jobStatus === 'completed' && paymentStatus === 'unpaid' && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-orange-800">
            {acceptedProviderName
              ? `${acceptedProviderName} has completed the job.`
              : 'The job is complete.'}{' '}
            Please confirm payment.
          </p>
          <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            disabled={isPending}
            onClick={handlePay}
          >
            {isPending ? 'Processing…' : '💳 Mark as Paid'}
          </Button>
        </div>
      )}

      {/* Paid confirmation */}
      {paymentStatus === 'paid' && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center text-green-700 text-sm font-medium">
          ✓ Payment confirmed
        </div>
      )}

      {/* Cancel — only while open or accepted */}
      {(jobStatus === 'open' || jobStatus === 'accepted') && (
        <Button
          variant="outline"
          className="w-full border-destructive text-destructive hover:bg-destructive/10"
          disabled={isPending}
          onClick={handleCancel}
        >
          {isPending ? 'Cancelling…' : 'Cancel Job'}
        </Button>
      )}
    </div>
  )
}
