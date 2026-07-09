"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Defense in depth on shared devices: proxy.ts sets this to skip its
  // onboarding-check query for a known user id, so drop it on sign-out
  // rather than leaving it around for whoever logs in next.
  (await cookies()).delete("ms_onboarded");

  revalidatePath("/", "layout");
  redirect("/login");
}
