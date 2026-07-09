"use client";

import { useEffect, useRef, useState } from "react";
import { checkInToken } from "@/app/checkin/actions";
import { btnSteel, btnPrimary } from "@/components/ui";

type CameraState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export function QrScanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScan = useRef<{ token: string; time: number } | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
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

  const requestCamera = async () => {
    setCameraState("requesting");
    setResult(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("unavailable");
        return;
      }
      // Explicit getUserMedia call forces the browser to show its permission
      // prompt before the scanner library takes over.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((t) => t.stop());
      setCameraState("granted");
    } catch {
      setCameraState("denied");
    }
  };

  useEffect(() => {
    if (cameraState !== "granted" || !containerRef.current) return;
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
  }, [cameraState]);

  return (
    <div className="flex flex-col gap-4">
      {cameraState !== "granted" && (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-rivet-line bg-paper-raised p-6">
          <button
            type="button"
            onClick={requestCamera}
            disabled={cameraState === "requesting"}
            className={`${btnPrimary} disabled:opacity-50`}
          >
            {cameraState === "requesting" ? "권한 요청 중…" : "카메라 켜기 (권한 요청)"}
          </button>
          {cameraState === "denied" && (
            <p className="text-center text-xs text-danger">
              카메라 권한이 거부되었습니다. 주소창의 자물쇠 아이콘 → 카메라 → 허용으로 바꾼 뒤 다시
              눌러주세요.
            </p>
          )}
          {cameraState === "unavailable" && (
            <p className="text-center text-xs text-danger">
              이 브라우저에서는 카메라를 사용할 수 없습니다. 아래에 토큰을 직접 입력해주세요.
            </p>
          )}
        </div>
      )}

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
