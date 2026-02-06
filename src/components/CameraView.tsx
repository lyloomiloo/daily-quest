"use client";

import { useRef, useCallback, useEffect } from "react";

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

  // Immediately open native camera when component mounts
  useEffect(() => {
    inputRef.current?.click();
  }, []);

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

  // Hidden file input for native camera
  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleFile}
      style={{ display: "none" }}
      aria-label="Camera capture"
    />
  );
}
