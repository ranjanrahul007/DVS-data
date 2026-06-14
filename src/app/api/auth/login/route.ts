import { NextResponse } from "next/server";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string")
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );

  const store = await readStore();
  const user = store.users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
  );

  // Generic error so we never reveal whether a username exists.
  if (!user || !verifyPassword(password, user))
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );

  const publicUser = { id: user.id, username: user.username };
  await setSessionCookie(publicUser);
  return NextResponse.json({ user: publicUser });
}
