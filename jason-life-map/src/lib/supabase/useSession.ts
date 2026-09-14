"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "./client";

// Phase 2: real login UI is deferred. Every visitor gets a silent
// anonymous Supabase Auth session so Row Level Security still works
// (each anonymous user only ever sees their own customers).
// Requires "Anonymous sign-ins" to be enabled in Supabase Auth settings.
export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      let currentUser = session?.user ?? null;

      if (!currentUser) {
        const { data, error } = await supabaseBrowser.auth.signInAnonymously();
        if (error) {
          if (mounted) setError(error.message);
        } else {
          currentUser = data.user;
        }
      }

      if (mounted) {
        setUser(currentUser);
        setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  return { user, loading, error };
}
