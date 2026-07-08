"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function applyToDinner(dinnerId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: dinner } = await supabase.from("dinners").select("*").eq("id", dinnerId).single();
  if (!dinner) throw new Error("존재하지 않는 회차입니다.");
  if (dinner.status !== "open" || new Date(dinner.application_deadline) < new Date()) {
    throw new Error("신청 마감된 회차입니다.");
  }

  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("dinner_id", dinnerId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("applications")
      .update({ status: "applied", cancelled_at: null })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("applications")
      .insert({ dinner_id: dinnerId, student_id: user.id });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/apply");
  revalidatePath("/");
  revalidatePath("/my");
}
