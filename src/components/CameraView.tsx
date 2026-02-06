"use client";

import { useRef, useCallback } from "react";

interface CameraViewProps {
  wordEn: string;
  onCapture: (blob: Blob) => void;
  onBack: () => void;
}

export default function CameraView({
  wordEn,
  onCapture,
  onBack,
}: CameraViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onCapture(file);
      }
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [onCapture]
  );

  const handleOpenCamera = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      style={{ zIndex: 200 }}
    >
      {/* Back arrow top-left */}
      <div className="p-4 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-white"
          aria-label="Back to map"
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Centered instruction content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-4xl mb-8" aria-hidden="true">
          👁️👁️
        </div>
        <p
          className="font-mono text-white uppercase tracking-wider mb-4"
          style={{ fontSize: "14px", letterSpacing: "0.1em" }}
        >
          FIND AND FRAME
        </p>
        <h1
          className="font-bold text-white uppercase mb-12"
          style={{ fontSize: "48px" }}
        >
          {wordEn}
        </h1>
        <button
          type="button"
          onClick={handleOpenCamera}
          className="font-mono text-sm uppercase tracking-wider text-white border-2 border-white px-8 py-4 hover:bg-white hover:text-black transition-colors"
          style={{ borderRadius: 0 }}
        >
          OPEN CAMERA
        </button>
      </div>

      {/* Hidden file input for native camera */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: "none" }}
        aria-label="Camera capture"
      />
    </div>
  );
}
