"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSupabaseUser } from "@/lib/supabase/useSession";

const PUBLIC_PATHS = ["/login"];

// Wraps every page. Sends anyone without a real session to /login, and
// sends anyone already logged in away from /login. Renders nothing while
// that decision is being made so there's never a flash of the wrong page.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabaseUser();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPath) {
      router.replace("/login");
    } else if (user && isPublicPath) {
      router.replace("/customers");
    }
  }, [user, loading, isPublicPath, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5">
        <p className="text-sm text-muted">載入中...</p>
      </main>
    );
  }

  if (!user && !isPublicPath) return null;
  if (user && isPublicPath) return null;

  return <>{children}</>;
}
