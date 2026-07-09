"use client";

import { useEffect, useRef, useState } from "react";
import { checkInToken } from "@/app/checkin/actions";
import { btnOutline, btnPrimary } from "@/components/ui";

type CameraState = "idle" | "requesting" | "active" | "error";
type Feedback = "success" | "error" | null;

const READER_ELEMENT_ID = "qr-reader";

function describeCameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : undefined;

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "카메라 권한이 거부되었습니다. 브라우저 주소창의 자물쇠(또는 사이트 정보) 아이콘 → 카메라 권한을 허용으로 바꾼 뒤 다시 눌러주세요.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "이 기기에서 사용 가능한 카메라를 찾지 못했습니다.";
  }
  if (name === "NotReadableError") {
    return "다른 앱이 카메라를 사용 중입니다. 카메라를 쓰는 다른 앱/탭을 닫고 다시 시도해주세요.";
  }
  if (err instanceof Error && err.message === "unsupported") {
    return "이 브라우저는 카메라 사용을 지원하지 않습니다.";
  }
  return "카메라를 열지 못했습니다. 다시 시도해주세요.";
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-14 w-14">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-14 w-14">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function QrScanner() {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastScan = useRef<{ token: string; time: number } | null>(null);
  const processingRef = useRef(false);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    setPending(false);
    processingRef.current = false;

    // Flash a big check/x mark over the camera view so an admin scanning many
    // students in a row gets an immediate glance-able result, separate from
    // the persistent text message below.
    setFeedback(res.ok ? "success" : "error");
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setFeedback(null), 1400);
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {}

    try {
      scanner.clear();
    } catch {}
  }

  // Fills the container with the injected <video>. html5-qrcode sets a fixed
  // pixel width on the video element based on the container's width at start
  // time — force it to visually fill the box on every screen size instead.
  function fillVideoElement() {
    const video = containerRef.current?.querySelector("video");
    if (!video) return;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
  }

  async function startScanner() {
    if (cameraState === "requesting" || cameraState === "active" || !containerRef.current) return;

    setResult(null);
    setErrorMessage(null);
    setCameraState("requesting");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("unsupported");
      }

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      if (!containerRef.current) return;

      const scanner = new Html5Qrcode(READER_ELEMENT_ID, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;

      // Clicking the button is the user gesture — start() is called directly
      // (no extra await before it) so the browser's getUserMedia permission
      // prompt fires immediately, and the live video shows as soon as it's
      // granted. NOTE: html5-qrcode only accepts facingMode as a plain string
      // ("environment") or an { exact } object — an { ideal } object throws
      // synchronously before getUserMedia is ever called.
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7);
            return { width: size, height: size };
          },
          disableFlip: true,
        },
        (decodedText) => {
          void handleToken(decodedText);
        },
        () => {}
      );

      fillVideoElement();
      setCameraState("active");
    } catch (err) {
      await stopScanner();
      setCameraState("error");
      setErrorMessage(describeCameraError(err));
    }
  }

  // Toggling fullscreen resizes the reader container. html5-qrcode computes
  // the scan box and video size once at start() time and doesn't react to
  // later resizes, so the camera is restarted after the layout settles to
  // keep the scan box aligned with the (now differently sized) video.
  async function toggleFullscreen() {
    const next = !isFullscreen;
    const wasActive = cameraState === "active";

    if (wasActive) {
      await stopScanner();
      setCameraState("idle");
    }

    setIsFullscreen(next);

    try {
      if (next) {
        await rootRef.current?.requestFullscreen?.();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}

    if (wasActive) {
      setTimeout(() => void startScanner(), 50);
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      if (!document.fullscreenElement) setIsFullscreen(false);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
      void stopScanner();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col gap-3 bg-black p-3"
          : "flex flex-col gap-4"
      }
    >
      <div className={isFullscreen ? "flex flex-1 flex-col" : ""}>
        {!isFullscreen && (
          <p className="text-sm text-ink-soft">버튼을 누르면 브라우저가 카메라 권한을 물어봅니다. 허용하면 바로 촬영 화면이 켜집니다.</p>
        )}

        <div className={`flex flex-wrap items-center gap-2 ${isFullscreen ? "mb-3" : "mt-3"}`}>
          {cameraState !== "active" && (
            <button
              type="button"
              onClick={() => void startScanner()}
              disabled={cameraState === "requesting"}
              className={`${btnPrimary} disabled:opacity-50`}
            >
              {cameraState === "requesting" ? "카메라 권한 요청 중…" : "카메라 켜기"}
            </button>
          )}

          {cameraState === "active" && (
            <button type="button" onClick={() => void toggleFullscreen()} className={btnOutline}>
              {isFullscreen ? "전체화면 종료" : "전체화면으로 보기"}
            </button>
          )}
        </div>

        <div
          className={
            isFullscreen
              ? "relative mx-auto w-full max-w-none flex-1 overflow-hidden rounded-sm border border-white/10 bg-black"
              : "relative mx-auto mt-3 w-full max-w-sm overflow-hidden rounded-sm border border-rivet bg-black/5"
          }
        >
          <div
            id={READER_ELEMENT_ID}
            ref={containerRef}
            style={{ minHeight: cameraState === "active" ? (isFullscreen ? "100%" : 320) : 0 }}
            className="h-full w-full empty:border-0 empty:bg-transparent [&_video]:block"
          />

          {feedback && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg ${
                  feedback === "success" ? "bg-success/90" : "bg-danger/90"
                }`}
              >
                {feedback === "success" ? <CheckIcon /> : <XIcon />}
              </div>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>
      )}

      {pending && <p className="rounded-sm border border-rivet bg-paper px-3 py-2 text-sm text-ink-soft">체크인 처리 중...</p>}

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
