"use client";

import { useEffect, useRef, useState } from "react";
import { checkInToken } from "@/app/checkin/actions";
import { btnSteel } from "@/components/ui";

export function QrScanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastScan = useRef<{ token: string; time: number } | null>(null);
  const processingRef = useRef(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [starting, setStarting] = useState(false);

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {}

    try {
      scanner.clear();
    } catch {}

    scannerRef.current = null;
    setCameraReady(false);
  }

  async function startScanner() {
    if (starting || cameraReady || !containerRef.current) return;

    setResult(null);
    setCameraError(null);
    setStarting(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("이 브라우저는 카메라 권한 요청을 지원하지 않습니다.");
      }

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

      const scanner = new Html5Qrcode(containerRef.current.id, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });

      scannerRef.current = scanner;
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

      setCameraReady(true);
    } catch {
      await stopScanner();
      setCameraError("브라우저에서 카메라 권한을 허용한 뒤 다시 시도해주세요.");
    } finally {
      setStarting(false);
    }
  }

  async function handleToken(token: string) {
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
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-ink-soft">버튼을 눌러 브라우저 카메라 권한을 허용한 뒤 학생 QR을 비춰 체크인하세요.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void startScanner()} disabled={starting || cameraReady} className={`${btnSteel} disabled:opacity-50`}>
            {starting ? "카메라 여는 중..." : cameraReady ? "카메라 사용 중" : "카메라 켜기"}
          </button>
        </div>
        <div
          id="qr-reader"
          ref={containerRef}
          className="mx-auto mt-3 aspect-square w-full max-w-sm overflow-hidden rounded-sm border border-rivet bg-black/5"
        />
      </div>

      {!cameraReady && !cameraError && !starting && (
        <p className="rounded-sm border border-rivet bg-paper px-3 py-2 text-sm text-ink-soft">아직 카메라 권한을 요청하지 않았습니다.</p>
      )}

      {starting && <p className="rounded-sm border border-rivet bg-paper px-3 py-2 text-sm text-ink-soft">카메라 권한 요청 중...</p>}

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
