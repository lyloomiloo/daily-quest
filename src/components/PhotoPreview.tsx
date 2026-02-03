"use client";

import { useState, useMemo } from "react";
import type { Pin } from "@/lib/data";
import { uploadPhotoAndCreatePin } from "@/lib/upload";

interface PhotoPreviewProps {
  blob: Blob;
  wordDate: string; // YYYY-MM-DD for today's word
  onRetake: () => void;
  onDropIt: (pin: Pin) => void;
  onBack: () => void;
}

// Mock Barcelona center for new pin when we don't have geolocation yet
const FALLBACK_LAT = 41.3874;
const FALLBACK_LNG = 2.1686;

export default function PhotoPreview({
  blob,
  wordDate,
  onRetake,
  onDropIt,
  onBack,
}: PhotoPreviewProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(() => URL.createObjectURL(blob), [blob]);

  const handleDropIt = async () => {
    setUploading(true);
    setError(null);
    try {
      let lat = FALLBACK_LAT;
      let lng = FALLBACK_LNG;
      let streetName: string | null = null;

      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        }).catch(() => null);
        if (pos) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
              { headers: { "Accept-Language": "en" } }
            );
            const data = await res.json();
            streetName =
              data.address?.road ||
              data.address?.pedestrian ||
              data.address?.footway ||
              data.address?.street ||
              null;
          } catch {
            streetName = null;
          }
        }
      }

      const uploadedPin = await uploadPhotoAndCreatePin({
        blob,
        latitude: lat,
        longitude: lng,
        streetName,
        wordDate,
      });

      if (uploadedPin) {
        onDropIt(uploadedPin);
        return;
      }

      // Fallback when Supabase is not configured or upload failed: use blob URL (pin only in local state)
      const pin: Pin = {
        id: `pin-${Date.now()}`,
        image_url: previewUrl,
        latitude: lat,
        longitude: lng,
        street_name: streetName,
        word_date: wordDate,
      };
      onDropIt(pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ zIndex: 200 }}>
      <div className="p-4 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-white"
          aria-label="Back to camera"
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

      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <img
          src={previewUrl}
          alt="Preview"
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {error && (
        <p className="px-4 py-2 text-red-400 text-sm font-mono">{error}</p>
      )}
      <div className="p-4 flex gap-4 shrink-0">
        <button
          type="button"
          onClick={onRetake}
          className="flex-1 py-4 border-2 border-white text-white font-mono text-sm uppercase tracking-wider flex items-center justify-center gap-2"
          aria-label="Retake photo"
        >
          <span className="text-lg leading-none" aria-hidden>↻</span>
          Retake
        </button>
        <button
          type="button"
          onClick={handleDropIt}
          disabled={uploading}
          className="flex-1 py-4 bg-white text-black font-mono text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
          aria-label="Drop it"
        >
          <span className="text-lg leading-none" aria-hidden>↓</span>
          {uploading ? "..." : "Drop it"}
        </button>
      </div>
    </div>
  );
}
