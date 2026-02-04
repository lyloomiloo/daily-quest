"use client";

import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import type { Pin } from "@/lib/data";

const MapViewClient = dynamic(() => import("./MapViewClient"), { ssr: false });

interface MapViewProps {
  center: LatLngExpression;
  zoom: number;
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  newPinId?: string | null;
}

export default function MapView({
  center,
  zoom,
  pins,
  onPinClick,
  newPinId = null,
}: MapViewProps) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 1 }}>
      <MapViewClient
        center={center}
        zoom={zoom}
        pins={pins}
        onPinClick={onPinClick}
        newPinId={newPinId}
      />
    </div>
  );
}
