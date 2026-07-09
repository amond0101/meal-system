"use client";

import { useState } from "react";
import { upsertDinner } from "./actions";
import { btnSteel } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function DinnerForm({ defaultDate }: { defaultDate: string }) {
  const [date, setDate] = useState(defaultDate);

  return (
    <form action={upsertDinner} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        날짜
        <input
          name="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="rounded-sm border border-rivet px-2 py-1 font-mono"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        신청 마감 시각
        <input
          name="application_deadline"
          type="datetime-local"
          required
          className="rounded-sm border border-rivet px-2 py-1 font-mono"
        />
      </label>
      <SubmitButton className={`${btnSteel} self-start`} pendingText="저장 중…">
        저장
      </SubmitButton>
    </form>
  );
}
