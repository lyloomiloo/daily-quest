"use client";

import dynamic from "next/dynamic";
import type { Pin } from "@/lib/data";

const MapViewClient = dynamic(() => import("./MapViewClient"), { ssr: false });

const BARCELONA_CENTER: [number, number] = [41.3874, 2.1686];
const DEFAULT_ZOOM = 13;

interface MapViewProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  newPinId?: string | null;
}

export default function MapView({ pins, onPinClick, newPinId = null }: MapViewProps) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 1 }}>
      <MapViewClient
        center={BARCELONA_CENTER}
        zoom={DEFAULT_ZOOM}
        pins={pins}
        onPinClick={onPinClick}
        newPinId={newPinId}
      />
    </div>
  );
}
