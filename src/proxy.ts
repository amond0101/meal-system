import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() reads the JWT from cookies with no network round trip (unlike
  // getUser(), which always calls the Auth server). Middleware only uses this
  // for redirect routing, not as the real security boundary — every actual
  // data query is enforced by RLS, and getProfile() calls the fully-validated
  // getUser() again when a page renders.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const isPublicPath =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth/callback");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicPath && !request.nextUrl.pathname.startsWith("/onboarding")) {
    // This profiles lookup exists purely to decide whether to bounce the user
    // to /onboarding — it's not a security boundary (RLS + getProfile() in
    // the page itself handle that). Once we've confirmed a given user doesn't
    // need onboarding, remember it in a cookie keyed to their user id so
    // every subsequent request on every page skips this extra DB round trip
    // instead of re-querying it on every single navigation.
    const onboardedFor = request.cookies.get("ms_onboarded")?.value;

    if (onboardedFor !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("student_no, role")
        .eq("id", user.id)
        .single();

      if (profile && profile.role === "student" && !profile.student_no) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }

      response.cookies.set("ms_onboarded", user.id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
