import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, SectionLabel } from "@/components/ui";

// Chart marks — validated with the dataviz palette checker (lightness band,
// chroma floor, CVD separation, contrast vs #fff all PASS).
const CHECKED_IN_COLOR = "#1f6fb0";
const NO_SHOW_COLOR = "#c6412c";

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <Card className="text-center">
      <p className="font-display text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-soft">{label}</p>
    </Card>
  );
}

export default async function StatsAdminPage() {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");

  const supabase = await createClient();

  const [{ data: dinners }, { data: apps }, { data: demerits }] = await Promise.all([
    supabase.from("dinners").select("id, date").order("date", { ascending: true }),
    supabase.from("applications").select("dinner_id, status"),
    supabase
      .from("demerits")
      .select("points, profiles!demerits_student_id_fkey(name, student_no, grade, class)"),
  ]);

  const rounds = (dinners ?? []).map((d) => {
    const roundApps = (apps ?? []).filter((a) => a.dinner_id === d.id);
    const checked = roundApps.filter((a) => a.status === "checked_in").length;
    const noShow = roundApps.filter((a) => a.status === "no_show").length;
    const pendingApplied = roundApps.filter((a) => a.status === "applied").length;
    return { date: d.date, checked, noShow, total: checked + noShow + pendingApplied };
  });

  const finishedRounds = rounds.filter((r) => r.checked + r.noShow > 0);
  const totalServed = finishedRounds.reduce((s, r) => s + r.checked, 0);
  const totalNoShow = finishedRounds.reduce((s, r) => s + r.noShow, 0);
  const noShowRate =
    totalServed + totalNoShow > 0 ? Math.round((totalNoShow / (totalServed + totalNoShow)) * 100) : 0;

  const demeritTotals = new Map<
    string,
    { name: string; student_no: string | null; grade: number | null; class: number | null; total: number }
  >();
  for (const d of demerits ?? []) {
    const key = d.profiles?.student_no ?? d.profiles?.name ?? "unknown";
    const entry = demeritTotals.get(key) ?? {
      name: d.profiles?.name ?? "알 수 없음",
      student_no: d.profiles?.student_no ?? null,
      grade: d.profiles?.grade ?? null,
      class: d.profiles?.class ?? null,
      total: 0,
    };
    entry.total += d.points;
    demeritTotals.set(key, entry);
  }
  const topDemerits = [...demeritTotals.values()].sort((a, b) => b.total - a.total).slice(0, 10);

  const maxRoundTotal = Math.max(1, ...rounds.map((r) => r.checked + r.noShow));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle sub="회차별 노쇼 추이와 벌점 상위 학생을 확인하세요.">주간 통계</PageTitle>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatTile value={`${totalServed}명`} label="총 배식(체크인)" />
        <StatTile value={`${totalNoShow}명`} label="총 노쇼" />
        <StatTile value={`${noShowRate}%`} label="전체 노쇼율" />
      </div>

      <Card className="mb-8">
        <SectionLabel>회차별 체크인 / 노쇼</SectionLabel>

        <div className="mb-3 flex items-center gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: CHECKED_IN_COLOR }} />
            체크인
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-[2px]" style={{ background: NO_SHOW_COLOR }} />
            노쇼
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {rounds.map((r) => {
            const width = (n: number) => `${(n / maxRoundTotal) * 100}%`;
            return (
              <div key={r.date} className="flex items-center gap-3">
                <span className="w-24 shrink-0 font-mono text-xs text-ink-soft">{r.date}</span>
                <div className="flex h-5 flex-1 items-center gap-[2px]">
                  {r.checked > 0 && (
                    <div
                      title={`${r.date} 체크인 ${r.checked}명`}
                      className="flex h-full items-center justify-end rounded-r-[4px] pr-1"
                      style={{ width: width(r.checked), background: CHECKED_IN_COLOR, minWidth: 18 }}
                    >
                      <span className="font-mono text-[10px] font-medium text-white">{r.checked}</span>
                    </div>
                  )}
                  {r.noShow > 0 && (
                    <div
                      title={`${r.date} 노쇼 ${r.noShow}명`}
                      className="flex h-full items-center justify-end rounded-r-[4px] pr-1"
                      style={{ width: width(r.noShow), background: NO_SHOW_COLOR, minWidth: 18 }}
                    >
                      <span className="font-mono text-[10px] font-medium text-white">{r.noShow}</span>
                    </div>
                  )}
                  {r.checked + r.noShow === 0 && (
                    <span className="text-xs text-ink-soft">아직 결과 없음 (신청 {r.total}명)</span>
                  )}
                </div>
              </div>
            );
          })}
          {rounds.length === 0 && <p className="text-sm text-ink-soft">회차 데이터가 없습니다.</p>}
        </div>
      </Card>

      <Card>
        <SectionLabel>벌점 상위 학생 (Top 10)</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rivet-line text-left font-mono text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2">학생</th>
              <th className="py-2">학년/반</th>
              <th className="py-2">누적 벌점</th>
            </tr>
          </thead>
          <tbody>
            {topDemerits.map((t) => (
              <tr key={t.student_no ?? t.name} className="border-b border-rivet-line">
                <td className="py-2">
                  {t.name} <span className="font-mono text-xs text-ink-soft">({t.student_no ?? "-"})</span>
                </td>
                <td className="py-2">{t.grade && t.class ? `${t.grade}학년 ${t.class}반` : "-"}</td>
                <td className="py-2 font-mono font-semibold text-danger">{t.total}점</td>
              </tr>
            ))}
            {topDemerits.length === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-ink-soft">
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
