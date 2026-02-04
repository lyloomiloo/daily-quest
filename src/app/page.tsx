"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PhoneFrame from "@/components/PhoneFrame";
import Header from "@/components/Header";
import DailyWordSection from "@/components/DailyWordSection";
import MapView from "@/components/MapView";
import CaptureButton from "@/components/CaptureButton";
import Lightbox from "@/components/Lightbox";
import CameraView from "@/components/CameraView";
import PhotoPreview from "@/components/PhotoPreview";
import UploadConfirmation from "@/components/UploadConfirmation";
import LocationGate from "@/components/LocationGate";
import { type Pin, type DailyWord } from "@/lib/data";
import {
  getCountdownToMidnightMadrid,
  formatDateHeader,
  getTodayWordDate,
} from "@/lib/countdown";
import { fetchPinsForDate } from "@/lib/pins";
import { getDailyWord, getCachedWord, setCachedWord } from "@/lib/words";

const BARCELONA_CENTER: [number, number] = [41.3874, 2.1686];
const DEFAULT_ZOOM = 15;

type Screen =
  | "map"
  | "lightbox"
  | "camera-loading"
  | "camera"
  | "preview"
  | "upload-confirm";

const TESTDATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseTestDate(searchParams: ReturnType<typeof useSearchParams>): string | null {
  const testdate = searchParams.get("testdate");
  return testdate && TESTDATE_RE.test(testdate) ? testdate : null;
}

function PageContent() {
  const searchParams = useSearchParams();
  const testDate = useMemo(() => parseTestDate(searchParams), [searchParams]);
  const todayForFetch = testDate ?? getTodayWordDate();

  const [pins, setPins] = useState<Pin[]>([]);
  const [lightboxPin, setLightboxPin] = useState<Pin | null>(null);
  const [screen, setScreen] = useState<Screen>("map");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [newPin, setNewPin] = useState<Pin | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const wordFetchRef = useRef<{ date: string; promise: Promise<DailyWord> } | null>(null);

  const [dateStrState, setDateStrState] = useState(() =>
    formatDateHeader(new Date())
  );
  const [countdown, setCountdown] = useState(() =>
    getCountdownToMidnightMadrid().text
  );
  const dateStr = testDate
    ? formatDateHeader(new Date(testDate + "T12:00:00Z"))
    : dateStrState;

  useEffect(() => {
    const update = () => {
      const countdownResult = getCountdownToMidnightMadrid();
      if (!testDate) setDateStrState(formatDateHeader(new Date()));
      setCountdown(countdownResult.text);
      if (!testDate) {
        const madrid = new Date(
          new Date().toLocaleString("en-US", { timeZone: "Europe/Madrid" })
        );
        if (madrid.getHours() === 0 && madrid.getMinutes() === 0) {
          window.location.reload();
        }
      }
    };
    update();
    const interval = setInterval(update, 60 * 1000);
    return () => clearInterval(interval);
  }, [testDate]);

  // Request user location immediately on load for map center; fallback to Barcelona if denied/unavailable
  useEffect(() => {
    if (typeof window === "undefined" || !window.navigator?.geolocation) return;
    window.navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setMapCenter([latitude, longitude]);
        }
      },
      () => setMapCenter(BARCELONA_CENTER),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Preload camera stream when user taps SNAPP (camera-loading); show camera only when stream is ready
  useEffect(() => {
    if (screen !== "camera-loading") return;
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        setScreen("camera");
      } catch {
        if (!cancelled) setScreen("map");
      }
    };
    start();
    return () => {
      cancelled = true;
    };
  }, [screen]);

  // Single source of truth: fetch word ONCE per todayForFetch (cache first, then one getDailyWord call)
  useEffect(() => {
    const cached = getCachedWord(todayForFetch);
    if (cached) {
      setDailyWord(cached);
      fetchPinsForDate(todayForFetch).then((dbPins) => setPins(dbPins ?? []));
      return;
    }

    let promise: Promise<DailyWord>;
    if (wordFetchRef.current?.date === todayForFetch) {
      promise = wordFetchRef.current.promise;
    } else {
      promise = getDailyWord(todayForFetch);
      wordFetchRef.current = { date: todayForFetch, promise };
    }
    promise.then((word) => {
      setDailyWord(word);
      setCachedWord(todayForFetch, word);
    });

    fetchPinsForDate(todayForFetch).then((dbPins) => setPins(dbPins ?? []));
  }, [todayForFetch]);

  const handlePinClick = (pin: Pin) => {
    setLightboxPin(pin);
    setScreen("lightbox");
  };

  const handleCloseLightbox = () => {
    setLightboxPin(null);
    setScreen("map");
  };

  const handleCaptureClick = () => {
    setScreen("camera-loading");
  };

  const handlePhotoCaptured = (blob: Blob) => {
    setCapturedBlob(blob);
    setScreen("preview");
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    setScreen("camera-loading");
  };

  const handleDropIt = (pin: Pin) => {
    setNewPin(pin);
    setPins((prev) => [pin, ...prev]);
    setCapturedBlob(null);
    setScreen("upload-confirm");
    setTimeout(() => setScreen("map"), 1500);
  };

  // Clear "new pin" highlight after pulse duration
  useEffect(() => {
    if (screen !== "map" || !newPin) return;
    const t = setTimeout(() => setNewPin(null), 3000);
    return () => clearTimeout(t);
  }, [screen, newPin]);

  const handleBackFromCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setScreen("map");
  };
  const handleBackFromPreview = () => setScreen("camera");

  const appContent =
    dailyWord === null ? (
      <PhoneFrame>
        <div className="flex h-full min-h-[100dvh] items-center justify-center bg-background font-mono text-sm text-muted">
          Loading…
        </div>
      </PhoneFrame>
    ) : (
      <PhoneFrame>
      <div className="relative h-full min-h-0" style={{ minHeight: "100dvh" }}>
        {screen === "map" && (
          <div className="flex flex-col h-full" style={{ minHeight: "100dvh" }}>
            <div className="shrink-0 z-[100] border-b-[4px] border-black">
              <Header dateStr={dateStr} countdown={countdown} />
              <DailyWordSection
                wordEn={dailyWord.word_en}
                wordEs={dailyWord.word_es}
              />
            </div>
            <div className="flex-1 min-h-0 relative z-[1]">
              <MapView
                center={mapCenter ?? BARCELONA_CENTER}
                zoom={DEFAULT_ZOOM}
                pins={pins}
                onPinClick={handlePinClick}
                newPinId={newPin?.id ?? null}
              />
            </div>
            <div className="shrink-0">
              <CaptureButton onClick={handleCaptureClick} />
            </div>
          </div>
        )}

        {screen === "camera-loading" && (
          <div
            className="fixed inset-0 bg-black flex items-center justify-center font-mono text-sm text-white/80"
            style={{ zIndex: 200 }}
          >
            Starting camera…
          </div>
        )}

        {screen === "camera" && (
          <CameraView
            wordEn={dailyWord.word_en}
            onCapture={handlePhotoCaptured}
            onBack={handleBackFromCamera}
            initialStreamRef={cameraStreamRef}
          />
        )}

        {screen === "preview" && capturedBlob && (
          <PhotoPreview
            blob={capturedBlob}
            wordDate={dailyWord.active_date}
            onRetake={handleRetake}
            onDropIt={handleDropIt}
            onBack={handleBackFromPreview}
          />
        )}

        {screen === "upload-confirm" && (
          <UploadConfirmation newPin={newPin} />
        )}
      </div>

      {screen === "lightbox" && (
        <Lightbox pin={lightboxPin} onClose={handleCloseLightbox} />
      )}
    </PhoneFrame>
    );

  return <LocationGate>{appContent}</LocationGate>;
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}
