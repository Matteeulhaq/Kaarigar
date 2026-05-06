import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require a specific role
const BUYER_ROUTES = ['/buyer']
const PROVIDER_ROUTES = ['/provider']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users away from protected routes
  const isProtected =
    BUYER_ROUTES.some((r) => pathname.startsWith(r)) ||
    PROVIDER_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/jobs')

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Role-based protection: fetch profile role only when user is logged in
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Don't redirect if role is not found — let the page handle it
    if (!role) return supabaseResponse

    const isBuyerRoute = BUYER_ROUTES.some((r) => pathname.startsWith(r))
    const isProviderRoute = PROVIDER_ROUTES.some((r) => pathname.startsWith(r))

    if (isBuyerRoute && role !== 'buyer') {
      return NextResponse.redirect(new URL('/provider/dashboard', request.url))
    }
    if (isProviderRoute && role !== 'provider') {
      return NextResponse.redirect(new URL('/buyer/dashboard', request.url))
    }
  }

  // Redirect already-authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Default to buyer dashboard if role is not found yet
    const destination =
      profile?.role === 'provider' ? '/provider/dashboard' : '/buyer/dashboard'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // Allow the auth callback route through without any checks
  if (pathname.startsWith('/auth/callback')) {
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
