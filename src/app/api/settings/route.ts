import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { getAppSettings, setAppSetting, APP_SETTINGS_DEFAULTS, type AppSettingKey } from "@/shared/lib/appSettings";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const settings = await getAppSettings(supabase);
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const updates = body?.settings;
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "settings object is required" }, { status: 400 });
  }

  const keys = Object.keys(updates) as AppSettingKey[];
  const unknownKeys = keys.filter((k) => !(k in APP_SETTINGS_DEFAULTS));
  if (unknownKeys.length > 0) {
    return NextResponse.json({ error: `Unknown setting(s): ${unknownKeys.join(", ")}` }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  try {
    await Promise.all(keys.map((key) => setAppSetting(supabase, key, updates[key])));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const settings = await getAppSettings(supabase);
  return NextResponse.json({ settings });
}
