const fallbackApiBaseURL = "http://localhost:8080";

export const apiBaseURL = import.meta.env.VITE_API_BASE_URL || fallbackApiBaseURL;
export const supabaseURL = import.meta.env.VITE_SUPABASE_URL || "";
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
