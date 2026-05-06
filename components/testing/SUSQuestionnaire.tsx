'use client'

import { useState } from 'react'
import { trackSUSCompleted } from '@/lib/tracking'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const SUS_QUESTIONS = [
  // Odd-numbered items (1, 3, 5, 7, 9)
  { id: 1, text: 'I think that I would like to use this system frequently.', odd: true },
  { id: 2, text: 'I found the system unnecessarily complex.', odd: false },
  { id: 3, text: 'I thought the system was easy to use.', odd: true },
  { id: 4, text: 'I think that I would need the support of a technical person to be able to use this system.', odd: false },
  { id: 5, text: 'I found the various functions in this system were well integrated.', odd: true },
  { id: 6, text: 'I thought there was too much inconsistency in this system.', odd: false },
  { id: 7, text: 'I would imagine that most people would learn to use this system very quickly.', odd: true },
  { id: 8, text: 'I found the system very cumbersome to use.', odd: false },
  { id: 9, text: 'I felt very confident using the system.', odd: true },
  { id: 10, text: 'I needed to learn a lot of things before I could get going with this system.', odd: false },
]

const OPTIONS = [
  { value: '1', label: 'Strongly Disagree' },
  { value: '2', label: 'Disagree' },
  { value: '3', label: 'Neutral' },
  { value: '4', label: 'Agree' },
  { value: '5', label: 'Strongly Agree' },
]

interface SUSQuestionnaireProps {
  open: boolean
  onClose: () => void
  flowName: string
}

export function SUSQuestionnaire({ open, onClose, flowName }: SUSQuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState<number | null>(null)

  const allAnswered = SUS_QUESTIONS.every((q) => answers[q.id])

  function handleAnswer(questionId: number, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function calculateScore(): number {
    let sum = 0

    for (const q of SUS_QUESTIONS) {
      const answer = parseInt(answers[q.id] || '0')

      if (q.odd) {
        // Odd items: score - 1
        sum += answer - 1
      } else {
        // Even items: 5 - score
        sum += 5 - answer
      }
    }

    return sum * 2.5 // Multiply by 2.5 to get 0-100 scale
  }

  function handleSubmit() {
    if (!allAnswered) return

    const susScore = calculateScore()
    setScore(susScore)
    setSubmitted(true)

    trackSUSCompleted(susScore)

    setTimeout(() => {
      onClose()
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>System Usability Scale (SUS)</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Please rate your agreement with each statement (1-5)
          </p>
        </DialogHeader>

        {!submitted ? (
          <div className="space-y-6 py-4">
            {SUS_QUESTIONS.map((question) => (
              <div key={question.id} className="space-y-3">
                <Label className="text-base">
                  {question.id}. {question.text}
                </Label>
                <RadioGroup
                  value={answers[question.id] || ''}
                  onValueChange={(value) => handleAnswer(question.id, value)}
                >
                  <div className="grid grid-cols-5 gap-2">
                    {OPTIONS.map((opt) => (
                      <div key={opt.value} className="flex flex-col items-center gap-1">
                        <RadioGroupItem value={opt.value} id={`q${question.id}-${opt.value}`} />
                        <Label
                          htmlFor={`q${question.id}-${opt.value}`}
                          className="text-xs text-center cursor-pointer"
                        >
                          {opt.value}
                        </Label>
                        <span className="text-[10px] text-muted-foreground text-center leading-tight">
                          {opt.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            ))}

            <Button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              Submit SUS Score
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl font-bold text-orange-600 mb-2">{score!}</div>
            <p className="text-muted-foreground mb-1">Your SUS Score</p>
            <p className="text-sm text-muted-foreground">
              {score! >= 80
                ? 'Excellent!'
                : score! >= 70
                  ? 'Good'
                  : score! >= 60
                    ? 'OK'
                    : score! >= 50
                      ? 'Poor'
                      : 'Awful'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
