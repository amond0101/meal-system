import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_DOMAIN = "@bmt.hs.kr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // hd= is only a UI hint to Google's account picker and can be bypassed,
  // so the actual security boundary is this server-side domain check.
  if (!user?.email?.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    await supabase.auth.signOut();
    if (user) {
      const admin = createAdminClient();
      await admin.auth.admin.deleteUser(user.id);
    }
    return NextResponse.redirect(`${origin}/login?error=domain`);
  }

  return NextResponse.redirect(`${origin}/`);
}
