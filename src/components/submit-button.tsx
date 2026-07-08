"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingText = "처리 중…",
  className = "",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${className} disabled:opacity-50`}>
      {pending ? pendingText : children}
    </button>
  );
}
