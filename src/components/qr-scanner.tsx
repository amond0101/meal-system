"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { checkInToken } from "@/app/checkin/actions";

export function QrScanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScan = useRef<{ token: string; time: number } | null>(null);
  const processingRef = useRef(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [pending, setPending] = useState(false);

  const handleToken = useEffectEvent(async (token: string) => {
    const normalized = token.trim();
    if (!normalized || processingRef.current) return;

    const now = Date.now();
    if (lastScan.current && lastScan.current.token === normalized && now - lastScan.current.time < 4000) {
      return;
    }
    lastScan.current = { token: normalized, time: now };

    processingRef.current = true;
    setPending(true);
    const res = await checkInToken(normalized);
    setResult(res);
    processingRef.current = false;
    setPending(false);
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let scanner: import("html5-qrcode").Html5Qrcode | undefined;
    let cancelled = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled || !containerRef.current) return;

        scanner = new Html5Qrcode(containerRef.current.id, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        await scanner.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1,
            disableFlip: true,
          },
          (decodedText) => {
            void handleToken(decodedText);
          },
          () => {}
        );

        if (!cancelled) {
          setCameraReady(true);
          setCameraError(null);
        }
      } catch {
        if (!cancelled) {
          setCameraReady(false);
          setCameraError("카메라를 열지 못했습니다. 브라우저 권한을 허용하고 다시 시도해주세요.");
        }
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      if (!scanner) return;
      if (scanner.isScanning) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            scanner?.clear();
          });
        return;
      }
      scanner.clear();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-ink-soft">휴대폰 후면 카메라로 학생 QR을 비춰 체크인하세요.</p>
        <div
          id="qr-reader"
          ref={containerRef}
          className="mx-auto mt-3 aspect-square w-full max-w-sm overflow-hidden rounded-sm border border-rivet bg-black/5"
        />
      </div>

      {!cameraReady && !cameraError && (
        <p className="rounded-sm border border-rivet bg-paper px-3 py-2 text-sm text-ink-soft">카메라 준비 중...</p>
      )}

      {cameraError && <p className="rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{cameraError}</p>}

      {pending && (
        <p className="rounded-sm border border-rivet bg-paper px-3 py-2 text-sm text-ink-soft">체크인 처리 중...</p>
      )}

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
