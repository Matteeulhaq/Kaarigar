'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const SKILL_OPTIONS = [
  'Plumbing', 'Electrical', 'Carpentry', 'AC & Cooling', 'Painting',
  'Tiling & Masonry', 'Renovation', 'Appliance Repair', 'Cleaning', 'Mechanic',
  'Welding', 'Roofing', 'Solar Installation', 'CCTV / Security', 'Gas Works',
]

export default function ProviderProfileSetup() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [skills, setSkills] = useState<string[]>([])
  const [bio, setBio] = useState('')
  const [radiusKm, setRadiusKm] = useState(10)
  const [lat, setLat] = useState<number | ''>('')
  const [lng, setLng] = useState<number | ''>('')
  const [portfolioFiles, setPortfolioFiles] = useState<FileList | null>(null)
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([])
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: pp } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (pp) {
        setSkills(pp.skills ?? [])
        setBio(pp.bio ?? '')
        setRadiusKm(pp.service_radius_km ?? 10)
        if (pp.lat) setLat(pp.lat)
        if (pp.lng) setLng(pp.lng)
        setPortfolioUrls(pp.portfolio_urls ?? [])
      }
      setFetching(false)
    }
    load()
  }, [supabase])

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(parseFloat(pos.coords.latitude.toFixed(6)))
        setLng(parseFloat(pos.coords.longitude.toFixed(6)))
        setLocating(false)
        toast.success('Location detected!')
      },
      () => {
        toast.error('Could not detect location. Enter coordinates manually.')
        setLocating(false)
      }
    )
  }, [])

  async function uploadPortfolio(): Promise<string[]> {
    if (!portfolioFiles || !userId) return portfolioUrls

    const uploaded: string[] = [...portfolioUrls]
    for (const file of Array.from(portfolioFiles)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5 MB, skipping`)
        continue
      }
      const ext = file.name.split('.').pop()
      const path = `portfolio/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('portfolio').upload(path, file)
      if (!error) {
        const { data } = supabase.storage.from('portfolio').getPublicUrl(path)
        uploaded.push(data.publicUrl)
      }
    }
    return uploaded
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    if (skills.length === 0) {
      toast.error('Please select at least one skill')
      return
    }

    setLoading(true)

    const finalUrls = await uploadPortfolio()

    const payload = {
      user_id: userId,
      skills,
      bio: bio || null,
      service_radius_km: radiusKm,
      lat: lat !== '' ? lat : null,
      lng: lng !== '' ? lng : null,
      portfolio_urls: finalUrls,
    }

    const { error } = await supabase
      .from('provider_profiles')
      .upsert(payload, { onConflict: 'user_id' })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile saved!')
      router.push('/provider/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        {portfolioUrls.length > 0 || skills.length > 0 ? 'Edit Profile' : 'Set up your profile'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full px-3 py-1 text-sm border transition-colors ${
                    skills.includes(skill)
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'border-border hover:border-orange-400 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
            {skills.length === 0 && (
              <p className="text-xs text-destructive mt-2">Select at least one skill</p>
            )}
          </CardContent>
        </Card>

        {/* Bio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About You</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="bio">Short bio (optional)</Label>
            <Textarea
              id="bio"
              placeholder="10+ years experience in residential plumbing and pipe fitting…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={400}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/400</p>
          </CardContent>
        </Card>

        {/* Location & Radius */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={detectLocation}
                disabled={locating}
                className="w-fit"
              >
                {locating ? '📍 Detecting…' : '📍 Use my current location'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Or enter coordinates manually below:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    placeholder="33.7215"
                    value={lat}
                    onChange={(e) => setLat(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    placeholder="73.0433"
                    value={lng}
                    onChange={(e) => setLng(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">
                Service radius: <span className="font-semibold text-orange-600">{radiusKm} km</span>
              </Label>
              <input
                id="radius"
                type="range"
                min={1}
                max={50}
                step={1}
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                className="w-full accent-orange-600"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Portfolio Photos (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {portfolioUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {portfolioUrls.map((url, i) => (
                  <div key={i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Portfolio ${i + 1}`}
                      className="h-20 w-20 object-cover rounded-md border"
                      onError={(e) => {
                        // Remove from state if image fails to load
                        setPortfolioUrls((prev) => prev.filter((_, idx) => idx !== i))
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setPortfolioUrls((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-white rounded-full text-xs border w-5 h-5 flex items-center justify-center hover:bg-red-50"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPortfolioFiles(e.target.files)}
            />
            <p className="text-xs text-muted-foreground">
              Upload photos of your past work. Max 5 MB per image.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-8">
          <Button
            type="submit"
            className="bg-orange-600 hover:bg-orange-700"
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save profile'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/provider/dashboard')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
