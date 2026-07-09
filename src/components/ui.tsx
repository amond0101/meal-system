import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`card-elevate rounded-sm border border-rivet-line bg-paper-raised p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 border-b border-rivet-line pb-2 font-display text-xs font-semibold uppercase tracking-[0.15em] text-steel">
      {children}
    </h2>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-semibold uppercase tracking-wide text-ink">
        {children}
      </h1>
      <div className="mt-2 h-1 w-10 rounded-full bg-safety" aria-hidden />
      {sub && <p className="mt-2 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

const statusStyle: Record<string, string> = {
  applied: "border-safety text-safety-ink bg-safety/15",
  checked_in: "border-success text-success bg-success/10",
  cancelled: "border-rivet text-ink-soft bg-rivet/10",
  no_show: "border-danger text-danger bg-danger/10",
  open: "border-success text-success bg-success/10",
  closed: "border-rivet text-ink-soft bg-rivet/10",
};

const statusText: Record<string, string> = {
  applied: "신청 완료",
  checked_in: "체크인 완료",
  cancelled: "취소됨",
  no_show: "노쇼",
  open: "진행중",
  closed: "마감됨",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={`stamp inline-block rounded-sm border-2 px-2 py-0.5 font-display text-xs font-semibold uppercase tracking-wider ${
        statusStyle[status] ?? "border-rivet text-ink-soft"
      }`}
    >
      {label ?? statusText[status] ?? status}
    </span>
  );
}

export const btnPrimary =
  "pressable rounded-sm bg-safety px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-safety-ink hover:brightness-95";
export const btnSteel =
  "pressable rounded-sm bg-steel px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-steel-dark";
export const btnOutline =
  "pressable rounded-sm border border-rivet px-3 py-1.5 text-sm text-ink hover:bg-paper";
export const btnDanger =
  "pressable rounded-sm border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger/10";
