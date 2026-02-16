import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // In development, allow the full app so you can test everything.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets')
  ) {
    return NextResponse.next();
  }

  // Allow the root and waitlist page
  if (pathname === '/' || pathname === '/waitlist') {
    return NextResponse.next();
  }

  // Everything else in production is redirected to /waitlist
  const url = request.nextUrl.clone();
  url.pathname = '/waitlist';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/:path*',
};
