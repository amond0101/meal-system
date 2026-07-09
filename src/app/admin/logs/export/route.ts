import { NextResponse } from "next/server";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

const statusLabel: Record<string, string> = {
  applied: "신청(미체크인)",
  checked_in: "체크인",
  cancelled: "취소",
  no_show: "노쇼",
};

function csvField(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export async function GET() {
  const profile = await getProfile();
  if (!isAdmin(profile)) {
    return new NextResponse("권한이 없습니다.", { status: 403 });
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("applications")
    .select(
      "status, applied_at, checked_in_at, dinners(date), profiles!applications_student_id_fkey(name, student_no, grade, class)"
    )
    .order("applied_at", { ascending: false });

  const header = ["급식일", "학번", "학년", "반", "이름", "상태", "신청시각", "체크인시각"];
  const lines = (rows ?? []).map((r) =>
    [
      r.dinners?.date ?? "",
      r.profiles?.student_no ?? "",
      r.profiles?.grade?.toString() ?? "",
      r.profiles?.class?.toString() ?? "",
      r.profiles?.name ?? "",
      statusLabel[r.status] ?? r.status,
      r.applied_at ? new Date(r.applied_at).toLocaleString("ko-KR") : "",
      r.checked_in_at ? new Date(r.checked_in_at).toLocaleString("ko-KR") : "",
    ]
      .map(csvField)
      .join(",")
  );

  // BOM so Excel opens the Korean text as UTF-8.
  const csv = "﻿" + [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meal-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
