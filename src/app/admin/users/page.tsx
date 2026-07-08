import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { updateRole } from "./actions";
import { Card, PageTitle } from "@/components/ui";

const roleLabel: Record<string, string> = {
  student: "학생",
  staff: "담당교사",
  admin: "관리자",
};

export default async function UsersAdminPage() {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageTitle>사용자 관리</PageTitle>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rivet-line text-left font-mono text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2">이름</th>
              <th className="py-2">이메일</th>
              <th className="py-2">학번</th>
              <th className="py-2">역할</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map((p) => (
              <tr key={p.id} className="border-b border-rivet-line">
                <td className="py-2">{p.name}</td>
                <td className="py-2 font-mono text-xs text-ink-soft">{p.email}</td>
                <td className="py-2 font-mono">{p.student_no ?? "-"}</td>
                <td className="py-2">
                  <form action={updateRole.bind(null, p.id)} className="flex items-center gap-2">
                    <select name="role" defaultValue={p.role} className="rounded-sm border border-rivet px-2 py-1">
                      {Object.entries(roleLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-sm border border-rivet px-2 py-1 text-xs hover:bg-paper">
                      저장
                    </button>
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
