import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";

if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing Supabase credentials in environment. Supabase client will not work correctly.",
  );
}

export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

