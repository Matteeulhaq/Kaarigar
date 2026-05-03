'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
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
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-5xl">⚠️</p>
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          An unexpected error occurred. Please try again or refresh the page.
        </p>
        <Button onClick={reset} className="bg-orange-600 hover:bg-orange-700 text-white">
          Try again
        </Button>
      </body>
    </html>
  )
}
