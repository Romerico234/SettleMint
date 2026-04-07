import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseURL } from "../api/config";

export const isSupabaseConfigured = Boolean(supabaseURL && supabasePublishableKey);

export const supabase = createClient(supabaseURL || "https://placeholder.supabase.co", supabasePublishableKey || "sb_publishable_placeholder", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
