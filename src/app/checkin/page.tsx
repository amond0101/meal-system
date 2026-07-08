import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { fetchNeisDinnerMenu } from "@/lib/neis";
import { Card, PageTitle, StatusBadge, btnSteel } from "@/components/ui";

export default async function CheckinPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const admin = isAdmin(profile);

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: dinner }, liveMenu] = await Promise.all([
    supabase.from("dinners").select("*").eq("date", today).maybeSingle(),
    fetchNeisDinnerMenu(today),
  ]);

  const myApplication = dinner
    ? await supabase
        .from("applications")
        .select("status")
        .eq("dinner_id", dinner.id)
        .eq("student_id", profile.id)
        .maybeSingle()
        .then((r) => r.data)
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle sub={today}>급식확인</PageTitle>

      <Card className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
          <p className="font-mono text-xs uppercase tracking-widest text-steel">NEIS 실시간 급식 정보</p>
        </div>
        <p className="mt-2 text-sm">
          {liveMenu ?? <span className="text-ink-soft">오늘 석식 정보가 NEIS에 없습니다.</span>}
        </p>
      </Card>

      {!dinner ? (
        <p className="text-sm text-ink-soft">오늘은 등록된 수요석식 회차가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <p className="font-mono text-xs uppercase tracking-widest text-steel">오늘 급식 상태</p>
            <p className="mt-2 text-sm text-ink-soft">등록된 오늘 수요석식 회차를 확인할 수 있습니다.</p>
            <div className="mt-3">
              {myApplication ? <StatusBadge status={myApplication.status} /> : <span className="text-sm text-ink-soft">오늘 신청 내역이 없습니다.</span>}
            </div>
          </Card>

          {admin && (
            <Card>
              <p className="font-mono text-xs uppercase tracking-widest text-steel">관리자 전용 QR 체크인</p>
              <p className="mt-2 text-sm text-ink-soft">카메라 권한을 허용한 뒤 학생 QR을 스캔해 체크인 처리합니다.</p>
              <Link href="/checkin/scan" className={`${btnSteel} mt-4 inline-block`}>
                QR 체크인 열기
              </Link>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
