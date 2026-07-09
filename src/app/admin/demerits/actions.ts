"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isAdmin } from "@/lib/profile";

// Demerits are only ever created server-side (via the close_dinner /
// sweep_expired_dinners RPCs when a no-show is recorded). There's no UI path
// to remove one — admins need this to correct mistaken/duplicate penalties.
export async function deleteDemerit(demeritId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("로그인이 필요합니다.");
  if (!isAdmin(profile)) throw new Error("관리자만 벌점을 취소할 수 있습니다.");

  const supabase = await createClient();
  const { error } = await supabase.from("demerits").delete().eq("id", demeritId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/demerits");
  revalidatePath("/apply");
}
