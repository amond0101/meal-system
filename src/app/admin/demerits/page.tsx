import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, SectionLabel, btnDanger } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { deleteDemerit } from "./actions";

export default async function DemeritsAdminPage() {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");

  const supabase = await createClient();
  const { data: demerits } = await supabase
    .from("demerits")
    .select("*, profiles(name, student_no), dinners(date)")
    .order("created_at", { ascending: false });

  const totals = new Map<string, { name: string; student_no: string | null; total: number }>();
  for (const d of demerits ?? []) {
    const key = d.student_id;
    const entry = totals.get(key) ?? {
      name: d.profiles?.name ?? "알 수 없음",
      student_no: d.profiles?.student_no ?? null,
      total: 0,
    };
    entry.total += d.points;
    totals.set(key, entry);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle>벌점 현황</PageTitle>

      <Card className="mb-8">
        <SectionLabel>학생별 누적 벌점</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rivet-line text-left font-mono text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2">학번</th>
              <th className="py-2">이름</th>
              <th className="py-2">누적 벌점</th>
            </tr>
          </thead>
          <tbody>
            {[...totals.values()]
              .sort((a, b) => b.total - a.total)
              .map((t) => (
                <tr key={t.student_no ?? t.name} className="border-b border-rivet-line">
                  <td className="py-2 font-mono">{t.student_no ?? "-"}</td>
                  <td className="py-2">{t.name}</td>
                  <td className="py-2 font-mono font-semibold text-danger">{t.total}점</td>
                </tr>
              ))}
            {totals.size === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-ink-soft">
                  벌점 기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card>
        <SectionLabel>전체 기록</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rivet-line text-left font-mono text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2">날짜</th>
              <th className="py-2">학생</th>
              <th className="py-2">사유</th>
              <th className="py-2">점수</th>
              <th className="py-2">관리자</th>
            </tr>
          </thead>
          <tbody>
            {demerits?.map((d) => (
              <tr key={d.id} className="border-b border-rivet-line">
                <td className="py-2 font-mono">{d.dinners?.date ?? "-"}</td>
                <td className="py-2">
                  {d.profiles?.name} ({d.profiles?.student_no ?? "-"})
                </td>
                <td className="py-2">{d.reason}</td>
                <td className="py-2 font-mono">{d.points}점</td>
                <td className="py-2">
                  <form action={deleteDemerit.bind(null, d.id)}>
                    <SubmitButton className={btnDanger} pendingText="취소 중…">
                      취소
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
            {demerits?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-2 text-ink-soft">
                  벌점 기록이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
