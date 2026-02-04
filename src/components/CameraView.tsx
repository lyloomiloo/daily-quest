"use client";

import { useRef, useCallback, useEffect, useState } from "react";

export type AspectRatio = "1:1" | "4:3";

interface CameraViewProps {
  wordEn: string;
  onCapture: (blob: Blob) => void;
  onBack: () => void;
}

function getTouchDistance(a: Touch, b: Touch): number {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

export default function CameraView({
  wordEn,
  onCapture,
  onBack,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:3");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [exposureCompensation, setExposureCompensation] = useState(0);
  const [exposureMin, setExposureMin] = useState(0);
  const [exposureMax, setExposureMax] = useState(0);
  const [supportsExposure, setSupportsExposure] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        console.log("[CameraView] Requesting camera...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        console.log("[CameraView] Got stream:", stream, "tracks:", stream.getTracks().length);

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
              const current = settings.zoom;
              setZoomLevel(typeof current === "number" ? current : min);
              setSupportsZoom(max > min);
            }
            if (
              supported.exposureCompensation &&
              typeof caps.exposureCompensation === "object" &&
              caps.exposureCompensation.min != null &&
              caps.exposureCompensation.max != null
            ) {
              setExposureMin(caps.exposureCompensation.min);
              setExposureMax(caps.exposureCompensation.max);
              const current = settings.exposureCompensation;
              setExposureCompensation(
                typeof current === "number" ? current : caps.exposureCompensation.min
              );
              setSupportsExposure(caps.exposureCompensation.max !== caps.exposureCompensation.min);
            }
          }

          try {
            await video.play();
            console.log("[CameraView] Video playing, dimensions:", video.videoWidth, "x", video.videoHeight);
          } catch (playErr) {
            console.error("[CameraView] video.play() failed:", playErr);
          }
          setStreamReady(true);
        } else {
          console.warn("[CameraView] No video ref, stopping stream");
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (err) {
        console.error("[CameraView] Camera error:", err);
        setError("Camera access denied or unavailable.");
      }
    };

    startCamera();

    return () => {
      videoTrackRef.current = null;
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((track) => track.stop());
        console.log("[CameraView] Cleanup: stopped tracks");
      }
      streamRef.current = null;
    };
  }, []);

  const applyZoom = useCallback((value: number) => {
    const track = videoTrackRef.current;
    if (!track) return;
    const clamped = Math.max(zoomMin, Math.min(zoomMax, value));
    setZoomLevel(clamped);
    track.applyConstraints({ zoom: clamped } as MediaTrackConstraints).catch(() => {});
  }, [zoomMin, zoomMax]);

  const applyExposure = useCallback((value: number) => {
    const track = videoTrackRef.current;
    if (!track) return;
    const clamped = Math.max(exposureMin, Math.min(exposureMax, value));
    setExposureCompensation(clamped);
    track.applyConstraints({ exposureCompensation: clamped } as MediaTrackConstraints).catch(() => {});
  }, [exposureMin, exposureMax]);

  useEffect(() => {
    if (!supportsZoom) return;
    const el = videoRef.current?.parentElement;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartRef.current = {
          distance: getTouchDistance(e.touches[0], e.touches[1]),
          zoom: zoomLevel,
        };
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) {
        e.preventDefault();
        const distance = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = distance / pinchStartRef.current.distance;
        const next = pinchStartRef.current.zoom * scale;
        applyZoom(next);
      }
    };
    const handleTouchEnd = () => {
      pinchStartRef.current = null;
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [supportsZoom, zoomLevel, applyZoom]);

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

      <div className="flex-1 relative min-h-0 flex items-center justify-center overflow-hidden bg-black">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-white text-center">
            {error}
          </div>
        ) : (
          <>
            {/* Viewfinder: resizes with selection. 1:1 = square, 4:3 = vertical rectangle. Centered, black outside. */}
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
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-[#666] opacity-60" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-[#666] opacity-60" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-[#666] opacity-60" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-[#666] opacity-60" />
                  </div>
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                </>
              )}
            </div>

            {/* Zoom level indicator (only if device supports zoom) */}
            {supportsZoom && streamReady && (
              <div
                className="absolute top-3 left-3 font-mono text-xs bg-black/70 text-white px-2 py-1"
                style={{ borderRadius: 0 }}
              >
                {zoomLevel.toFixed(1)}x
              </div>
            )}

            {/* Exposure slider (only if device supports it) */}
            {supportsExposure && streamReady && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
                <span className="font-mono text-[10px] text-white/80 uppercase">Exp</span>
                <input
                  type="range"
                  min={exposureMin}
                  max={exposureMax}
                  step={0.1}
                  value={exposureCompensation}
                  onChange={(e) => applyExposure(Number(e.target.value))}
                  className="w-16 h-1.5 accent-white bg-white/30"
                  style={{ transform: "rotate(-90deg)", marginTop: "2rem" }}
                />
              </div>
            )}

            {/* Brutalist toggle: bottom-right, 8–12px from edges. Sharp, high contrast. */}
            <div
              className="absolute flex items-stretch font-mono text-xs uppercase tracking-wider overflow-hidden border-2 border-black"
              style={{
                bottom: 10,
                right: 10,
                borderRadius: 0,
              }}
            >
              <button
                type="button"
                onClick={() => setAspectRatio("1:1")}
                className={`px-2 py-1.5 border-r-2 border-black ${
                  aspectRatio === "1:1"
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
                style={{ borderRadius: 0 }}
              >
                1:1
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("4:3")}
                className={`px-2 py-1.5 ${
                  aspectRatio === "4:3"
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
                style={{ borderRadius: 0 }}
              >
                4:3
              </button>
            </div>
          </>
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
