import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to setup and login pages
  if (pathname === "/setup" || pathname === "/login") {
    return NextResponse.next();
  }

  // For now, allow all other routes
  // Authentication will be handled in the admin layout
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/setup", "/login"],
};
