'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function BuyerProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        reset({ name: profile.name ?? '', phone: profile.phone ?? '' })
        setAvatarUrl(profile.avatar_url)
      }
    }
    load()
  }, [supabase, reset])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${userId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload image')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(urlData.publicUrl)
    setUploading(false)
    toast.success('Avatar updated')
  }

  async function onSubmit(values: FormValues) {
    if (!userId) return
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        name: values.name,
        phone: values.phone ?? null,
        avatar_url: avatarUrl,
      })
      .eq('id', userId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile saved')
      router.push('/buyer/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  const initials =
    (useForm<FormValues>().getValues('name') ?? '')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-lg bg-orange-100 text-orange-700">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label
                  htmlFor="avatar"
                  className="cursor-pointer text-sm text-orange-600 hover:underline"
                >
                  {uploading ? 'Uploading…' : 'Change photo'}
                </Label>
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">JPG, PNG · max 2 MB</p>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" placeholder="Ali Hassan" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone number (optional)</Label>
              <Input id="phone" type="tel" placeholder="+92 300 0000000" {...register('phone')} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={loading}
              >
                {loading ? 'Saving…' : 'Save changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/buyer/dashboard')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
