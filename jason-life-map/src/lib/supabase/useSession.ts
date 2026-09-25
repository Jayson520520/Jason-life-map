"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "./client";

// Real login: this reads whatever session Supabase already has (from a
// previous signInWithPassword call) and keeps listening for sign-in /
// sign-out events. It no longer creates a silent anonymous session — if
// there is no session, `user` stays null and AuthGate sends the visitor
// to /login.
export function useSupabaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session },
        error,
      } = await supabaseBrowser.auth.getSession();

      if (mounted) {
        if (error) setError(error.message);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }

    init();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading, error };
}
