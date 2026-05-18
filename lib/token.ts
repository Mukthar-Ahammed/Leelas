import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "changeme";

type Payload = { sub: string; role: string; exp: number };

export function signToken(userId: string, role: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, role, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): Payload | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url")))
      return null;
  } catch {
    return null;
  }
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Payload;
  if (data.exp < Date.now()) return null;
  return data;
}
