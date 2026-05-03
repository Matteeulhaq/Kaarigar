'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import type { Urgency } from '@/lib/supabase/types'

// ─── Types ───────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  icon: string
  description: string | null
}

interface FormState {
  categoryId: string
  categoryName: string
  title: string
  description: string
  urgency: Urgency
  lat: number | null
  lng: number | null
  address: string
  photos: File[]
}

// ─── Step indicator ──────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            i < current ? 'bg-orange-600' : i === current ? 'bg-orange-300' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Step 1: Category picker ─────────────────────────────────
function StepCategory({
  categories,
  selected,
  onSelect,
  onNext,
}: {
  categories: Category[]
  selected: string
  onSelect: (id: string, name: string) => void
  onNext: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">What do you need help with?</h2>
        <p className="text-sm text-muted-foreground">Pick the category that best fits your job</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id, cat.name)}
            className={`rounded-xl border-2 p-3 text-left transition-colors ${
              selected === cat.id
                ? 'border-orange-500 bg-orange-50'
                : 'border-border hover:border-orange-200'
            }`}
          >
            <div className="text-2xl mb-1">{cat.icon}</div>
            <div className="text-sm font-medium">{cat.name}</div>
            {cat.description && (
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {cat.description}
              </div>
            )}
          </button>
        ))}
      </div>
      <Button
        className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
        disabled={!selected}
        onClick={onNext}
      >
        Next →
      </Button>
    </div>
  )
}

// ─── Step 2: Title, description, urgency ─────────────────────
const URGENCY_OPTIONS: { value: Urgency; label: string; desc: string; color: string }[] = [
  { value: 'low', label: 'Low', desc: 'Flexible — within a few days', color: 'border-green-400 bg-green-50' },
  { value: 'medium', label: 'Medium', desc: 'Soon — within 24 hours', color: 'border-yellow-400 bg-yellow-50' },
  { value: 'high', label: 'High', desc: 'Urgent — as soon as possible', color: 'border-red-400 bg-red-50' },
]

function StepDetails({
  form,
  onChange,
  onNext,
  onBack,
}: {
  form: FormState
  onChange: (key: keyof FormState, value: string | Urgency) => void
  onNext: () => void
  onBack: () => void
}) {
  const valid = form.title.trim().length >= 5

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Describe the job</h2>
        <p className="text-sm text-muted-foreground">
          Category: <span className="font-medium">{form.categoryName}</span>
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="title">Job title *</Label>
        <Input
          id="title"
          placeholder="e.g. Fix kitchen sink leak"
          value={form.title}
          maxLength={100}
          onChange={(e) => onChange('title', e.target.value)}
        />
        {form.title.length > 0 && form.title.trim().length < 5 && (
          <p className="text-xs text-destructive">At least 5 characters required</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">
          Description <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Describe what needs to be done, any access details, materials needed…"
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={4}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground text-right">{form.description.length}/1000</p>
      </div>

      <div className="space-y-2">
        <Label>Urgency *</Label>
        <div className="grid grid-cols-3 gap-3">
          {URGENCY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('urgency', opt.value)}
              className={`rounded-xl border-2 p-3 text-left transition-colors ${
                form.urgency === opt.value ? opt.color + ' border-opacity-100' : 'border-border hover:border-muted-foreground'
              }`}
            >
              <div className="text-sm font-semibold">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          disabled={!valid}
          onClick={onNext}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3: Location ─────────────────────────────────────────
function StepLocation({
  form,
  onChange,
  onNext,
  onBack,
}: {
  form: FormState
  onChange: (key: keyof FormState, value: string | number | null) => void
  onNext: () => void
  onBack: () => void
}) {
  const [detecting, setDetecting] = useState(false)

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser')
      return
    }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6))
        const lng = parseFloat(pos.coords.longitude.toFixed(6))
        onChange('lat', lat)
        onChange('lng', lng)

        // Reverse geocode with Nominatim (no API key needed)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          )
          const data = await res.json()
          if (data?.display_name) {
            onChange('address', data.display_name)
          }
        } catch {
          // Geocoding failed; lat/lng still saved
        }
        setDetecting(false)
        toast.success('Location detected!')
      },
      () => {
        toast.error('Could not get your location. Grant permission or enter manually.')
        setDetecting(false)
      }
    )
  }, [onChange])

  const valid = form.lat !== null && form.lng !== null

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Where is the job?</h2>
        <p className="text-sm text-muted-foreground">Providers near you will be notified</p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={detect}
        disabled={detecting}
        className="w-full sm:w-auto"
      >
        {detecting ? '📍 Detecting…' : '📍 Use my current location'}
      </Button>

      {form.lat !== null && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          ✓ Location set ({form.lat.toFixed(4)}, {form.lng!.toFixed(4)})
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="address">Address / landmark</Label>
        <Input
          id="address"
          placeholder="House 12, Street 4, G-10 Islamabad"
          value={form.address}
          onChange={(e) => onChange('address', e.target.value)}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          Auto-filled when you detect your location; edit if needed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            type="number"
            step="any"
            placeholder="33.7215"
            value={form.lat ?? ''}
            onChange={(e) =>
              onChange('lat', e.target.value === '' ? null : parseFloat(e.target.value))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            type="number"
            step="any"
            placeholder="73.0433"
            value={form.lng ?? ''}
            onChange={(e) =>
              onChange('lng', e.target.value === '' ? null : parseFloat(e.target.value))
            }
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>← Back</Button>
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          disabled={!valid}
          onClick={onNext}
        >
          Next →
        </Button>
      </div>
    </div>
  )
}

// ─── Step 4: Photos + submit ──────────────────────────────────
function StepPhotos({
  form,
  onPhotosChange,
  onBack,
  onSubmit,
  submitting,
}: {
  form: FormState
  onPhotosChange: (files: File[]) => void
  onBack: () => void
  onSubmit: () => void
  submitting: boolean
}) {
  const [previews, setPreviews] = useState<string[]>([])

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024)
    const oversized = files.length - valid.length
    if (oversized > 0) toast.error(`${oversized} file(s) over 5 MB were removed`)
    onPhotosChange(valid)
    setPreviews(valid.map((f) => URL.createObjectURL(f)))
  }

  function removePhoto(idx: number) {
    const updated = form.photos.filter((_, i) => i !== idx)
    onPhotosChange(updated)
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Add photos (optional)</h2>
        <p className="text-sm text-muted-foreground">
          Help providers understand the job better
        </p>
      </div>

      {/* Review summary */}
      <Card>
        <CardContent className="pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span className="font-medium">{form.categoryName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Title</span>
            <span className="font-medium">{form.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Urgency</span>
            <span className="font-medium capitalize">{form.urgency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium truncate max-w-[180px] text-right">
              {form.address || `${form.lat?.toFixed(4)}, ${form.lng?.toFixed(4)}`}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label htmlFor="photos">Upload photos</Label>
        <Input
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
        />
        <p className="text-xs text-muted-foreground">Max 5 MB per photo.</p>
      </div>

      {previews.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Preview ${i + 1}`}
                className="h-24 w-24 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -top-1.5 -right-1.5 bg-white rounded-full border w-5 h-5 text-xs flex items-center justify-center hover:bg-red-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          ← Back
        </Button>
        <Button
          className="bg-orange-600 hover:bg-orange-700"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? 'Posting…' : 'Post Job'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main page component ──────────────────────────────────────
interface PostJobPageProps {
  categories: Category[]
}

function PostJobForm({ categories }: PostJobPageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState<FormState>({
    categoryId: '',
    categoryName: '',
    title: '',
    description: '',
    urgency: 'medium',
    lat: null,
    lng: null,
    address: '',
    photos: [],
  })

  function update(key: keyof FormState, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function uploadPhotos(jobId: string): Promise<string[]> {
    const urls: string[] = []
    for (const file of form.photos) {
      const ext = file.name.split('.').pop()
      const path = `jobs/${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('job-photos').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('job-photos').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return urls
  }

  async function handleSubmit() {
    setSubmitting(true)

    // Validate all required fields
    if (!form.categoryId) {
      toast.error('Please select a category')
      setSubmitting(false)
      return
    }
    if (!form.title.trim()) {
      toast.error('Please enter a job title')
      setSubmitting(false)
      return
    }
    if (form.lat === null || form.lng === null) {
      toast.error('Please set your job location')
      setSubmitting(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('You must be logged in')
      setSubmitting(false)
      return
    }

    // Insert the job first (without photos)
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        buyer_id: user.id,
        category_id: form.categoryId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        urgency: form.urgency,
        lat: form.lat,
        lng: form.lng,
        address: form.address.trim() || null,
        photo_urls: [],
      })
      .select('id')
      .single()

    if (error || !job) {
      console.error('Job insert error:', error)
      toast.error(error?.message || 'Failed to post job. Please try again.')
      setSubmitting(false)
      return
    }

    // Upload photos and attach URLs
    if (form.photos.length > 0) {
      const photoUrls = await uploadPhotos(job.id)
      if (photoUrls.length > 0) {
        await supabase
          .from('jobs')
          .update({ photo_urls: photoUrls })
          .eq('id', job.id)
      }
    }

    toast.success('Job posted! Nearby providers will be notified.')
    router.push(`/buyer/jobs/${job.id}`)
    router.refresh()
  }

  const TOTAL_STEPS = 4

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Post a Job</h1>
        <p className="text-sm text-muted-foreground">Step {step + 1} of {TOTAL_STEPS}</p>
      </div>

      <StepBar current={step} total={TOTAL_STEPS} />

      {step === 0 && (
        <StepCategory
          categories={categories}
          selected={form.categoryId}
          onSelect={(id, name) => {
            update('categoryId', id)
            update('categoryName', name)
          }}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <StepDetails
          form={form}
          onChange={(key, value) => update(key, value)}
          onNext={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <StepLocation
          form={form}
          onChange={(key, value) => update(key, value)}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <StepPhotos
          form={form}
          onPhotosChange={(files) => update('photos', files)}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  )
}

// ─── Server-side data fetching wrapper ────────────────────────
// We can't make the main component async (it's a client component),
// so we export a thin server-rendered page that passes categories as props.
// The actual async fetch is done in a separate server component below.
export { PostJobForm }
export type { Category }
