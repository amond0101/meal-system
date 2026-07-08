import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { fetchNeisDinnerMenu } from "@/lib/neis";
import { applyToDinner } from "./actions";
import { Card, PageTitle, StatusBadge, btnPrimary } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function ApplyPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: dinners }, { data: myApps }] = await Promise.all([
    supabase
      .from("dinners")
      .select("*")
      .eq("status", "open")
      .gte("date", today)
      .order("date", { ascending: true }),
    supabase.from("applications").select("*").eq("student_id", profile.id),
  ]);

  const appMap = new Map(myApps?.map((a) => [a.dinner_id, a]));

  const dinnersWithMenu = await Promise.all(
    (dinners ?? []).map(async (dinner) => ({
      ...dinner,
      menu: await fetchNeisDinnerMenu(dinner.date),
    }))
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle sub="회차를 선택하고 마감 전에 신청하세요. 신청 후에는 취소할 수 없습니다.">
        수요석식 신청
      </PageTitle>

      <div className="flex flex-col gap-4">
        {dinnersWithMenu.map((dinner) => {
          const application = appMap.get(dinner.id);
          const deadlinePassed = new Date(dinner.application_deadline) < new Date();
          const applied = application && application.status !== "cancelled";

          return (
            <Card key={dinner.id}>
              <p className="font-mono font-medium">{dinner.date}</p>
              <p className="text-sm text-ink-soft">{dinner.menu ?? "NEIS 급식 정보 없음"}</p>
              <p className="mt-1 font-mono text-xs text-ink-soft">
                마감 {new Date(dinner.application_deadline).toLocaleString("ko-KR")}
              </p>

              <div className="mt-3">
                {applied ? (
                  <StatusBadge status={application.status} />
                ) : deadlinePassed ? (
                  <span className="text-sm text-ink-soft">마감되었습니다.</span>
                ) : (
                  <form action={applyToDinner.bind(null, dinner.id)}>
                    <SubmitButton className={btnPrimary} pendingText="신청 중…">
                      신청하기
                    </SubmitButton>
                  </form>
                )}
              </div>
            </Card>
          );
        })}
        {dinnersWithMenu.length === 0 && (
          <p className="text-sm text-ink-soft">현재 신청 가능한 수요석식이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
