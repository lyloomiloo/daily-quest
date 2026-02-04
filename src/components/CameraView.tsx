"use client";

import { useRef, useCallback, useEffect, useState } from "react";

export type AspectRatio = "1:1" | "4:3";

const ZOOM_PRESETS = [0.5, 1, 3] as const;

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
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:3");
  const [zoomPreset, setZoomPreset] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [supportsZoom, setSupportsZoom] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          streamRef.current = stream;
          const videoTrack = stream.getVideoTracks()[0] ?? null;
          videoTrackRef.current = videoTrack;

          if (videoTrack) {
            const caps = videoTrack.getCapabilities() as Record<string, { min?: number; max?: number; step?: number }>;
            const settings = videoTrack.getSettings() as Record<string, number | undefined>;
            const supported = (navigator.mediaDevices.getSupportedConstraints?.() ?? {}) as Record<string, boolean>;
            if (supported.zoom && typeof caps.zoom === "object" && caps.zoom.min != null && caps.zoom.max != null) {
              const min = caps.zoom.min;
              const max = caps.zoom.max;
              setZoomMin(min);
              setZoomMax(max);
              const current = typeof settings.zoom === "number" ? settings.zoom : min;
              const closest = ZOOM_PRESETS.reduce((prev, p) =>
                Math.abs(p - current) < Math.abs(prev - current) ? p : prev
              );
              const initial = Math.max(min, Math.min(max, closest));
              setZoomPreset(initial);
              setSupportsZoom(max > min);
              videoTrack.applyConstraints({ zoom: initial } as MediaTrackConstraints).catch(() => {});
            }
          }

          try {
            await video.play();
          } catch {
            // play() can fail on some devices; camera may still work
          }
          setStreamReady(true);
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        setError("Camera access denied or unavailable.");
      }
    };

    startCamera();

    return () => {
      videoTrackRef.current = null;
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
    };
  }, []);

  const availableZoomPresets = ZOOM_PRESETS.filter((z) => z >= zoomMin && z <= zoomMax);
  const hasMultipleZoom = availableZoomPresets.length > 1;

  const setZoomPresetAndApply = useCallback(
    (preset: number) => {
      const clamped = Math.max(zoomMin, Math.min(zoomMax, preset));
      setZoomPreset(clamped);
      const track = videoTrackRef.current;
      if (track) {
        track.applyConstraints({ zoom: clamped } as MediaTrackConstraints).catch(() => {});
      }
    },
    [zoomMin, zoomMax]
  );

  // Crop region in video coords: 1:1 = square, 4:3 = portrait (3 wide, 4 tall → width/height = 3/4)
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
      // 4:3 portrait: width/height = 3/4, so height > width
      const targetRatio = 3 / 4; // sw / sh = 3/4
      if (vh >= vw / targetRatio) {
        const sw = vw;
        const sh = Math.round(vw / targetRatio);
        return { sx: 0, sy: (vh - sh) / 2, sw, sh };
      } else {
        const sh = vh;
        const sw = Math.round(vh * targetRatio);
        return { sx: (vw - sw) / 2, sy: 0, sw, sh };
      }
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
        <div className="w-10" />
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center overflow-hidden bg-black">
        {error ? (
          <div className="flex-1 flex items-center justify-center p-4 text-white text-center">
            {error}
          </div>
        ) : (
          <>
            {/* Viewfinder: clean rectangle, aspect ratio from toggle, centered. Optional rule-of-thirds grid. */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center min-w-0">
              <div
                className="relative overflow-hidden flex-shrink-0"
                style={{
                  aspectRatio: aspectRatio === "1:1" ? "1/1" : "3/4",
                  ...(aspectRatio === "1:1"
                    ? { width: "100%", maxHeight: "100%" }
                    : { height: "100%", maxWidth: "100%" }),
                  transition: "aspect-ratio 0.2s ease",
                }}
              >
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ minWidth: 1, minHeight: 1, display: "block" }}
                />
                {!streamReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-mono text-sm text-white/80">
                    Loading…
                  </div>
                )}
                {streamReady && (
                  <>
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-[#666] opacity-50" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-[#666] opacity-50" />
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-[#666] opacity-50" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-[#666] opacity-50" />
                    </div>
                    {/* Corner brackets — 1px, sharp, 50% transparent, inset from corners */}
                    <div className="absolute top-3 left-3 w-7 h-7 border-t border-l border-white opacity-50" />
                    <div className="absolute top-3 right-3 w-7 h-7 border-t border-r border-white opacity-50" />
                    <div className="absolute bottom-3 left-3 w-7 h-7 border-b border-l border-white opacity-50" />
                    <div className="absolute bottom-3 right-3 w-7 h-7 border-b border-r border-white opacity-50" />
                    {/* FIND AND FRAME: 80% down the frame */}
                    <div
                      className="absolute left-0 right-0 flex justify-center pointer-events-none"
                      style={{ top: "80%" }}
                    >
                      <span
                        className="font-mono uppercase text-white"
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.1em",
                          opacity: 0.7,
                        }}
                      >
                        FIND AND FRAME &quot;{wordEn}&quot;
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 24px gap */}
            <div style={{ height: 24 }} />

            {/* Row 1: Zoom toggles (left/center) + Ratio toggles (right) on same row */}
            <div className="flex items-center justify-between shrink-0 pb-6 w-full px-4">
              {hasMultipleZoom ? (
                <div className="flex items-center gap-1 font-mono" style={{ fontSize: "12px" }}>
                  {availableZoomPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setZoomPresetAndApply(preset)}
                      className={`px-2 py-1 border border-white uppercase ${
                        zoomPreset === preset
                          ? "bg-white text-black"
                          : "bg-transparent text-white"
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      {preset === 0.5 ? ".5x" : `${preset}x`}
                    </button>
                  ))}
                </div>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-1 font-mono" style={{ fontSize: "12px" }}>
                <button
                  type="button"
                  onClick={() => setAspectRatio("4:3")}
                  className={`px-2 py-1 border border-white uppercase ${
                    aspectRatio === "4:3" ? "bg-white text-black" : "bg-transparent text-white"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  4:3
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("1:1")}
                  className={`px-2 py-1 border border-white uppercase ${
                    aspectRatio === "1:1" ? "bg-white text-black" : "bg-transparent text-white"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  1:1
                </button>
              </div>
            </div>

            {/* 24px gap */}
            <div style={{ height: 24 }} />

            {/* Row 2: Shutter button centered */}
            <div className="flex items-center justify-center shrink-0 pb-6">
              <button
                type="button"
                onClick={capture}
                className="w-20 h-20 rounded-full border-4 border-white bg-transparent shrink-0"
                aria-label="Take photo"
                disabled={!streamReady}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
