"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseGradeClassFromStudentNo } from "@/lib/student-no";

export async function claimStudentNo(formData: FormData) {
  const student_no = String(formData.get("student_no")).trim();
  const parsed = parseGradeClassFromStudentNo(student_no);

  if (!parsed) {
    redirect(`/onboarding?error=${encodeURIComponent("학번 형식이 올바르지 않습니다 (숫자 5자리).")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ student_no, grade: parsed.grade, class: parsed.class })
    .eq("id", user.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
