import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { mutate } from "@/lib/store";
import { validatePassword, validateUsername } from "@/lib/validate";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as Record<string, unknown>;

  const usernameResult = validateUsername(username);
  if (typeof usernameResult !== "string")
    return NextResponse.json({ error: usernameResult.error }, { status: 400 });

  const passwordResult = validatePassword(password);
  if (typeof passwordResult !== "string")
    return NextResponse.json({ error: passwordResult.error }, { status: 400 });

  const { salt, passwordHash } = hashPassword(passwordResult);

  const created = await mutate((store) => {
    const exists = store.users.some(
      (u) => u.username.toLowerCase() === usernameResult.toLowerCase(),
    );
    if (exists) return null;

    const user: User = {
      id: randomUUID(),
      username: usernameResult,
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    return { id: user.id, username: user.username };
  });

  if (!created)
    return NextResponse.json(
      { error: "That username is already taken." },
      { status: 409 },
    );

  await setSessionCookie(created);
  return NextResponse.json({ user: created });
}
