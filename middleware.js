import { NextResponse } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - admin (admin dashboard)
     * - logo192.png (logo)
     * - manifest.json (manifest file)
     * - icons/external-link.svg (icon)
     * - robots.txt (robots file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|admin|logo192.png|manifest.json|icons/external-link.svg|robots.txt).*)',
  ],
}

export function middleware(request, event) {
  const { nextUrl, geo } = request;

  // Get IP address from headers
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;

  // Get User Agent from headers
  const userAgent = request.headers.get('user-agent') ?? null;

  // Construct the event object
  const eventPayload = {
    pathname: nextUrl.pathname,
    search: nextUrl.search,
    timestamp: new Date(),
    ip: ip, // Pass the raw IP to the API route
    userAgent: userAgent,
    geo: {
      city: geo?.city,
      country: geo?.country,
      region: geo?.region,
    },
  };

  // Send the event to the API route
  // We use `http` instead of `https` for internal API calls to avoid SSL issues in Amplify
  const url = new URL('/api/analytics', `http://${request.nextUrl.host}`);
  
  // Use event.waitUntil to send the request without blocking the response
  event.waitUntil(
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    })
  );

  return NextResponse.next();
}
