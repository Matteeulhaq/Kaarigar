'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { startJob, completeJob } from '@/app/actions/job-lifecycle'

interface Props {
  jobId: string
  jobStatus: string
}

export default function ProviderJobActions({ jobId, jobStatus }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useState(jobStatus)

  function handle(action: () => Promise<{ error?: string }>, nextStatus: string) {
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        toast.error(result.error)
        return
      }
      setOptimisticStatus(nextStatus)
      router.refresh()
    })
  }

  if (optimisticStatus === 'accepted') {
    return (
      <div className="space-y-2">
        <Button
          className="w-full bg-orange-600 hover:bg-orange-700"
          disabled={isPending}
          onClick={() => handle(() => startJob(jobId), 'in_progress')}
        >
          {isPending ? 'Starting…' : '▶ Start Job'}
        </Button>
        <a
          href={`/messages/${jobId}`}
          className="block text-center w-full rounded-md border border-border py-2 text-sm hover:bg-muted transition-colors"
        >
          Open Chat
        </a>
      </div>
    )
  }

  if (optimisticStatus === 'in_progress') {
    return (
      <div className="space-y-2">
        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={isPending}
          onClick={() => handle(() => completeJob(jobId), 'completed')}
        >
          {isPending ? 'Updating…' : '✓ Mark as Complete'}
        </Button>
        <a
          href={`/messages/${jobId}`}
          className="block text-center w-full rounded-md border border-border py-2 text-sm hover:bg-muted transition-colors"
        >
          Open Chat
        </a>
      </div>
    )
  }

  if (optimisticStatus === 'completed') {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center space-y-2">
        <p className="text-green-700 font-semibold">🎉 Job completed!</p>
        <a
          href={`/messages/${jobId}`}
          className="block text-center w-full rounded-md bg-green-600 hover:bg-green-700 text-white py-2 text-sm font-medium transition-colors"
        >
          Open Chat
        </a>
      </div>
    )
  }

  return null
}
