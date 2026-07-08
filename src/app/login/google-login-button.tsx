"use client";

import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: "bmt.hs.kr",
          prompt: "select_account",
        },
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
      className="flex w-full items-center justify-center gap-2 rounded-sm bg-steel px-3 py-2.5 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-steel-dark"
    >
      Google 계정으로 로그인
    </button>
  );
}
