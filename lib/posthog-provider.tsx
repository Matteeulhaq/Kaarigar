'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import type { ReactNode } from 'react'

export function PHProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        capture_pageview: false,
      })
    }
  }, [])

  return <div className="ph-provider">{children}</div>
}
