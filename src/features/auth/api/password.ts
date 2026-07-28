import bcrypt from "bcryptjs";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";

export async function verifyPassword(email: string, password: string) {
  const supabase = createServerSupabaseClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (!user?.password_hash) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  return valid ? (user.id as number) : null;
}
