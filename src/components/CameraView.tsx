"use client";

import { useRef, useCallback, useEffect, useState } from "react";

export type AspectRatio = "1:1" | "4:3";

interface CameraViewProps {
  wordEn: string;
  onCapture: (blob: Blob) => void;
  onBack: () => void;
  initialStreamRef?: React.MutableRefObject<MediaStream | null>;
}

export default function CameraView({
  wordEn,
  onCapture,
  onBack,
  initialStreamRef,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");

  useEffect(() => {
    const stream = initialStreamRef?.current ?? null;
    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamReady(true);
      return;
    }
    let localStream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = localStream;
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
        setStreamReady(true);
      } catch {
        setError("Camera access denied or unavailable.");
      }
    };
    startCamera();
    return () => {
      if (localStream && streamRef.current === localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [initialStreamRef]);

  const cropToAspect = useCallback(
    (video: HTMLVideoElement): { sx: number; sy: number; sw: number; sh: number } => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (aspectRatio === "1:1") {
        const size = Math.min(vw, vh);
        return {
          sx: (vw - size) / 2,
          sy: (vh - size) / 2,
          sw: size,
          sh: size,
        };
      }
      // 4:3 (width : height)
      const targetRatio = 4 / 3;
      const currentRatio = vw / vh;
      let sw: number, sh: number, sx: number, sy: number;
      if (currentRatio > targetRatio) {
        sh = vh;
        sw = Math.round(vh * targetRatio);
        sx = (vw - sw) / 2;
        sy = 0;
      } else {
        sw = vw;
        sh = Math.round(vw / targetRatio);
        sx = 0;
        sy = (vh - sh) / 2;
      }
      return { sx, sy, sw, sh };
    },
    [aspectRatio]
  );

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.readyState !== 4) return;
    const { sx, sy, sw, sh } = cropToAspect(video);
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture, cropToAspect]);

  return (
    <div
      className="fixed inset-0 bg-black flex flex-col"
      style={{ zIndex: 200 }}
    >
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
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAspectRatio("1:1")}
            className={`px-2 py-1 font-mono text-xs uppercase ${
              aspectRatio === "1:1"
                ? "bg-white text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            1:1
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio("4:3")}
            className={`px-2 py-1 font-mono text-xs uppercase ${
              aspectRatio === "4:3"
                ? "bg-white text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            4:3
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 flex items-center justify-center">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-white text-center">
            {error}
          </div>
        ) : !streamReady ? (
          <div className="text-white/80 font-mono text-sm">Loading…</div>
        ) : (
          <div
            className="relative w-full max-h-full overflow-hidden"
            style={{
              aspectRatio: aspectRatio === "1:1" ? "1" : "4/3",
              maxWidth: aspectRatio === "1:1" ? "min(100vw, 100dvh)" : "100%",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ display: "block" }}
            />
            {/* Rule-of-thirds grid */}
            <div className="absolute inset-0 pointer-events-none">
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
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 flex flex-col items-center gap-4 shrink-0">
        <p className="font-mono text-xs uppercase tracking-wider text-[#666] text-center">
          FIND AND FRAME &quot;{wordEn}&quot;
        </p>
        <button
          type="button"
          onClick={capture}
          className="w-20 h-20 rounded-full border-4 border-white bg-transparent"
          aria-label="Take photo"
          disabled={!streamReady}
        />
      </div>
    </div>
  );
}
