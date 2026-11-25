import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Same project and anon key as the Flutter app
 * (env.json there); RLS and triggers protect the data, so the anon key is
 * safe to ship. Never put the service_role key here.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured =
  url.startsWith("https://") &&
  !url.includes("YOUR-PROJECT-ID") &&
  anonKey.length > 0 &&
  !anonKey.startsWith("paste-");

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder", {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export const appVersion = "1.0.0";
/** TODO: real address (also in the Flutter app's config.dart). */
export const supportEmail = "support@livrcheck.example";
