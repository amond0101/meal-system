"use client";

import { useState } from "react";

export function QrLightbox({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={() => setOpen(true)}
        className="h-20 w-20 cursor-zoom-in"
      />

      {open && (
        <button
          type="button"
          aria-label="QR 코드 닫기"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-ink/80 p-8"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="aspect-square w-full max-w-sm rounded-sm bg-paper-raised p-6"
          />
        </button>
      )}
    </>
  );
}
