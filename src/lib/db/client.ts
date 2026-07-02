import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabaseEnv } from "@/lib/config";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (!hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are missing.");
  }

  if (!adminClient) {
    adminClient = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

export function isDatabaseConfigured() {
  return hasSupabaseEnv();
}
