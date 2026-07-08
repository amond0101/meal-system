"use client";

import { useEffect, useRef, useState } from "react";
import { checkInToken } from "@/app/checkin/actions";
import { btnSteel } from "@/components/ui";

export function QrScanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScan = useRef<{ token: string; time: number } | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [pending, setPending] = useState(false);

  const handleToken = async (token: string) => {
    const now = Date.now();
    if (lastScan.current && lastScan.current.token === token && now - lastScan.current.time < 4000) {
      return;
    }
    lastScan.current = { token, time: now };

    setPending(true);
    const res = await checkInToken(token);
    setResult(res);
    setPending(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let scanner: import("html5-qrcode").Html5QrcodeScanner | undefined;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (cancelled || !containerRef.current) return;
      scanner = new Html5QrcodeScanner(
        containerRef.current.id,
        { fps: 10, qrbox: 250 },
        false
      );
      scanner.render(
        (decodedText) => handleToken(decodedText),
        () => {}
      );
    });

    return () => {
      cancelled = true;
      scanner?.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div id="qr-reader" ref={containerRef} className="mx-auto w-full max-w-sm" />

      {result && (
        <p
          className={`rounded-sm border px-3 py-2 text-sm ${
            result.ok ? "border-success bg-success/10 text-success" : "border-danger bg-danger/10 text-danger"
          }`}
        >
          {result.message}
        </p>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!manualToken.trim()) return;
          await handleToken(manualToken.trim());
          setManualToken("");
        }}
        className="flex gap-2"
      >
        <input
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          placeholder="카메라가 안 되면 QR 토큰을 직접 입력"
          className="flex-1 rounded-sm border border-rivet px-2 py-1 font-mono text-sm"
        />
        <button disabled={pending} className={`${btnSteel} disabled:opacity-50`}>
          확인
        </button>
      </form>
    </div>
  );
}
