"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function claimRosterEntry(formData: FormData) {
  const supabase = await createClient();
  const student_no = String(formData.get("student_no")).trim();

  const { error } = await supabase.rpc("claim_roster_entry", { p_student_no: student_no });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
