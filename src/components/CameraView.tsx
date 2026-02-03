"use client";

import { useRef, useCallback, useEffect, useState } from "react";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setError("Camera access denied or unavailable.");
      }
    };
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.readyState !== 4) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 200 }}>
      <div className="flex items-center justify-between p-4 shrink-0">
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
        <span className="font-mono text-sm text-white/80 uppercase tracking-wider">
          {wordEn}
        </span>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative min-h-0">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-white text-center">
            {error}
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Rule-of-thirds grid overlay */}
            <div className="absolute inset-0 pointer-events-none flex">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-[#666] opacity-60" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-[#666] opacity-60" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-[#666] opacity-60" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-[#666] opacity-60" />
            </div>
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white rounded-br" />
          </>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 flex flex-col items-center gap-4 shrink-0">
        <p className="font-mono text-xs uppercase tracking-wider text-[#666] text-center">
          FIND AND FRAME {wordEn}
        </p>
        <button
          type="button"
          onClick={capture}
          className="w-20 h-20 rounded-full border-4 border-white bg-transparent"
          aria-label="Take photo"
        />
      </div>
    </div>
  );
}
