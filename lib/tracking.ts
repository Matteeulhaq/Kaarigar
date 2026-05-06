import { posthog } from '@/lib/posthog'

export type TestFlow = 'post-job' | 'view-job' | 'submit-bid' | 'accept-bid' | 'complete-job'

export interface StepCompleteProps {
  step: number
  stepName: string
  durationMs: number
  flow: TestFlow
}

export interface ErrorProps {
  step: number
  stepName: string
  errorMessage: string
  flow: TestFlow
}

export function trackStepComplete(props: StepCompleteProps) {
  posthog.capture('test_step_complete', {
    step: props.step,
    step_name: props.stepName,
    duration_ms: props.durationMs,
    flow: props.flow,
    timestamp: Date.now(),
  })
}

export function trackStepError(props: ErrorProps) {
  posthog.capture('test_step_error', {
    step: props.step,
    step_name: props.stepName,
    error_message: props.errorMessage,
    flow: props.flow,
    timestamp: Date.now(),
  })
}

export function trackJobCategorySelected(categoryId: string, categoryName: string) {
  posthog.capture('job_category_selected', {
    category_id: categoryId,
    category_name: categoryName,
    timestamp: Date.now(),
  })
}

export function trackJobDetailsEntered(props: {
  title: string
  hasDescription: boolean
  urgency: string
}) {
  posthog.capture('job_details_entered', {
    title_length: props.title.length,
    has_description: props.hasDescription,
    urgency: props.urgency,
    timestamp: Date.now(),
  })
}

export function trackJobLocationSet(hasLat: boolean, hasAddress: boolean) {
  posthog.capture('job_location_set', {
    has_location: hasLat,
    has_address: hasAddress,
    timestamp: Date.now(),
  })
}

export function trackJobPosted(photoCount: number) {
  posthog.capture('job_posted', {
    photo_count: photoCount,
    timestamp: Date.now(),
  })
}

export function trackBidSubmitted(props: {
  price: number
  etaMinutes: number
  hasMessage: boolean
}) {
  posthog.capture('bid_submitted', {
    price: props.price,
    eta_minutes: props.etaMinutes,
    has_message: props.hasMessage,
    timestamp: Date.now(),
  })
}

export function trackBidError(errorMessage: string) {
  posthog.capture('bid_error', {
    error_message: errorMessage,
    timestamp: Date.now(),
  })
}

export function trackJobAction(action: 'accept_bid' | 'start_job' | 'complete_job') {
  posthog.capture('job_action', {
    action,
    timestamp: Date.now(),
  })
}

export function trackSUSCompleted(score: number) {
  posthog.capture('sus_completed', {
    score,
    timestamp: Date.now(),
  })
}

export function trackResearcherNote(note: string) {
  posthog.capture('researcher_note', {
    note,
    timestamp: Date.now(),
  })
}
