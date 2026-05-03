'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile } from '@/lib/supabase/types'

interface NavProps {
  profile: Profile
}

export default function Nav({ profile }: NavProps) {
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const dashboardHref =
    profile.role === 'provider' ? '/provider/dashboard' : '/buyer/dashboard'

  const profileHref =
    profile.role === 'provider' ? `/profile/${profile.id}` : '/buyer/dashboard'

  const extraLinks =
    profile.role === 'buyer'
      ? [{ href: '/buyer/jobs/post', label: 'Post a Job' }]
      : [{ href: '/provider/profile/setup', label: 'Edit Profile' }]

  async function handleSignOut() {
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
    router.refresh()
  }

  const initials = profile.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={dashboardHref} className="font-bold text-lg tracking-tight text-orange-600">
          Kaarigar
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-3">
          {extraLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
          <Link href={profileHref}>
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-orange-300 transition-all">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
          <span className="text-sm font-medium">{profile.name}</span>
          <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-gray-100">
            {profile.role}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <Link href={profileHref}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-orange-100 text-orange-700">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
          <button
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((o) => !o)}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t bg-white px-4 py-3 space-y-2">
          <p className="text-xs text-muted-foreground capitalize">{profile.role} · {profile.name}</p>
          <Link href={dashboardHref} className="block text-sm py-1 hover:text-orange-600" onClick={() => setMobileOpen(false)}>
            Dashboard
          </Link>
          {extraLinks.map((l) => (
            <Link key={l.href} href={l.href} className="block text-sm py-1 hover:text-orange-600" onClick={() => setMobileOpen(false)}>
              {l.label}
            </Link>
          ))}
          {profile.role === 'provider' && (
            <Link href={`/profile/${profile.id}`} className="block text-sm py-1 hover:text-orange-600" onClick={() => setMobileOpen(false)}>
              My Public Profile
            </Link>
          )}
          <button onClick={handleSignOut} className="block text-sm py-1 text-red-500 hover:text-red-700 w-full text-left">
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}

