"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isAdmin } from "@/lib/profile";
import { DEMERIT_BLOCK_THRESHOLD } from "@/lib/policy";

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

  const { data: demerits } = await supabase.from("demerits").select("points").eq("student_id", user.id);
  const totalDemerits = demerits?.reduce((sum, d) => sum + d.points, 0) ?? 0;
  if (totalDemerits >= DEMERIT_BLOCK_THRESHOLD) {
    throw new Error(
      `누적 벌점 ${totalDemerits}점으로 신청이 제한되었습니다. 담당 선생님께 문의하세요.`
    );
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
}

// Students normally cannot cancel once applied (see /apply page copy). This
// is a test-only escape hatch for admins so they can reset their own
// applications while testing the apply/check-in flow repeatedly.
export async function cancelApplication(applicationId: string) {
  const profile = await getProfile();
  if (!profile) throw new Error("로그인이 필요합니다.");
  if (!isAdmin(profile)) throw new Error("관리자만 신청을 취소할 수 있습니다.");

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("applications")
    .select("id, student_id, status")
    .eq("id", applicationId)
    .single();

  if (!application) throw new Error("존재하지 않는 신청입니다.");
  if (application.student_id !== profile.id) throw new Error("본인의 신청만 취소할 수 있습니다.");
  if (application.status === "cancelled") return;

  const { error } = await supabase
    .from("applications")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), checked_in_at: null, checked_in_by: null })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);

  revalidatePath("/apply");
  revalidatePath("/");
}
