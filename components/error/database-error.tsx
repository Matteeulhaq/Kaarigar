'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DatabaseErrorProps {
  title?: string
  message?: string | null
  onRetry?: () => void
}

export default function DatabaseError({
  title = 'Could not load data',
  message,
  onRetry,
}: DatabaseErrorProps) {
  const router = useRouter()

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center justify-between gap-3">
          <span>{title}</span>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRetry()
                router.refresh()
              }}
            >
              Try again
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      {message && (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          {message.includes('jobs') && (
            <p className="text-xs text-muted-foreground mt-2">
              This could mean the database tables haven't been migrated. Run{' '}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                supabase db push
              </code>
              {' '}in your project terminal.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}
