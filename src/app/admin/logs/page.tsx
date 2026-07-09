import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, SectionLabel } from "@/components/ui";
import { LiveRefresh } from "@/components/live-refresh";

export default async function LogsAdminPage() {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");

  const supabase = await createClient();

  const [{ data: dinners }, { data: checkins }] = await Promise.all([
    supabase.from("dinners").select("*").order("date", { ascending: false }),
    supabase
      .from("applications")
      .select("checked_in_at, status, dinners(date), profiles!applications_student_id_fkey(name, student_no, grade, class)")
      .eq("status", "checked_in")
      .order("checked_in_at", { ascending: false })
      .limit(200),
  ]);

  const counts = new Map<string, { applied: number; checked_in: number; no_show: number; cancelled: number }>();
  if (dinners && dinners.length > 0) {
    const { data: apps } = await supabase
      .from("applications")
      .select("dinner_id, status")
      .in("dinner_id", dinners.map((d) => d.id));
    for (const app of apps ?? []) {
      const c = counts.get(app.dinner_id) ?? { applied: 0, checked_in: 0, no_show: 0, cancelled: 0 };
      c[app.status]++;
      counts.set(app.dinner_id, c);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LiveRefresh />
      <PageTitle sub="회차별 총 석식 인원과 체크인 기록입니다. 체크인이 일어나면 실시간으로 갱신됩니다.">
        석식 인원 로그
      </PageTitle>

      <a
        href="/admin/logs/export"
        download
        className="mb-6 inline-block rounded-sm border border-rivet px-3 py-1.5 text-sm text-ink hover:bg-paper"
      >
        CSV로 내보내기 (엑셀)
      </a>

      <Card className="mb-8">
        <SectionLabel>회차별 총 인원</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rivet-line text-left font-mono text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2">날짜</th>
              <th className="py-2">총 신청</th>
              <th className="py-2">체크인(실제 식사)</th>
              <th className="py-2">노쇼</th>
              <th className="py-2">취소</th>
            </tr>
          </thead>
          <tbody>
            {dinners?.map((d) => {
              const c = counts.get(d.id) ?? { applied: 0, checked_in: 0, no_show: 0, cancelled: 0 };
              const total = c.applied + c.checked_in + c.no_show;
              return (
                <tr key={d.id} className="border-b border-rivet-line">
                  <td className="py-2 font-mono">{d.date}</td>
                  <td className="py-2 font-mono font-semibold">{total}명</td>
                  <td className="py-2 font-mono text-success">{c.checked_in}명</td>
                  <td className="py-2 font-mono text-danger">{c.no_show}명</td>
                  <td className="py-2 font-mono text-ink-soft">{c.cancelled}명</td>
                </tr>
              );
            })}
            {dinners?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-2 text-ink-soft">
                  등록된 회차가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card>
        <SectionLabel>체크인 기록 (최근 200건)</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rivet-line text-left font-mono text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2">급식일</th>
              <th className="py-2">학생</th>
              <th className="py-2">체크인 시각</th>
            </tr>
          </thead>
          <tbody>
            {checkins?.map((c, i) => (
              <tr key={i} className="border-b border-rivet-line">
                <td className="py-2 font-mono">{c.dinners?.date ?? "-"}</td>
                <td className="py-2">
                  {c.profiles?.grade && c.profiles?.class
                    ? `${c.profiles.grade}학년 ${c.profiles.class}반 `
                    : ""}
                  {c.profiles?.name} ({c.profiles?.student_no ?? "-"})
                </td>
                <td className="py-2 font-mono text-xs">
                  {c.checked_in_at ? new Date(c.checked_in_at).toLocaleString("ko-KR") : "-"}
                </td>
              </tr>
            ))}
            {checkins?.length === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-ink-soft">
                  체크인 기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
