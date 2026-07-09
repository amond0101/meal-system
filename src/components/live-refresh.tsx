"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Re-renders the current server component page whenever one of the given
// student's application rows changes (e.g. the admin scans their QR and the
// status flips to checked_in) — no manual refresh needed. Pass no studentId
// to react to every application change (admin stats views).
export function LiveRefresh({ studentId }: { studentId?: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`applications-live-${studentId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          ...(studentId ? { filter: `student_id=eq.${studentId}` } : {}),
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, studentId]);

  return null;
}
