"use client";

import { useCallback } from "react";
import type { Pin } from "@/lib/data";
import { downloadImage } from "@/lib/download";

interface UploadConfirmationProps {
  newPin: Pin | null;
}

function getDefaultFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `daily-quest-${y}-${m}-${day}.jpg`;
}

export default function UploadConfirmation({ newPin }: UploadConfirmationProps) {
  const handleSave = useCallback(() => {
    if (!newPin?.image_url) return;
    downloadImage(newPin.image_url, getDefaultFilename());
  }, [newPin]);

  return (
    <div
      className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center gap-6 p-4"
      style={{ zIndex: 9999 }}
    >
      <p className="font-mono text-white text-lg uppercase tracking-wider">
        Dropped!
      </p>
      {newPin?.image_url && (
        <button
          type="button"
          onClick={handleSave}
          className="font-mono text-sm uppercase tracking-wider text-white border-2 border-white px-4 py-2 hover:bg-white hover:text-black"
        >
          Save to device
        </button>
      )}
    </div>
  );
}
