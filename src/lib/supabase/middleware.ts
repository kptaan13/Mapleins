import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const waitlistOnly = process.env.WAITLIST_ONLY === "true";

  // When waitlist-only: only these pages are reachable (no login, signup, blog, etc.)
  const waitlistPublicPaths = ["/", "/waitlist", "/about", "/donate", "/contact"];
  const fullPublicPaths = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/about",
    "/blog",
    "/contact",
    "/donate",
    "/privacy",
    "/terms",
    "/cookies",
    "/waitlist",
  ];
  const publicPaths = waitlistOnly ? waitlistPublicPaths : fullPublicPaths;
  const isPublic = publicPaths.includes(pathname) || pathname.startsWith("/api");

  // In waitlist-only mode (typically production), redirect all non-public routes to /waitlist
  if (waitlistOnly && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protect /admin: only allow users whose email matches ADMIN_EMAIL
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || user.email !== adminEmail) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
