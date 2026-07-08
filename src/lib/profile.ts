import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;

// Both the root layout (SiteHeader) and every page call this per request —
// cache() dedupes it to a single auth check + profiles query per render.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
});

export function isStaff(profile: Profile | null) {
  return profile?.role === "staff" || profile?.role === "admin";
}

export function isAdmin(profile: Profile | null) {
  return profile?.role === "admin";
}
