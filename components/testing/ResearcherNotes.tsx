'use client'

import { useEffect, useState, useRef } from 'react'
import { useTestSession } from '@/lib/hooks/useTestSession'
import { trackResearcherNote } from '@/lib/tracking'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function ResearcherNotes() {
  const { isTestMode } = useTestSession()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isTestMode) return

    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+Shift+N to open notes
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTestMode])

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [open])

  function handleSubmit() {
    if (!note.trim()) {
      setOpen(false)
      setNote('')
      return
    }

    trackResearcherNote(note.trim())
    setNote('')
    setOpen(false)
  }

  if (!isTestMode) return null

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Researcher Note</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Shift+N to capture observations
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              ref={textareaRef}
              placeholder="What are you observing? (e.g., 'User seems confused at step 2', 'Found the location button quickly'...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="resize-none"
            />

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700">
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating hint button */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setOpen(true)}
          variant="secondary"
          className="shadow-lg"
          title="Press Ctrl+Shift+N"
        >
          📝 Notes
        </Button>
      </div>
    </>
  )
}
