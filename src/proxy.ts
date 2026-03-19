import { NextRequest, NextResponse } from 'next/server';

// 1. Define which routes are protected
const protectedPrefixes = ['/dashboard'];

// 2. Define auth-related pages that logged-in users shouldn't see
const authPages = ['/login', '/register', '/signup'];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Helper: check if current path starts with any protected prefix
    const isProtected = protectedPrefixes.some((prefix) =>
        pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    // Helper: check if current path is an auth page
    const isAuthPage = authPages.includes(pathname);

    // Get session/token — choose ONE method depending on your auth setup

    // ────────────────────────────────────────────────
    // OPTION A: Simple cookie-based (most common for custom JWT/auth)
    // ────────────────────────────────────────────────
    const sessionToken = request.cookies.get('auth_token')?.value;   // ← change name if needed
    const isLoggedIn = !!sessionToken;   // basic check — in real app → verify JWT signature!

    // ────────────────────────────────────────────────
    // Logic
    // ────────────────────────────────────────────────

    // Case 1: Trying to access protected route → but not logged in
    if (isProtected && !isLoggedIn) {
        // Optional: save where they wanted to go (great UX)
        const url = new URL('/login', request.url);
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    // Case 2: Already logged in → trying to visit login/register page
    if (isLoggedIn && isAuthPage) {
        // Optional: if there's a ?redirect= param, go there instead
        const redirectTo = request.nextUrl.searchParams.get('redirect');
        const destination = redirectTo && redirectTo.startsWith('/')
            ? redirectTo
            : '/dashboard';

        return NextResponse.redirect(new URL(destination, request.url));
    }

    // Otherwise → continue normally
    return NextResponse.next();
}

// Important: only run middleware on relevant paths
// (improves performance — don't run on static files, api, _next, etc.)
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico
         * - public files (public/)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
};