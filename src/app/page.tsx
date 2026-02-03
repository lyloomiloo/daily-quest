"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { getSamplePins, type Pin, type DailyWord } from "@/lib/data";
import {
  getCountdownToMidnightMadrid,
  formatDateHeader,
  getTodayWordDate,
} from "@/lib/countdown";
import { fetchPinsForDate } from "@/lib/pins";
import { getDailyWord, getFallbackWord } from "@/lib/words";

type Screen =
  | "map"
  | "lightbox"
  | "camera"
  | "preview"
  | "upload-confirm";

const TESTDATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseTestDate(searchParams: ReturnType<typeof useSearchParams>): string | null {
  const testdate = searchParams.get("testdate");
  return testdate && TESTDATE_RE.test(testdate) ? testdate : null;
}

export default function Home() {
  const searchParams = useSearchParams();
  const testDate = useMemo(() => parseTestDate(searchParams), [searchParams]);
  const todayForFetch = testDate ?? getTodayWordDate();

  const [pins, setPins] = useState<Pin[]>(() => getSamplePins());
  const [lightboxPin, setLightboxPin] = useState<Pin | null>(null);
  const [screen, setScreen] = useState<Screen>("map");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [newPin, setNewPin] = useState<Pin | null>(null);

  const [dailyWord, setDailyWord] = useState<DailyWord>(() =>
    getFallbackWord(getTodayWordDate())
  );

  const dailyWordPromiseRef = useRef<Promise<DailyWord> | null>(null);
  const todayForFetchRef = useRef<string | null>(null);

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

  // Fetch today's daily word once per todayForFetch; use testdate when ?testdate=YYYY-MM-DD
  useEffect(() => {
    const dateChanged =
      todayForFetchRef.current !== null &&
      todayForFetchRef.current !== todayForFetch;
    if (dateChanged) {
      dailyWordPromiseRef.current = null;
    }
    todayForFetchRef.current = todayForFetch;

    if (!dailyWordPromiseRef.current) {
      dailyWordPromiseRef.current = getDailyWord(todayForFetch);
    }
    dailyWordPromiseRef.current.then(setDailyWord);

    fetchPinsForDate(todayForFetch).then((dbPins) => {
      setPins(dbPins.length > 0 ? dbPins : getSamplePins());
    });
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
    setScreen("camera");
  };

  const handlePhotoCaptured = (blob: Blob) => {
    setCapturedBlob(blob);
    setScreen("preview");
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    setScreen("camera");
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

  const handleBackFromCamera = () => setScreen("map");
  const handleBackFromPreview = () => setScreen("camera");

  return (
    <PhoneFrame>
      <div className="relative h-full min-h-0" style={{ minHeight: "100dvh" }}>
        {screen === "map" && (
          <>
            <div className="absolute inset-0 z-[1]">
              <MapView pins={pins} onPinClick={handlePinClick} newPinId={newPin?.id ?? null} />
            </div>
            <div className="absolute top-0 left-0 right-0 z-[100]">
              <Header dateStr={dateStr} countdown={countdown} />
              <DailyWordSection
                wordEn={dailyWord.word_en}
                wordEs={dailyWord.word_es}
              />
            </div>
            <CaptureButton onClick={handleCaptureClick} />
          </>
        )}

        {screen === "camera" && (
          <CameraView
            wordEn={dailyWord.word_en}
            onCapture={handlePhotoCaptured}
            onBack={handleBackFromCamera}
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
}
