'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { posthog } from '@/lib/posthog'

interface Event {
  event: string
  properties: Record<string, any>
  timestamp: number
}

interface SessionSummary {
  testerId: string
  sessionId: string
  startTime: number
  endTime?: number
  susScore?: number
  eventCount: number
  flow?: string
}

export default function TestResultsPage() {
  const [testerId, setTesterId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchEvents() {
    if (!testerId) {
      alert('Please enter a tester ID')
      return
    }

    setLoading(true)

    try {
      // Fetch events from PostHog
      const response = await fetch(
        `https://app.posthog.com/api/projects/${process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID}/events/?person_id=test-${testerId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_POSTHOG_PERSONAL_API_KEY}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        const fetchedEvents: Event[] = (data.results || []).map((e: any) => ({
          event: e.event,
          properties: e.properties || {},
          timestamp: e.timestamp || Date.now(),
        }))

        setEvents(fetchedEvents)
      } else {
        alert('Failed to fetch events. Check API key configuration.')
      }
    } catch (error) {
      console.error('Error fetching events:', error)
      alert('Error fetching events. Check console for details.')
    }

    setLoading(false)
  }

  function exportToCSV() {
    if (events.length === 0) {
      alert('No events to export')
      return
    }

    const headers = ['timestamp', 'event', 'tester_id', 'session_id', ...Object.keys(events[0].properties).filter(k => k !== 'tester_id' && k !== 'session_id')]
    const rows = events.map(e => [
      new Date(e.timestamp).toISOString(),
      e.event,
      e.properties.tester_id || '',
      e.properties.session_id || '',
      ...headers.slice(4).map(h => e.properties[h] ?? ''),
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-results-${testerId || 'all'}-${Date.now()}.csv`
    a.click()
  }

  function exportToJSON() {
    if (events.length === 0) {
      alert('No events to export')
      return
    }

    const json = JSON.stringify(events, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-results-${testerId || 'all'}-${Date.now()}.json`
    a.click()
  }

  function getSessionSummaries(): SessionSummary[] {
    const sessions = new Map<string, SessionSummary>()

    events.forEach(e => {
      const testerId = e.properties.tester_id
      const sessionId = e.properties.session_id
      const key = `${testerId}-${sessionId}`

      if (!sessions.has(key)) {
        sessions.set(key, {
          testerId: testerId || '',
          sessionId: sessionId || '',
          startTime: e.timestamp,
          eventCount: 0,
          flow: e.properties.flow,
        })
      }

      const summary = sessions.get(key)!
      summary.eventCount++

      if (e.event === 'sus_completed') {
        summary.susScore = e.properties.score
      }

      if (!summary.endTime || e.timestamp > summary.endTime) {
        summary.endTime = e.timestamp
      }
    })

    return Array.from(sessions.values())
  }

  const sessions = getSessionSummaries()
  const susEvents = events.filter(e => e.event === 'sus_completed')
  const avgSusScore = susEvents.length > 0
    ? (susEvents.reduce((sum, e) => sum + (e.properties.score || 0), 0) / susEvents.length).toFixed(1)
    : '-'

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Results</h1>
        <p className="text-muted-foreground">
          Export usability test data from PostHog for analysis
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testerId">Tester ID</Label>
              <Input
                id="testerId"
                placeholder="e.g., ali, sara"
                value={testerId}
                onChange={(e) => setTesterId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionId">Session ID (optional)</Label>
              <Input
                id="sessionId"
                placeholder="e.g., 001, 002"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={fetchEvents}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Fetching...' : 'Fetch Events'}
          </Button>
        </CardContent>
      </Card>

      {events.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{events.length}</div>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{sessions.length}</div>
                <p className="text-sm text-muted-foreground">Sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{avgSusScore}</div>
                <p className="text-sm text-muted-foreground">Avg SUS Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={exportToCSV} variant="outline">
                Export as CSV
              </Button>
              <Button onClick={exportToJSON} variant="outline">
                Export as JSON
              </Button>
            </CardContent>
          </Card>

          {/* Session Summaries */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Session Summaries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Tester</th>
                      <th className="text-left py-2 px-3">Session</th>
                      <th className="text-left py-2 px-3">Flow</th>
                      <th className="text-left py-2 px-3">Events</th>
                      <th className="text-left py-2 px-3">SUS Score</th>
                      <th className="text-left py-2 px-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3">{s.testerId}</td>
                        <td className="py-2 px-3">{s.sessionId}</td>
                        <td className="py-2 px-3">{s.flow || '-'}</td>
                        <td className="py-2 px-3">{s.eventCount}</td>
                        <td className="py-2 px-3">{s.susScore || '-'}</td>
                        <td className="py-2 px-3">
                          {s.endTime ? `${Math.round((s.endTime - s.startTime) / 1000)}s` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Event List */}
          <Card>
            <CardHeader>
              <CardTitle>Events ({events.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Time</th>
                      <th className="text-left py-2 px-3">Event</th>
                      <th className="text-left py-2 px-3">Properties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3 whitespace-nowrap">
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3">
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {e.event}
                          </code>
                        </td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">
                          {JSON.stringify(e.properties)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {events.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">No events loaded</p>
            <p className="text-sm">Enter a tester ID and fetch events to see test results</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
