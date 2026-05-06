import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/shared/nav'
import type { Profile } from '@/lib/supabase/types'

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile query fails, redirect to login
  if (profileError || !profile) {
    redirect('/login')
  }

  // Profile exists, safe to pass to Nav
  return (
    <div className="min-h-screen flex flex-col">
      <Nav profile={profile as Profile} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
