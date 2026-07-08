"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function upsertDinner(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const date = String(formData.get("date"));
  const deadlineLocal = String(formData.get("application_deadline"));

  const { error } = await supabase.from("dinners").upsert(
    {
      date,
      application_deadline: new Date(deadlineLocal).toISOString(),
      created_by: user.id,
    },
    { onConflict: "date" }
  );

  if (error) {
    redirect(`/admin/dinners?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/dinners");
  revalidatePath("/");
  revalidatePath("/apply");
}

export async function closeDinner(dinnerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_dinner", { p_dinner_id: dinnerId });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/dinners");
  revalidatePath("/admin/demerits");
  revalidatePath("/");
}

// Manual test hooks for the two cron jobs (see migration scheduling_automation):
// - open-next-wednesday-dinner runs Thu 09:00 KST, mirrors schedule_open_dinner()
// - sweep-expired-dinners runs Wed 20:00 KST, mirrors sweep_expired_dinners()
// Both can be triggered on demand here without waiting for the actual schedule.
export async function testScheduleOpenDinner() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("schedule_open_dinner");
  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/dinners");
  revalidatePath("/");
  revalidatePath("/apply");
  return {
    ok: true as const,
    message: data ? `회차가 생성되었습니다 (id: ${data})` : "이미 해당 날짜 회차가 존재해 새로 만들지 않았습니다.",
  };
}

export async function testSweepExpiredDinners() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sweep_expired_dinners");
  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/admin/dinners");
  revalidatePath("/admin/demerits");
  revalidatePath("/");
  return { ok: true as const, message: `마감 기준(20시)을 넘긴 회차 ${data}건을 처리했습니다.` };
}
