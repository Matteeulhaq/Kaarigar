import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { Profile, ProviderProfile, Review } from '@/lib/supabase/types'

type ReviewRow = Review & {
  reviewer: Pick<Profile, 'id' | 'name' | 'avatar_url'> | null
}

const PAGE_SIZE = 10

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { userId } = await params
  const { page: pageParam } = await searchParams
  const supabase = await createClient()
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  // Fetch profile + provider_profile together
  const [{ data: profile }, { data: pp }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, avatar_url, role, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('provider_profiles')
      .select('bio, skills, avg_rating, completed_jobs, is_verified, portfolio_urls, service_radius_km')
      .eq('user_id', userId)
      .single(),
  ])

  if (!profile || profile.role !== 'provider' || !pp) notFound()

  const providerProfile = pp as Partial<ProviderProfile>

  // Portfolio signed URLs
  const portfolioUrls: string[] = []
  if (providerProfile.portfolio_urls?.length) {
    const { data: signed } = await supabase.storage
      .from('portfolio')
      .createSignedUrls(
        providerProfile.portfolio_urls.map((u) =>
          u.startsWith('http') ? u.split('/portfolio/')[1] : u
        ),
        60 * 60
      )
    if (signed) portfolioUrls.push(...signed.map((s) => s.signedUrl))
  }

  // Paginated reviews
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: reviewData, count } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, name, avatar_url)', {
      count: 'exact',
    })
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)

  const reviews = (reviewData ?? []) as unknown as ReviewRow[]
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const rating = providerProfile.avg_rating ?? 0
  const completedJobs = providerProfile.completed_jobs ?? 0
  const memberYear = new Date(profile.created_at).getFullYear()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl">
                {profile.name?.charAt(0)?.toUpperCase() ?? 'P'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold">{profile.name ?? 'Provider'}</h1>
                {providerProfile.is_verified && (
                  <Badge
                    variant="outline"
                    className="bg-blue-100 text-blue-700 border-blue-200 text-xs"
                  >
                    ✓ Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                {rating > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-400">★</span>
                    <span className="font-medium text-foreground">{rating.toFixed(1)}</span>
                    <span>({count ?? 0} reviews)</span>
                  </span>
                )}
                <span>{completedJobs} jobs done</span>
                <span>Member since {memberYear}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {providerProfile.bio && (
            <p className="text-sm leading-relaxed">{providerProfile.bio}</p>
          )}

          {/* Skills */}
          {providerProfile.skills && providerProfile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {providerProfile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-medium border border-orange-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {providerProfile.service_radius_km && (
            <p className="text-xs text-muted-foreground">
              📍 Services within {providerProfile.service_radius_km} km
            </p>
          )}
        </CardContent>
      </Card>

      {/* Portfolio gallery */}
      {portfolioUrls.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Portfolio
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {portfolioUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt={`Portfolio item ${i + 1}`}
                className="rounded-lg object-cover aspect-square w-full"
              />
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Reviews */}
      <div>
        <h2 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
          Reviews ({count ?? 0})
        </h2>

        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {review.reviewer?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{review.reviewer?.name ?? 'Buyer'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex text-yellow-400 text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < review.rating ? '' : 'text-gray-200'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground pl-11">{review.comment}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {page > 1 && (
              <a
                href={`/profile/${userId}?page=${page - 1}`}
                className="px-3 py-1 rounded border text-sm hover:bg-muted transition-colors"
              >
                ← Prev
              </a>
            )}
            <span className="px-3 py-1 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={`/profile/${userId}?page=${page + 1}`}
                className="px-3 py-1 rounded border text-sm hover:bg-muted transition-colors"
              >
                Next →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
