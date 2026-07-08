"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export async function updateRole(userId: string, formData: FormData) {
  const supabase = await createClient();
  const role = String(formData.get("role")) as Enums<"user_role">;

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
