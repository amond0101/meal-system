import Link from "next/link";
import { getProfile, isStaff, isAdmin } from "@/lib/profile";
import { signOut } from "@/app/login/actions";

const roleLabel: Record<string, string> = {
  student: "학생",
  staff: "담당교사",
  admin: "관리자",
};

function Rivet() {
  return <span className="h-1.5 w-1.5 rounded-full bg-white/30" aria-hidden />;
}

export async function SiteHeader() {
  const profile = await getProfile();
  if (!profile) return null;

  const staff = isStaff(profile);
  const admin = isAdmin(profile);

  return (
    <header className="border-b-4 border-safety bg-steel-dark text-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Rivet />
            <Link href="/" className="font-display text-lg font-semibold uppercase tracking-wide">
              수요석식
            </Link>
            <Rivet />
          </div>
          <nav className="flex flex-wrap items-center gap-4 font-display text-sm uppercase tracking-wide text-white/80">
            <Link href="/apply" className="hover:text-safety">
              신청
            </Link>
            <Link href="/my" className="hover:text-safety">
              신청확인
            </Link>
            {staff && (
              <Link href="/checkin" className="hover:text-safety">
                급식확인
              </Link>
            )}
            {admin && (
              <Link href="/admin" className="hover:text-safety">
                관리자
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/70">
          <span className="font-mono text-xs">
            {profile.name} · {roleLabel[profile.role]}
          </span>
          <form action={signOut}>
            <button className="rounded-sm border border-white/30 px-2 py-1 text-xs hover:bg-white/10">
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
