'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <p className="text-5xl">⚠️</p>
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        We hit an unexpected error. Try again or go back to your dashboard.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} className="bg-orange-600 hover:bg-orange-700 text-white">
          Try again
        </Button>
        <Link href="/provider/dashboard">
          <Button variant="outline">Go to dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
