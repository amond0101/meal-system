import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { fetchNeisDinnerMenu } from "@/lib/neis";
import { Card, SectionLabel, StatusBadge } from "@/components/ui";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const admin = isAdmin(profile);

  const today = new Date().toISOString().slice(0, 10);
  const { data: upcoming } = await supabase
    .from("dinners")
    .select("*")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const wantsTodayStats = admin && upcoming?.date === today;

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

  // Application-deadline reminder: shown while an upcoming round is still open
  // and this user hasn't applied (or cancelled).
  const deadline = upcoming ? new Date(upcoming.application_deadline) : null;
  const hoursLeft = deadline
    ? Math.floor((deadline.getTime() - new Date().getTime()) / 3600000)
    : null;
  const needsReminder =
    upcoming &&
    upcoming.status === "open" &&
    hoursLeft !== null &&
    hoursLeft >= 0 &&
    (!myApplication || myApplication.status === "cancelled");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 font-display text-2xl font-semibold uppercase tracking-wide text-ink">
        안녕하세요, {profile.name}님
      </h1>
      <p className="mb-6 text-sm text-ink-soft">수요석식 신청 현황을 확인하세요.</p>

      {needsReminder && (
        <Link
          href="/apply"
          className="mb-6 flex items-center justify-between gap-3 rounded-sm border-2 border-safety bg-safety/15 px-4 py-3"
        >
          <p className="text-sm font-medium text-safety-ink">
            {upcoming!.date} 수요석식을 아직 신청하지 않았어요 — 마감까지{" "}
            {hoursLeft! >= 24 ? `${Math.floor(hoursLeft! / 24)}일 ${hoursLeft! % 24}시간` : `${hoursLeft}시간`} 남았습니다.
          </p>
          <span className="whitespace-nowrap font-display text-sm font-semibold uppercase text-safety-ink">
            신청하기 →
          </span>
        </Link>
      )}

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
            신청 / 신청확인·QR 보기 →
          </Link>
        </Card>

        <Card>
          <SectionLabel>급식확인</SectionLabel>
          <p className="text-sm text-ink-soft">오늘 급식 메뉴와 내 신청 상태를 확인하세요.</p>
          <Link href="/checkin" className="mt-3 inline-block text-sm text-steel underline underline-offset-2">
            급식확인 보기 →
          </Link>
        </Card>

        {admin && (
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
            <Link href="/checkin/scan" className="mt-3 inline-block text-sm text-steel underline underline-offset-2">
              QR 체크인으로 →
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
