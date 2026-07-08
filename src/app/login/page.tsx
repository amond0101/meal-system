import { GoogleLoginButton } from "./google-login-button";

const errorMessage: Record<string, string> = {
  domain: "학교 계정(@bmt.hs.kr)으로만 로그인할 수 있습니다.",
  oauth: "로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-4">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-steel">Busan Machinery Industrial H.S.</p>
        <h1 className="mt-1 font-display text-2xl font-semibold uppercase tracking-wide text-ink">
          부산기계공업고등학교
        </h1>
        <p className="mt-1 text-sm text-ink-soft">수요석식 신청 시스템</p>
      </div>

      {error && (
        <p className="rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {errorMessage[error] ?? "로그인에 실패했습니다."}
        </p>
      )}

      <div className="rounded-sm border border-rivet-line bg-paper-raised p-6 shadow-sm">
        <GoogleLoginButton />
        <p className="mt-3 text-center text-xs text-ink-soft">
          학교 구글 계정(@bmt.hs.kr)으로만 로그인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
