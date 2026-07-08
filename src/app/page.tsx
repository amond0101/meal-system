import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, isStaff, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { fetchNeisDinnerMenu } from "@/lib/neis";
import { Card, SectionLabel, StatusBadge } from "@/components/ui";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const staff = isStaff(profile);
  const admin = isAdmin(profile);

  const today = new Date().toISOString().slice(0, 10);
  const { data: upcoming } = await supabase
    .from("dinners")
    .select("*")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const wantsTodayStats = staff && upcoming?.date === today;

  const [upcomingMenu, myApplication, todayApps] = upcoming
    ? await Promise.all([
        fetchNeisDinnerMenu(upcoming.date),
        supabase
          .from("applications")
          .select("status")
          .eq("dinner_id", upcoming.id)
          .eq("student_id", profile.id)
          .maybeSingle()
          .then((r) => r.data),
        wantsTodayStats
          ? supabase
              .from("applications")
              .select("status")
              .eq("dinner_id", upcoming.id)
              .then((r) => r.data)
          : Promise.resolve(null),
      ])
    : [null, null, null];

  const todayStats = todayApps
    ? {
        applied: todayApps.filter((a) => a.status === "applied" || a.status === "checked_in").length,
        checked_in: todayApps.filter((a) => a.status === "checked_in").length,
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 font-display text-2xl font-semibold uppercase tracking-wide text-ink">
        안녕하세요, {profile.name}님
      </h1>
      <p className="mb-6 text-sm text-ink-soft">수요석식 신청 현황을 확인하세요.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <SectionLabel>다가오는 수요석식</SectionLabel>
          {upcoming ? (
            <>
              <p className="text-sm">
                <span className="font-mono font-medium">{upcoming.date}</span> · {upcomingMenu ?? "NEIS 급식 정보 없음"}
              </p>
              <p className="mt-1 font-mono text-xs text-ink-soft">
                마감 {new Date(upcoming.application_deadline).toLocaleString("ko-KR")}
              </p>
              <div className="mt-3">
                {myApplication ? (
                  <StatusBadge status={myApplication.status} />
                ) : (
                  <span className="text-sm text-ink-soft">아직 신청하지 않았습니다.</span>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-soft">예정된 수요석식이 없습니다.</p>
          )}
          <Link href="/apply" className="mt-3 inline-block text-sm text-steel underline underline-offset-2">
            신청하러 가기 →
          </Link>
        </Card>

        <Card>
          <SectionLabel>신청확인</SectionLabel>
          <p className="text-sm text-ink-soft">내 신청 내역과 QR 코드, 누적 벌점을 확인하세요.</p>
          <Link href="/my" className="mt-3 inline-block text-sm text-steel underline underline-offset-2">
            신청확인 보기 →
          </Link>
        </Card>

        {staff && (
          <Card>
            <SectionLabel>오늘 체크인 현황</SectionLabel>
            {todayStats ? (
              <p className="font-display text-3xl font-semibold">
                {todayStats.checked_in} / {todayStats.applied}
                <span className="ml-2 font-body text-sm font-normal text-ink-soft">명 체크인</span>
              </p>
            ) : (
              <p className="text-sm text-ink-soft">오늘은 수요석식이 없습니다.</p>
            )}
            <Link href="/checkin" className="mt-3 inline-block text-sm text-steel underline underline-offset-2">
              급식확인 페이지로 →
            </Link>
          </Card>
        )}

        {admin && (
          <Card>
            <SectionLabel>관리자</SectionLabel>
            <Link href="/admin" className="text-sm text-steel underline underline-offset-2">
              관리자 페이지로 →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
