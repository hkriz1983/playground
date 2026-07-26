import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the mock playground auth cookie
  const authCookie = request.cookies.get('playground_auth');

  // If unauthenticated and trying to access a protected route, redirect to login
  if (!authCookie && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const response = NextResponse.next();
  
  if (authCookie) {
    response.headers.set('x-user-id', authCookie.value);
  }
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
