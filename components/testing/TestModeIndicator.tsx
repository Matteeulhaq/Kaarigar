'use client'

import { useTestSession } from '@/lib/hooks/useTestSession'

export function TestModeIndicator() {
  const { isTestMode, testerId, sessionId } = useTestSession()

  if (!isTestMode) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
      TEST MODE — Tester: {testerId} | Session: {sessionId}
    </div>
  )
}
