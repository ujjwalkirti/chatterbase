import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnAuthPage =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/guest-login") ||
    req.nextUrl.pathname.startsWith("/permanent-login")
  const isOnProtectedRoute =
    req.nextUrl.pathname.startsWith("/available-chatrooms") ||
    req.nextUrl.pathname.startsWith("/chatrooms") ||
    req.nextUrl.pathname.startsWith("/chat") ||
    req.nextUrl.pathname.startsWith("/profile")

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isOnAuthPage) {
    return NextResponse.redirect(new URL("/available-chatrooms", req.nextUrl))
  }

  // Redirect non-logged-in users to guest-login page
  if (!isLoggedIn && isOnProtectedRoute) {
    return NextResponse.redirect(new URL("/guest-login", req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
