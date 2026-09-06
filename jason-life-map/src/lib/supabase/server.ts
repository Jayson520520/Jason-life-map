import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// Server-side client — reads the session from cookies.
// Use inside Server Components and Route Handlers only.
export function supabaseServer() {
  return createServerComponentClient({ cookies });
}
