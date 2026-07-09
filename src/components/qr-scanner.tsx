"use client";

import { useEffect, useRef, useState } from "react";
import { checkInToken } from "@/app/checkin/actions";
import { btnPrimary } from "@/components/ui";

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

// Standard "enter fullscreen" glyph (four arrows pointing outward to the
// corners) — the same shape used by YouTube's and most video players'
// fullscreen button.
function EnterFullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
      />
    </svg>
  );
}

// "Exit fullscreen" glyph — same four arrows, pointing inward instead.
function ExitFullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
      />
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
  const resultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // the text message below it.
    setFeedback(res.ok ? "success" : "error");
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setFeedback(null), 1400);

    // Auto-dismiss the text message too, so it doesn't linger on screen
    // until the next scan.
    if (resultTimeout.current) clearTimeout(resultTimeout.current);
    resultTimeout.current = setTimeout(() => setResult(null), 3000);
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

  // Forces the injected <video> to fill the (square) container instead of
  // keeping the fixed pixel width html5-qrcode assigns it. This runs
  // synchronously right after start() resolves, which is reliably before the
  // video's "playing" event — the point where the library reads the video's
  // rendered size to compute the scan box — so the scan box ends up aligned
  // with a square viewfinder instead of the video's native (often landscape)
  // camera aspect ratio.
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
          // Nearly fill the (square) viewfinder, leaving only a thin margin.
          // Besides making the scan target bigger, keeping the margin under
          // ~11px also makes html5-qrcode skip its corner "match" brackets —
          // those are what were flashing green/white every frame depending on
          // whether that single frame happened to decode successfully.
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const dimension = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.max(dimension - 8, 50);
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

  // Toggling fullscreen only changes CSS layout — the running camera stream
  // is left untouched (no stop/restart), so the browser never re-prompts for
  // camera permission after the first grant. The video is already forced to
  // width/height 100% (see fillVideoElement), so it fills whichever box CSS
  // gives it; the scan box may momentarily be a little off from the exact
  // native crop right after resizing, but no new getUserMedia call happens.
  async function toggleFullscreen() {
    const next = !isFullscreen;
    setIsFullscreen(next);

    try {
      if (next) {
        await rootRef.current?.requestFullscreen?.();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
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
      if (resultTimeout.current) clearTimeout(resultTimeout.current);
      void stopScanner();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={isFullscreen ? "fixed inset-0 z-50 flex flex-col gap-3 bg-black p-3" : "flex flex-col gap-4"}
    >
      <div className={isFullscreen ? "flex flex-1 flex-col" : ""}>
        {!isFullscreen && (
          <p className="text-sm text-ink-soft">버튼을 누르면 브라우저가 카메라 권한을 물어봅니다. 허용하면 바로 촬영 화면이 켜집니다.</p>
        )}

        {cameraState !== "active" && (
          <button
            type="button"
            onClick={() => void startScanner()}
            disabled={cameraState === "requesting"}
            className={`${btnPrimary} mt-3 disabled:opacity-50`}
          >
            {cameraState === "requesting" ? "카메라 권한 요청 중…" : "카메라 켜기"}
          </button>
        )}

        {/* Fixed aspect-square preview when embedded in the page; fills the
            remaining space when in fullscreen. Result/pending text and the
            fullscreen toggle live as absolutely-positioned overlays inside
            this box so their appearing/disappearing never changes the box's
            own size (that was what caused the camera view to keep
            growing/shrinking). */}
        <div
          className={
            isFullscreen
              ? "relative mt-3 w-full flex-1 overflow-hidden rounded-sm border border-white/10 bg-black"
              : "relative mx-auto mt-3 aspect-square w-full max-w-sm overflow-hidden rounded-sm border border-rivet bg-black/5"
          }
        >
          <div id={READER_ELEMENT_ID} ref={containerRef} className="h-full w-full [&_video]:block" />

          {cameraState === "active" && (
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? "전체화면 종료" : "전체화면으로 보기"}
              className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              {isFullscreen ? <ExitFullscreenIcon /> : <EnterFullscreenIcon />}
            </button>
          )}

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

          {(pending || result) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[14%] flex flex-col items-center gap-2 px-4">
              {pending && (
                <p className="rounded-sm bg-black/70 px-4 py-2.5 text-center text-base font-semibold text-white shadow-lg">
                  체크인 처리 중...
                </p>
              )}
              {!pending && result && (
                <p
                  className={`rounded-sm px-4 py-2.5 text-center text-base font-semibold text-white shadow-lg ${
                    result.ok ? "bg-success/90" : "bg-danger/90"
                  }`}
                >
                  {result.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-sm border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>
      )}
    </div>
  );
}
