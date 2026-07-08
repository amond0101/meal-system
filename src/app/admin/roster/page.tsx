import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { bulkUpsertRoster, deleteRosterEntry } from "./actions";
import { Card, PageTitle, SectionLabel, btnSteel } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function RosterAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: roster } = await supabase
    .from("roster")
    .select("*")
    .order("grade")
    .order("class")
    .order("student_no");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle>명부 관리</PageTitle>

      {error && (
        <p className="mb-4 rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card className="mb-8">
        <SectionLabel>명부 붙여넣기 등록</SectionLabel>
        <p className="mb-3 text-xs text-ink-soft">
          한 줄에 한 명씩, <code className="font-mono">학번,이름,학년,반</code> 형식으로 입력하세요. (예: 10315,홍길동,1,3)
          이미 등록된 학번은 이름/학년/반만 갱신되고 연결 상태는 유지됩니다.
        </p>
        <form action={bulkUpsertRoster} className="flex flex-col gap-3">
          <textarea
            name="bulk"
            rows={8}
            placeholder="10315,홍길동,1,3&#10;10316,김철수,1,3"
            required
            className="rounded-sm border border-rivet px-3 py-2 font-mono text-sm"
          />
          <SubmitButton className={`${btnSteel} self-start`} pendingText="등록 중…">
            등록
          </SubmitButton>
        </form>
      </Card>

      <Card>
        <SectionLabel>명부 목록 ({roster?.length ?? 0}명)</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rivet-line text-left font-mono text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2">학번</th>
              <th className="py-2">이름</th>
              <th className="py-2">학년/반</th>
              <th className="py-2">연결 상태</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {roster?.map((r) => (
              <tr key={r.student_no} className="border-b border-rivet-line">
                <td className="py-2 font-mono">{r.student_no}</td>
                <td className="py-2">{r.name}</td>
                <td className="py-2">
                  {r.grade}학년 {r.class}반
                </td>
                <td className="py-2">{r.claimed_by ? "연결됨" : "미연결"}</td>
                <td className="py-2">
                  <form action={deleteRosterEntry.bind(null, r.student_no)}>
                    <button className="text-xs text-danger">삭제</button>
                  </form>
                </td>
              </tr>
            ))}
            {roster?.length === 0 && (
              <tr>
                <td colSpan={5} className="py-2 text-ink-soft">
                  등록된 명부가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
