import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { fetchNeisDinnerMenu } from "@/lib/neis";
import { QrScanner } from "@/components/qr-scanner";
import { Card, PageTitle } from "@/components/ui";

function CounterDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="counter-plate flex flex-col items-center rounded-sm px-4 py-3">
      <span className="text-4xl font-semibold tabular-nums">{String(value).padStart(3, "0")}</span>
      <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/60">{label}</span>
    </div>
  );
}

export default async function CheckinScanPage() {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: dinner }, liveMenu] = await Promise.all([
    supabase.from("dinners").select("*").eq("date", today).maybeSingle(),
    fetchNeisDinnerMenu(today),
  ]);

  let stats = { applied: 0, checked_in: 0, no_show: 0 };
  if (dinner) {
    const { data: apps } = await supabase.from("applications").select("status").eq("dinner_id", dinner.id);
    stats = {
      applied: apps?.filter((a) => a.status === "applied").length ?? 0,
      checked_in: apps?.filter((a) => a.status === "checked_in").length ?? 0,
      no_show: apps?.filter((a) => a.status === "no_show").length ?? 0,
    };
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle sub={today}>QR 체크인</PageTitle>

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
        <p className="mb-6 text-sm text-ink-soft">오늘은 등록된 수요석식 회차가 없습니다. QR 체크인은 날짜와 무관하게 항상 가능합니다.</p>
      ) : (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <CounterDigit value={stats.checked_in} label="체크인" />
          <CounterDigit value={stats.applied} label="대기중" />
          <CounterDigit value={stats.applied + stats.checked_in} label="전체 신청" />
        </div>
      )}

      <QrScanner />
    </div>
  );
}
