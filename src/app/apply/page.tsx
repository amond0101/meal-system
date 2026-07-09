import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { applyToDinner, cancelApplication } from "./actions";
import { PageTitle, SectionLabel, StatusBadge, btnPrimary, btnDanger } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { QrLightbox } from "@/components/qr-lightbox";
import { LiveRefresh } from "@/components/live-refresh";
import { DEMERIT_BLOCK_THRESHOLD } from "@/lib/policy";

function ticketCode(qrToken: string) {
  return qrToken.slice(0, 8).toUpperCase().match(/.{1,4}/g)?.join("-") ?? qrToken;
}

async function qrForApplication(app: { status: string; qr_token: string } | null | undefined) {
  if (!app || app.status !== "applied") return null;
  return QRCode.toDataURL(app.qr_token, { margin: 0, color: { dark: "#1c2321", light: "#00000000" } });
}

export default async function ApplyPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const admin = isAdmin(profile);

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: dinners }, { data: myApps }, { data: demerits }] = await Promise.all([
    supabase
      .from("dinners")
      .select("*")
      .eq("status", "open")
      .gte("date", today)
      .order("date", { ascending: true }),
    supabase
      .from("applications")
      .select("*, dinners(date)")
      .eq("student_id", profile.id)
      .order("applied_at", { ascending: false }),
    supabase.from("demerits").select("points").eq("student_id", profile.id),
  ]);

  const totalDemerits = demerits?.reduce((sum, d) => sum + d.points, 0) ?? 0;
  const blocked = totalDemerits >= DEMERIT_BLOCK_THRESHOLD;
  const appMap = new Map(myApps?.map((a) => [a.dinner_id, a]));
  const upcomingDinnerIds = new Set((dinners ?? []).map((d) => d.id));

  const dinnersWithMenu = await Promise.all(
    (dinners ?? []).map(async (dinner) => {
      const application = appMap.get(dinner.id);
      const qrDataUrl = await qrForApplication(application);
      return { ...dinner, application, qrDataUrl };
    })
  );

  // Applications for dinners that aren't in the "open & upcoming" list above
  // (past dinners, already-closed ones, etc.) — shown as history below so
  // this one page covers both applying and checking past QR tickets.
  const historyApps = await Promise.all(
    (myApps ?? [])
      .filter((a) => !upcomingDinnerIds.has(a.dinner_id))
      .map(async (app) => ({ ...app, qrDataUrl: await qrForApplication(app) }))
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <LiveRefresh studentId={profile.id} />
      <PageTitle
        sub={
          <>
            회차를 선택해 마감 전에 신청하세요. 신청하면 이 화면에서 바로 체크인용 QR을 확인할 수 있습니다. 누적 벌점{" "}
            <span className={totalDemerits > 0 ? "font-mono font-semibold text-danger" : "font-mono"}>
              {totalDemerits}점
            </span>
          </>
        }
      >
        수요석식 신청
      </PageTitle>

      {blocked && (
        <p className="mb-4 rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          누적 벌점 {totalDemerits}점(기준 {DEMERIT_BLOCK_THRESHOLD}점 이상)으로 신청이 제한되었습니다.
          담당 선생님께 문의하세요.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {dinnersWithMenu.map((dinner) => {
          const { application, qrDataUrl } = dinner;
          const deadlinePassed = new Date(dinner.application_deadline) < new Date();
          const applied = application && application.status !== "cancelled";

          return (
            <div
              key={dinner.id}
              className="flex overflow-hidden rounded-sm border border-rivet-line bg-paper-raised shadow-sm"
            >
              <div className="flex-1 p-4">
                <p className="font-mono font-medium">{dinner.date}</p>
                <p className="mt-1 font-mono text-xs text-ink-soft">
                  마감 {new Date(dinner.application_deadline).toLocaleString("ko-KR")}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {applied ? (
                    <>
                      <StatusBadge status={application.status} />
                      {admin && application.status !== "cancelled" && (
                        <form action={cancelApplication.bind(null, application.id)}>
                          <SubmitButton className={btnDanger} pendingText="취소 중…">
                            취소 (관리자 테스트용)
                          </SubmitButton>
                        </form>
                      )}
                    </>
                  ) : deadlinePassed ? (
                    <span className="text-sm text-ink-soft">마감되었습니다.</span>
                  ) : blocked ? (
                    <span className="text-sm text-danger">벌점 초과로 신청 불가</span>
                  ) : (
                    <form action={applyToDinner.bind(null, dinner.id)}>
                      <SubmitButton className={btnPrimary} pendingText="신청 중…">
                        신청하기
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>

              {qrDataUrl && (
                <div className="ticket-perforation flex w-32 flex-col items-center justify-center gap-1 bg-paper p-3">
                  <QrLightbox src={qrDataUrl} alt="체크인용 QR 코드" />
                  <p className="text-center font-mono text-[10px] leading-tight text-ink-soft">
                    탭하면 확대 · 급식 수령 시 제시
                  </p>
                </div>
              )}
            </div>
          );
        })}
        {dinnersWithMenu.length === 0 && (
          <p className="text-sm text-ink-soft">현재 신청 가능한 수요석식이 없습니다.</p>
        )}
      </div>

      {historyApps.length > 0 && (
        <div className="mt-8">
          <SectionLabel>지난 신청 내역</SectionLabel>
          <div className="flex flex-col gap-3">
            {historyApps.map((app) => (
              <div
                key={app.id}
                className="flex overflow-hidden rounded-sm border border-rivet-line bg-paper-raised shadow-sm"
              >
                <div className="flex-1 p-4">
                  <p className="font-mono text-xs uppercase tracking-widest text-steel">수요석식 급식권</p>
                  <p className="mt-1 font-display text-lg font-semibold text-ink">{app.dinners?.date}</p>
                  <p className="mt-2 font-mono text-xs text-rivet">No. {ticketCode(app.qr_token)}</p>
                  <div className="mt-3">
                    <StatusBadge status={app.status} />
                  </div>
                </div>

                {app.qrDataUrl ? (
                  <div className="ticket-perforation flex w-32 flex-col items-center justify-center gap-1 bg-paper p-3">
                    <QrLightbox src={app.qrDataUrl} alt="체크인용 QR 코드" />
                    <p className="text-center font-mono text-[10px] leading-tight text-ink-soft">
                      탭하면 확대 · 급식 수령 시 제시
                    </p>
                  </div>
                ) : (
                  <div className="ticket-perforation flex w-32 items-center justify-center bg-paper p-3">
                    <p className="text-center font-mono text-[10px] text-ink-soft">사용 종료</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
