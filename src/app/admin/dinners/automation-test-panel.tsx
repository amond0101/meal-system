"use client";

import { useState, useTransition } from "react";
import { testScheduleOpenDinner, testSweepExpiredDinners } from "./actions";
import { btnOutline } from "@/components/ui";

export function AutomationTestPanel() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const run = (action: () => Promise<{ ok: boolean; message: string }>) => {
    setResult(null);
    startTransition(async () => {
      setResult(await action());
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-soft">
        아래 두 동작은 원래 매주 자동으로 실행됩니다 (목요일 09:00 신청 오픈 / 수요일 20:00 노쇼 마감·벌점 부여).
        실제 시각을 기다리지 않고 지금 바로 실행해서 테스트할 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(testScheduleOpenDinner)}
          className={`${btnOutline} disabled:opacity-50`}
        >
          다음 회차 자동 생성 테스트
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(testSweepExpiredDinners)}
          className={`${btnOutline} disabled:opacity-50`}
        >
          노쇼 마감 스윕 테스트
        </button>
      </div>
      {result && (
        <p
          className={`rounded-sm border px-3 py-2 text-sm ${
            result.ok ? "border-success bg-success/10 text-success" : "border-danger bg-danger/10 text-danger"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
