import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Nav from '@/components/shared/nav'
import type { Profile } from '@/lib/supabase/types'

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Role checking is handled by middleware - trust that user has correct role here
  return (
    <div className="min-h-screen flex flex-col">
      <Nav profile={profile as Profile} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
