"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import type { Pin } from "@/lib/data";
import { downloadImage } from "@/lib/download";
import { uploadPhotoAndCreatePin } from "@/lib/upload";

interface PhotoPreviewProps {
  blob: Blob;
  wordDate: string; // YYYY-MM-DD for today's word
  onRetake: () => void;
  onDropIt: (pin: Pin) => void;
  onBack: () => void;
}

// Barcelona bounds for random placement when user has no GPS
const BARCELONA_LAT_MIN = 41.35;
const BARCELONA_LAT_MAX = 41.45;
const BARCELONA_LNG_MIN = 2.1;
const BARCELONA_LNG_MAX = 2.23;

function randomBarcelonaCoords(): { lat: number; lng: number } {
  const lat = BARCELONA_LAT_MIN + Math.random() * (BARCELONA_LAT_MAX - BARCELONA_LAT_MIN);
  const lng = BARCELONA_LNG_MIN + Math.random() * (BARCELONA_LNG_MAX - BARCELONA_LNG_MIN);
  return { lat, lng };
}

// Crop image to 1:1 square (center crop)
function cropToSquare(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      // Use naturalWidth/naturalHeight to get actual image dimensions
      const imageWidth = img.naturalWidth || img.width;
      const imageHeight = img.naturalHeight || img.height;
      
      // Calculate square crop: use the shorter dimension
      const size = Math.min(imageWidth, imageHeight);
      const x = (imageWidth - size) / 2;
      const y = (imageHeight - size) / 2;
      
      // Create canvas with square dimensions
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      // Draw the cropped region: source (x, y, size, size) -> destination (0, 0, size, size)
      ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
      
      // Convert canvas to blob
      canvas.toBlob(
        (croppedBlob) => {
          URL.revokeObjectURL(url);
          if (croppedBlob) {
            resolve(croppedBlob);
          } else {
            reject(new Error("Failed to create cropped blob"));
          }
        },
        "image/jpeg",
        0.9
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
}

export default function PhotoPreview({
  blob,
  wordDate,
  onRetake,
  onDropIt,
  onBack,
}: PhotoPreviewProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const previewUrl = useMemo(() => {
    if (croppedBlob) {
      return URL.createObjectURL(croppedBlob);
    }
    return null;
  }, [croppedBlob]);

  // Crop image to 1:1 square on mount
  useEffect(() => {
    cropToSquare(blob)
      .then(setCroppedBlob)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to process image");
      });
  }, [blob]);

  const handleSave = useCallback(() => {
    if (!previewUrl) return;
    downloadImage(previewUrl, `daily-quest-${wordDate}.jpg`);
  }, [previewUrl, wordDate]);

  const handleDropIt = async () => {
    if (!croppedBlob) return;
    setUploading(true);
    setError(null);
    try {
      const { lat: fallbackLat, lng: fallbackLng } = randomBarcelonaCoords();
      let lat = fallbackLat;
      let lng = fallbackLng;
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
        blob: croppedBlob,
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
        image_url: previewUrl || "",
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

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center text-white font-mono text-sm">
            Processing image...
          </div>
        )}
        <div className="w-full flex justify-end mt-2">
          <button
            type="button"
            onClick={handleSave}
            className="font-mono text-sm uppercase tracking-wider text-white opacity-90 hover:opacity-100 flex items-center gap-2"
            aria-label="Save to device"
          >
            <span>Save to device</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
        </div>
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
