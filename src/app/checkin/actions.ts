"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function checkInToken(qrToken: string) {
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
