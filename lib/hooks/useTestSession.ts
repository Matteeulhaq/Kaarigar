'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { posthog } from '@/lib/posthog'
import { trackJobAction } from '@/lib/tracking'

export interface TestSession {
  isTestMode: boolean
  testerId: string | null
  sessionId: string | null
  flow: string | null
}

export function useTestSession(): TestSession {
  const searchParams = useSearchParams()
  const [session, setSession] = useState<TestSession>({
    isTestMode: false,
    testerId: null,
    sessionId: null,
    flow: null,
  })

  useEffect(() => {
    const testerId = searchParams.get('tester_id')
    const sessionId = searchParams.get('session_id')
    const flow = searchParams.get('flow')

    if (testerId && sessionId) {
      const testSession: TestSession = {
        isTestMode: true,
        testerId,
        sessionId,
        flow,
      }
      setSession(testSession)

      // Set cookie for server-side tracking
      document.cookie = `test_tester_id=${testerId}; path=/; max-age=3600`

      // Identify user in PostHog
      posthog.identify(`test-${testerId}`, {
        tester_id: testerId,
        session_id: sessionId,
        is_test: true,
      })

      // Track session start
      posthog.capture('test_session_start', {
        tester_id: testerId,
        session_id: sessionId,
        flow,
        timestamp: Date.now(),
      })
    }
  }, [searchParams])

  // Check for server action tracking cookie
  useEffect(() => {
    const trackCookie = document.cookie
      .split('; ')
      .find((row) => row.startsWith('test_track_action='))

    if (trackCookie) {
      const trackAction = JSON.parse(
        decodeURIComponent(trackCookie.split('=')[1])
      )

      if (trackAction.action === 'accept_bid') {
        trackJobAction('accept_bid')
      } else if (trackAction.action === 'start_job') {
        trackJobAction('start_job')
      } else if (trackAction.action === 'complete_job') {
        trackJobAction('complete_job')
      }

      // Clear the cookie
      document.cookie = 'test_track_action=; path=/; max-age=0'
    }
  }, [])

  return session
}

export function startTestFlow(flowName: string) {
  posthog.capture('test_flow_start', {
    flow: flowName,
    timestamp: Date.now(),
  })
}

export function completeTestFlow(flowName: string, durationMs: number) {
  posthog.capture('test_flow_complete', {
    flow: flowName,
    duration_ms: durationMs,
    timestamp: Date.now(),
  })
}
