"use client";

import { useCallback } from "react";
import type { Pin } from "@/lib/data";
import { downloadImage } from "@/lib/download";

interface LightboxProps {
  pin: Pin | null;
  onClose: () => void;
}

function downloadFilename(pin: Pin): string {
  const d = pin.word_date || new Date().toISOString().slice(0, 10);
  return `daily-quest-${d}.jpg`;
}

export default function Lightbox({ pin, onClose }: LightboxProps) {
  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!pin?.image_url) return;
      downloadImage(pin.image_url, downloadFilename(pin));
    },
    [pin]
  );

  if (!pin) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-14 w-10 h-10 flex items-center justify-center text-white text-2xl font-light hover:bg-white/10"
        aria-label="Close"
      >
        ×
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white hover:bg-white/10"
        aria-label="Download photo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      <div
        className="flex flex-col items-center max-w-[90vw] max-h-[60vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={pin.image_url}
          alt=""
          className="max-w-full max-h-[55vh] object-contain"
        />
        <p className="text-white text-center mt-3 font-mono text-sm">
          {pin.street_name || "Unknown street"}
        </p>
      </div>
    </div>
  );
}
