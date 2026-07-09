"use client";

import { useEffect, useRef, useState } from "react";

// The stub only needs to look good at ~80px; the lightbox renders at a much
// higher pixel size so it stays crisp even scaled up on a phone screen.
const STUB_SIZE = 160;
const EXPANDED_SIZE = 640;

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Renders a student's check-in QR from just their `qr_token`, entirely on the
 * client. This used to be a full PNG data URL baked server-side into every
 * page response (once per ticket, via the `qrcode` package's toDataURL) —
 * that inflated the HTML payload and spent server CPU on every load even
 * when nobody ever opened the QR. Now the page ships only the short token
 * string, and the actual image is drawn into a <canvas> after hydration.
 */
export function QrLightbox({ token, alt }: { token: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [stubReady, setStubReady] = useState(false);
  const [bigReady, setBigReady] = useState(false);
  const stubRef = useRef<HTMLCanvasElement>(null);
  const bigRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { toCanvas } = await import("qrcode");
      if (cancelled || !stubRef.current) return;
      await toCanvas(stubRef.current, token, {
        width: STUB_SIZE,
        margin: 0,
        color: { dark: "#1c2321", light: "#00000000" },
      });
      if (!cancelled) setStubReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Only encode the bigger version the first time the ticket is actually
  // opened, and only once — reopening the same ticket reuses the canvas
  // already drawn instead of re-encoding it.
  useEffect(() => {
    if (!open || bigReady) return;
    let cancelled = false;
    (async () => {
      const { toCanvas } = await import("qrcode");
      if (cancelled || !bigRef.current) return;
      await toCanvas(bigRef.current, token, {
        width: EXPANDED_SIZE,
        margin: 0,
        color: { dark: "#1c2321", light: "#00000000" },
      });
      if (!cancelled) setBigReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, bigReady, token]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${alt} 확대`}
        className="rounded-sm p-0.5 transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <canvas
          ref={stubRef}
          width={STUB_SIZE}
          height={STUB_SIZE}
          className={`h-20 w-20 cursor-zoom-in rounded-sm ${
            stubReady ? "" : "animate-pulse bg-rivet-line/50"
          }`}
        />
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            type="button"
            aria-label="배경 닫기"
            onClick={() => setOpen(false)}
            className="qr-backdrop-in absolute inset-0 cursor-zoom-out bg-ink/80 backdrop-blur-sm"
          />

          <div className="qr-card-in relative w-full max-w-xs">
            <div className="overflow-hidden rounded-md border border-rivet-line bg-paper-raised shadow-2xl">
              <div className="h-1.5 bg-safety" aria-hidden />

              <div className="flex flex-col items-center gap-4 px-6 py-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-steel">
                  Meal Ticket · Check-in QR
                </p>

                <div className="qr-glow relative overflow-hidden rounded-sm border border-rivet-line bg-white p-4">
                  <canvas
                    ref={bigRef}
                    width={EXPANDED_SIZE}
                    height={EXPANDED_SIZE}
                    className="aspect-square w-full max-w-[260px]"
                  />
                  {!bigReady && (
                    <div className="absolute inset-4 animate-pulse rounded-sm bg-rivet-line/40" aria-hidden />
                  )}
                  {bigReady && (
                    <span
                      className="qr-sweep pointer-events-none inset-x-0 h-10 bg-gradient-to-b from-safety/50 via-safety/10 to-transparent"
                      aria-hidden
                    />
                  )}
                </div>

                <p className="text-center text-xs text-ink-soft">
                  급식 수령 시 이 화면을 담당 선생님께 보여주세요
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="pressable absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-rivet-line bg-paper-raised text-ink shadow-md hover:bg-paper"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
