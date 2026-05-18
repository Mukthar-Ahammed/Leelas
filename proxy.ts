import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { NextRequest } from "next/server";

function isUserRoute(pathname: string): boolean {
  return pathname.startsWith("/checkout") || pathname.startsWith("/account");
}

function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export default auth(function middleware(req) {
  const { pathname } = (req as unknown as NextRequest).nextUrl;
  const session = req.auth;
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (isAdminRoute(pathname)) {
    if (!session?.user || role !== "ADMIN") {
      const url = new URL("/auth/login", (req as unknown as NextRequest).url);
      url.searchParams.set("callbackUrl", pathname);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  if (isUserRoute(pathname)) {
    if (!session?.user) {
      const url = new URL("/auth/login", (req as unknown as NextRequest).url);
      url.searchParams.set("callbackUrl", pathname);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  return addSecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
