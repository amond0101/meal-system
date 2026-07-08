import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { claimRosterEntry } from "./actions";
import { parseStudentNoFromEmail } from "@/lib/student-no";
import { btnPrimary } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.student_no) redirect("/");

  const { error } = await searchParams;
  const suggestedStudentNo = parseStudentNoFromEmail(profile.email);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="font-display text-xl font-semibold uppercase tracking-wide text-ink">
          학번 확인
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          학생증에 적힌 고유 학번을 입력해 본인 정보를 연결해주세요.
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form
        action={claimRosterEntry}
        className="flex flex-col gap-3 rounded-sm border border-rivet-line bg-paper-raised p-4 shadow-sm"
      >
        <input
          name="student_no"
          type="text"
          defaultValue={suggestedStudentNo ?? ""}
          placeholder="학번 (학생증 고유번호)"
          required
          className="rounded-sm border border-rivet px-3 py-2 font-mono text-sm"
        />
        {suggestedStudentNo && (
          <p className="text-xs text-ink-soft">
            학교 이메일에서 자동으로 채워드렸어요. 다르면 직접 수정해주세요.
          </p>
        )}
        <SubmitButton className={btnPrimary} pendingText="확인 중…">
          확인
        </SubmitButton>
      </form>
    </div>
  );
}
