import { randomBytes } from "crypto";
import nodemailer from "nodemailer";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Reuses the existing `magic_tokens` table (email, token, expires_at — no id/user_id/used_at
// columns), same as the Python backend used. Tokens are one-time-use by deleting the row
// on consumption.
export async function issueMagicLink(email: string) {
  const supabase = createServerSupabaseClient();

  await supabase.from("magic_tokens").delete().eq("email", email);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  const { error } = await supabase
    .from("magic_tokens")
    .insert({ email, token, expires_at: expiresAt.toISOString() });
  if (error) throw error;

  await sendMagicLinkEmail(email, token);
}

export async function consumeMagicLink(token: string, email: string) {
  const supabase = createServerSupabaseClient();

  const { data: link } = await supabase
    .from("magic_tokens")
    .select("email, expires_at")
    .eq("email", email)
    .eq("token", token)
    .maybeSingle();

  if (!link || new Date(link.expires_at) < new Date()) return null;

  await supabase.from("magic_tokens").delete().eq("email", email).eq("token", token);

  let { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!user) {
    const { data: created, error } = await supabase
      .from("users")
      .insert({ email, name: email.split("@")[0] })
      .select("id")
      .single();
    if (error) throw error;
    user = created;
  }

  return user.id as number;
}

async function sendMagicLinkEmail(email: string, token: string) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify?token=${token}&email=${encodeURIComponent(
    email
  )}`;

  await transport.sendMail({
    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    to: email,
    subject: "Your sign-in link",
    html: `<p>Click to sign in: <a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 15 minutes.</p>`,
  });
}
