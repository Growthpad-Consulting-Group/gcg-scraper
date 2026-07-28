import { randomBytes, createHash } from "crypto";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export const SESSION_COOKIE_NAME = "session_token";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("sessions").insert({
    user_id: userId,
    token_hash: hashToken(token),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  return { token, expiresAt };
}

export async function getUserForSessionToken(token: string) {
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("user_id, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!session || new Date(session.expires_at) < new Date()) return null;

  const { data: user } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", session.user_id)
    .maybeSingle();

  return user ?? null;
}

export async function deleteSession(token: string) {
  const supabase = createServerSupabaseClient();
  await supabase.from("sessions").delete().eq("token_hash", hashToken(token));
}
