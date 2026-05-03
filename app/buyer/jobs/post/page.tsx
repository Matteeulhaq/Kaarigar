import { createClient } from '@/lib/supabase/server'
import { PostJobForm } from './post-job-form'

export default async function PostJobPage() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, description')
    .order('name')

  return <PostJobForm categories={categories ?? []} />
}
