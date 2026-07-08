"use server";

import { revalidatePath } from "next/cache";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function checkInToken(qrToken: string) {
  const profile = await getProfile();
  if (!isAdmin(profile)) {
    return { ok: false as const, message: "관리자만 체크인할 수 있습니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_application", {
    p_qr_token: qrToken.trim(),
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/checkin");
  revalidatePath("/");

  const row = data?.[0];
  return {
    ok: true as const,
    message: row ? `${row.grade}학년 ${row.class}반 ${row.student_name} 체크인 완료` : "체크인 완료",
  };
}
