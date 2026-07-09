import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { closeDinner } from "./actions";
import { Card, PageTitle, SectionLabel, StatusBadge, btnDanger } from "@/components/ui";
import { DinnerForm } from "./dinner-form";
import { AutomationTestPanel } from "./automation-test-panel";
import { SubmitButton } from "@/components/submit-button";

function nextWednesday() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun ... 3=Wed
  const diff = (3 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default async function DinnersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: dinners } = await supabase
    .from("dinners")
    .select("*")
    .order("date", { ascending: false });

  const dinnerStats = new Map<string, { applied: number; checked_in: number; no_show: number }>();

  const appsResult =
    dinners && dinners.length > 0
      ? await supabase
          .from("applications")
          .select("dinner_id, status")
          .in("dinner_id", dinners.map((d) => d.id))
      : { data: null };

  for (const app of appsResult.data ?? []) {
    const s = dinnerStats.get(app.dinner_id) ?? { applied: 0, checked_in: 0, no_show: 0 };
    if (app.status === "applied") s.applied++;
    if (app.status === "checked_in") s.checked_in++;
    if (app.status === "no_show") s.no_show++;
    dinnerStats.set(app.dinner_id, s);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle>회차 관리</PageTitle>

      {error && (
        <p className="mb-4 rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card className="mb-8">
        <SectionLabel>새 회차 등록 / 수정</SectionLabel>
        <DinnerForm defaultDate={nextWednesday()} />
      </Card>

      <Card className="mb-8">
        <SectionLabel>신청 기간 / 노쇼 자동 처리 (목 09:00 오픈 · 월 09:00 마감 · 수 20:00 벌점)</SectionLabel>
        <AutomationTestPanel />
      </Card>

      <Card>
        <SectionLabel>회차 목록</SectionLabel>
        <div className="flex flex-col gap-3">
          {dinners?.map((dinner) => {
            const stats = dinnerStats.get(dinner.id) ?? { applied: 0, checked_in: 0, no_show: 0 };
            return (
              <div key={dinner.id} className="rounded-sm border border-rivet-line p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono font-medium">{dinner.date}</p>
                    <p className="mt-1 font-mono text-xs text-ink-soft">
                      신청 {stats.applied + stats.checked_in}명 / 체크인 {stats.checked_in}명 / 노쇼 {stats.no_show}명
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={dinner.status} />
                    </div>
                  </div>
                  {dinner.status === "open" && (
                    <form action={closeDinner.bind(null, dinner.id)}>
                      <SubmitButton className={btnDanger} pendingText="처리 중…">
                        마감 처리(노쇼 벌점 부여)
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
          {dinners?.length === 0 && <p className="text-sm text-ink-soft">등록된 회차가 없습니다.</p>}
        </div>
      </Card>
    </div>
  );
}
