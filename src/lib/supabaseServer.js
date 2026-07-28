// lib/supabaseServer.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export const supabaseServer = typeof window === "undefined"
  ? (() => {
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase URL or Service Key is missing in environment variables");
      }
      return createClient(supabaseUrl, supabaseServiceKey);
    })()
  : null;

if (supabaseServer) {
  console.log("Supabase server client initialized successfully");
} else {
  console.warn("Supabase server client not available; likely running on client-side");
}