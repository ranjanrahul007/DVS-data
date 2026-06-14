import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import type { PublicUser, User } from "./types";

/**
 * Authentication primitives: password hashing, signed session tokens, and a
 * helper to read the current user from the request cookie. No external
 * dependencies — everything is built on Node's `crypto`.
 */

export const SESSION_COOKIE = "dvs_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length > 0) return secret;
  // Dev fallback. In production, set SESSION_SECRET to a long random string.
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] SESSION_SECRET is not set — using an insecure fallback. " +
        "Set SESSION_SECRET in the environment for production.",
    );
  }
  return "dvs-dev-insecure-secret-change-me";
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

export function hashPassword(password: string): { salt: string; passwordHash: string } {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  return { salt, passwordHash };
}

export function verifyPassword(password: string, user: User): boolean {
  const candidate = scryptSync(password, user.salt, 64);
  const expected = Buffer.from(user.passwordHash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// ---------------------------------------------------------------------------
// Session tokens (payload.signature, both base64url)
// ---------------------------------------------------------------------------

interface SessionPayload {
  uid: string;
  username: string;
  exp: number; // unix seconds
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", sessionSecret()).update(data).digest("base64url");
}

export function createSessionToken(user: PublicUser): string {
  const payload: SessionPayload = {
    uid: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | undefined): PublicUser | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.uid, username: payload.username };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie helpers (used inside Route Handlers)
// ---------------------------------------------------------------------------

export async function getCurrentUser(): Promise<PublicUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(user: PublicUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
