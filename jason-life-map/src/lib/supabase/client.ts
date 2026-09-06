import { createClient } from "@supabase/supabase-js";

// Public (anon) client for use in Client Components.
// Never put the service-role key here — anon key only.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);
