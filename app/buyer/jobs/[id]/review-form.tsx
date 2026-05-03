'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { submitReview } from '@/app/actions/submit-review'

interface Props {
  jobId: string
  revieweeId: string
  revieweeName: string | null
}

export default function ReviewForm({ jobId, revieweeId, revieweeName }: Props) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (rating === 0) {
      toast.error('Please select a star rating')
      return
    }
    startTransition(async () => {
      const result = await submitReview(jobId, revieweeId, rating, comment)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Review submitted — thank you!')
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-5 text-center space-y-1">
          <p className="text-2xl">⭐</p>
          <p className="text-green-700 font-semibold">Review submitted!</p>
          <p className="text-sm text-muted-foreground">
            Your feedback helps providers build their reputation.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Rate {revieweeName ?? 'the provider'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star picker */}
        <div
          className="flex gap-1"
          onMouseLeave={() => setHovered(0)}
          role="radiogroup"
          aria-label="Rating"
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              aria-checked={rating === star}
              className="text-3xl transition-transform hover:scale-110 focus:outline-none"
              onMouseEnter={() => setHovered(star)}
              onClick={() => setRating(star)}
            >
              <span
                className={
                  star <= (hovered || rating)
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }
              >
                ★
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground h-4">
          {hovered > 0
            ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][hovered]
            : rating > 0
            ? ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]
            : 'Tap a star to rate'}
        </p>

        {/* Comment */}
        <Textarea
          placeholder="Leave a comment (optional)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          className="resize-none"
        />

        <Button
          className="w-full bg-orange-600 hover:bg-orange-700"
          disabled={isPending || rating === 0}
          onClick={handleSubmit}
        >
          {isPending ? 'Submitting…' : 'Submit Review'}
        </Button>
      </CardContent>
    </Card>
  )
}
