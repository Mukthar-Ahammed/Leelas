import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { verifyToken } from "@/lib/token";
import { auth } from "@/lib/auth";

// ─── Response helpers ────────────────────────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// ─── Auth guards ─────────────────────────────────────────────────────────────

export function getRole(session: Session | null): string | undefined {
  return (session?.user as { role?: string } | undefined)?.role;
}

export function assertAdmin(
  session: Session | null
): { adminId: string } | NextResponse {
  const id = session?.user?.id;
  if (!id || getRole(session) !== "ADMIN") {
    return apiError("UNAUTHORIZED", "Admin access required.", 403);
  }
  return { adminId: id };
}

/** Type guard: narrows the result of assertAdmin / assertCustomer */
export function isAuthError(
  v: { adminId: string } | { userId: string; role: string } | NextResponse
): v is NextResponse {
  return v instanceof NextResponse;
}

// ─── Customer auth (Bearer token OR NextAuth session) ────────────────────────

export async function assertCustomer(
  req: NextRequest
): Promise<{ userId: string; role: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (bearer) {
    const payload = verifyToken(bearer);
    if (!payload) return apiError("UNAUTHORIZED", "Invalid or expired token.", 401);
    return { userId: payload.sub, role: payload.role };
  }

  // Fall back to NextAuth session (keeps admin panel working)
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, role: (session.user as { role?: string }).role ?? "USER" };
  }

  return apiError("UNAUTHORIZED", "Login required.", 401);
}
