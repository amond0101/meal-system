import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { updateRole } from "./actions";
import { Card, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const roleLabel: Record<string, string> = {
  student: "학생",
  staff: "담당교사",
  admin: "관리자",
};

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle sub="관리자 역할을 부여하려면 관리자 비밀번호를 함께 입력해야 합니다.">
        사용자 관리
      </PageTitle>

      {error && (
        <p className="mb-4 rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rivet-line text-left font-mono text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2">이름</th>
              <th className="py-2">이메일</th>
              <th className="py-2">학번</th>
              <th className="py-2">학년/반</th>
              <th className="py-2">역할</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map((p) => (
              <tr key={p.id} className="border-b border-rivet-line">
                <td className="py-2">{p.name}</td>
                <td className="py-2 font-mono text-xs text-ink-soft">{p.email}</td>
                <td className="py-2 font-mono">{p.student_no ?? "-"}</td>
                <td className="py-2">{p.grade && p.class ? `${p.grade}학년 ${p.class}반` : "-"}</td>
                <td className="py-2">
                  <form action={updateRole.bind(null, p.id)} className="flex flex-wrap items-center gap-2">
                    <select name="role" defaultValue={p.role} className="rounded-sm border border-rivet px-2 py-1">
                      {Object.entries(roleLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      name="admin_password"
                      type="password"
                      placeholder="관리자 부여 시 비밀번호"
                      className="w-40 rounded-sm border border-rivet px-2 py-1 text-xs"
                    />
                    <SubmitButton
                      className="rounded-sm border border-rivet px-2 py-1 text-xs hover:bg-paper"
                      pendingText="저장 중…"
                    >
                      저장
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
