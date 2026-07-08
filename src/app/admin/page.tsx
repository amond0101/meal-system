import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, isAdmin } from "@/lib/profile";
import { Card, PageTitle } from "@/components/ui";

export default async function AdminHome() {
  const profile = await getProfile();
  if (!isAdmin(profile)) redirect("/");

  const links = [
    { href: "/checkin/scan", label: "QR 체크인", desc: "카메라 권한 허용 후 QR 스캔으로 체크인 처리" },
    { href: "/admin/dinners", label: "회차 관리", desc: "수요석식 회차 생성/수정, 마감 처리" },
    { href: "/admin/users", label: "사용자 관리", desc: "역할(학생/담당교사/관리자) 변경" },
    { href: "/admin/demerits", label: "벌점 현황", desc: "노쇼 벌점 기록 조회" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageTitle>관리자</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="transition hover:border-steel">
              <p className="font-display font-semibold uppercase tracking-wide text-ink">{l.label}</p>
              <p className="mt-1 text-sm text-ink-soft">{l.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
