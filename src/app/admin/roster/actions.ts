"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function bulkUpsertRoster(formData: FormData) {
  const supabase = await createClient();
  const raw = String(formData.get("bulk") ?? "");

  const rows = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [student_no, name, grade, class_] = line.split(",").map((v) => v.trim());
      return { student_no, name, grade: Number(grade), class: Number(class_) };
    });

  const invalid = rows.find(
    (r) => !r.student_no || !r.name || Number.isNaN(r.grade) || Number.isNaN(r.class)
  );
  if (invalid) {
    redirect(`/admin/roster?error=${encodeURIComponent("형식 오류: 학번,이름,학년,반")}`);
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("roster").upsert(rows, { onConflict: "student_no" });
    if (error) {
      redirect(`/admin/roster?error=${encodeURIComponent(error.message)}`);
    }
  }

  revalidatePath("/admin/roster");
}

export async function deleteRosterEntry(studentNo: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("roster").delete().eq("student_no", studentNo);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/roster");
}
