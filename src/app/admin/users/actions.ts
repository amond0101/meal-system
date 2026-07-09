"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export async function updateRole(userId: string, formData: FormData) {
  const supabase = await createClient();
  const role = String(formData.get("role")) as Enums<"user_role">;

  // Granting admin requires the shared admin password (set as an env var,
  // never in the repo — the repo is public).
  if (role === "admin") {
    const password = String(formData.get("admin_password") ?? "");
    if (!process.env.ADMIN_ROLE_PASSWORD || password !== process.env.ADMIN_ROLE_PASSWORD) {
      redirect(`/admin/users?error=${encodeURIComponent("관리자 비밀번호가 올바르지 않습니다.")}`);
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  // Refresh the whole layout so the header role label and role-gated nav
  // update immediately instead of waiting for a manual reload.
  revalidatePath("/", "layout");
}
