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
      // qrcode's canvas renderer sets inline `style.width`/`style.height`
      // (in px, matching the `width` option above) directly on the element —
      // inline styles beat every Tailwind class, so without clearing them
      // here the canvas ignores our `h-20 w-20` sizing entirely and renders
      // at its raw pixel resolution instead (the actual cause of the
      // "stretched on mobile" bug: nothing was scaling it down at all).
      if (stubRef.current) {
        stubRef.current.style.width = "";
        stubRef.current.style.height = "";
      }
      if (!cancelled) setStubReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Encode the bigger version every time the ticket is opened. This canvas
  // only exists while the dialog below is mounted (it's inside `{open && (…)}`),
  // so closing and reopening creates a brand-new, blank <canvas> element each
  // time — re-running this unconditionally (instead of guarding on a
  // "did we already draw it once" flag) is what makes sure the *new* canvas
  // actually gets the QR drawn into it instead of staying blank.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBigReady(false);
    (async () => {
      const { toCanvas } = await import("qrcode");
      if (cancelled || !bigRef.current) return;
      await toCanvas(bigRef.current, token, {
        width: EXPANDED_SIZE,
        margin: 0,
        color: { dark: "#1c2321", light: "#00000000" },
      });
      // Same fix as the stub above — clear the library's inline px size so
      // our responsive `w-full max-w-[260px] aspect-square` classes apply.
      if (bigRef.current) {
        bigRef.current.style.width = "";
        bigRef.current.style.height = "";
      }
      if (!cancelled) setBigReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token]);

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

              <div className="flex flex-col items-center gap-4 bg-paper px-6 py-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-steel">
                  Meal Ticket · Check-in QR
                </p>

                {/* No separate white card behind the QR here — the outer
                    card is already `bg-paper-raised` (white), so a second
                    white box just looked like unexplained blank padding.
                    This section instead sits on `bg-paper` (the same recessed
                    tone the compact ticket stub uses) and the QR draws
                    straight onto it with a transparent background. */}
                <div className="qr-glow relative w-full overflow-hidden rounded-sm p-3">
                  {/* `w-full` on the wrapper above gives this canvas's `w-full`
                      a definite percentage base. Without it, this box sits in
                      a `justify-center` flex column with no explicit width of
                      its own, so the canvas's percentage width has nothing
                      definite to resolve against — some mobile browsers then
                      fall back to the canvas's raw pixel resolution (640px),
                      rendering it stretched way past the card. */}
                  <canvas
                    ref={bigRef}
                    width={EXPANDED_SIZE}
                    height={EXPANDED_SIZE}
                    className="aspect-square w-full max-w-[260px]"
                  />
                  {!bigReady && (
                    <div className="absolute inset-3 animate-pulse rounded-sm bg-rivet-line/40" aria-hidden />
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
