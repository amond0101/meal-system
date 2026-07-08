import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { fetchNeisDinnerMenu } from "@/lib/neis";
import { PageTitle, StatusBadge } from "@/components/ui";

function ticketCode(qrToken: string) {
  return qrToken.slice(0, 8).toUpperCase().match(/.{1,4}/g)?.join("-") ?? qrToken;
}

export default async function MyPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("*, dinners(date)")
    .eq("student_id", profile.id)
    .order("applied_at", { ascending: false });

  const { data: demerits } = await supabase
    .from("demerits")
    .select("points")
    .eq("student_id", profile.id);

  const totalDemerits = demerits?.reduce((sum, d) => sum + d.points, 0) ?? 0;

  const withQr = await Promise.all(
    (applications ?? []).map(async (app) => ({
      ...app,
      menu: app.dinners?.date ? await fetchNeisDinnerMenu(app.dinners.date) : null,
      qrDataUrl:
        app.status === "applied"
          ? await QRCode.toDataURL(app.qr_token, { margin: 0, color: { dark: "#1c2321", light: "#00000000" } })
          : null,
    }))
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle
        sub={
          <>
            누적 벌점{" "}
            <span className={totalDemerits > 0 ? "font-mono font-semibold text-danger" : "font-mono"}>
              {totalDemerits}점
            </span>
          </>
        }
      >
        신청확인
      </PageTitle>

      <div className="flex flex-col gap-5">
        {withQr.map((app) => (
          <div
            key={app.id}
            className="flex overflow-hidden rounded-sm border border-rivet-line bg-paper-raised shadow-sm"
          >
            <div className="flex-1 p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-steel">수요석식 급식권</p>
              <p className="mt-1 font-display text-lg font-semibold text-ink">{app.dinners?.date}</p>
              <p className="text-sm text-ink-soft">{app.menu ?? "NEIS 급식 정보 없음"}</p>
              <p className="mt-2 font-mono text-xs text-rivet">No. {ticketCode(app.qr_token)}</p>
              <div className="mt-3">
                <StatusBadge status={app.status} />
              </div>
            </div>

            {app.qrDataUrl ? (
              <div className="ticket-perforation flex w-32 flex-col items-center justify-center gap-1 bg-paper p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={app.qrDataUrl} alt="체크인용 QR 코드" className="h-20 w-20" />
                <p className="text-center font-mono text-[10px] leading-tight text-ink-soft">
                  급식 수령 시
                  <br />
                  제시하세요
                </p>
              </div>
            ) : (
              <div className="ticket-perforation flex w-32 items-center justify-center bg-paper p-3">
                <p className="text-center font-mono text-[10px] text-ink-soft">사용 종료</p>
              </div>
            )}
          </div>
        ))}
        {withQr.length === 0 && <p className="text-sm text-ink-soft">신청 내역이 없습니다.</p>}
      </div>
    </div>
  );
}
