"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import type { Pin } from "@/lib/data";
import {
  GEOLOCATION_OPTIONS,
  handleGeolocationError,
} from "@/lib/geolocation";

function MapCenterUpdater({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom: number;
}) {
  const map = useMap();
  const setViewCountRef = useRef(0);
  useEffect(() => {
    if (setViewCountRef.current < 2) {
      map.setView(center, zoom);
      setViewCountRef.current += 1;
    }
  }, [map, center, zoom]);
  return null;
}

function MapZoomControls() {
  const map = useMap();
  return (
    <div
      className="absolute bottom-3 right-3 flex flex-col border-2 border-black bg-white z-[400]"
      style={{ borderRadius: 0 }}
    >
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-9 h-9 flex items-center justify-center text-black font-mono text-lg border-b border-black"
        style={{ borderRadius: 0 }}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-9 h-9 flex items-center justify-center text-black font-mono text-lg"
        style={{ borderRadius: 0 }}
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  );
}

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Remove default Leaflet marker styles so our divIcon shows correctly
L.Icon.Default.mergeOptions({
  iconUrl: "",
  iconRetinaUrl: "",
  shadowUrl: "",
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function createPinIcon(pin: Pin, isNew: boolean): L.DivIcon {
  const pulseClass = isNew ? " pin-pulse" : "";
  return L.divIcon({
    html: `<div class="custom-pin-wrap${pulseClass}" style="width:48px;height:48px;overflow:hidden;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.2);background:white;"><img src="${pin.image_url}" alt="" style="width:100%;height:100%;object-fit:cover;" /></div>`,
    className: "custom-pin-no-default",
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

const USER_LOCATION_ICON = L.divIcon({
  html: `<div class="user-location-dot" style="width:11px;height:11px;border-radius:50%;background:#4285F4;box-shadow:0 0 0 3px rgba(66,133,244,0.4);animation:user-location-pulse 2s ease-in-out infinite;"></div>`,
  className: "custom-pin-no-default",
  iconSize: [11, 11],
  iconAnchor: [5.5, 5.5],
});

interface MapViewClientProps {
  center: LatLngExpression;
  zoom: number;
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  newPinId?: string | null;
}

export default function MapViewClient({
  center,
  zoom,
  pins,
  onPinClick,
  newPinId = null,
}: MapViewClientProps) {
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.navigator?.geolocation) return;
    let watchId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      const geo = window.navigator.geolocation;
      const onSuccess = (pos: GeolocationPosition) => {
        setLocationError(null);
        const { latitude, longitude } = pos.coords;
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setUserPosition({ lat: latitude, lng: longitude });
        }
      };
      const onError = (error: GeolocationPositionError) => {
        handleGeolocationError(error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Please enable location in your Browser/System settings.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError("Location unavailable. Check GPS or try again.");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location request timed out. Try again.");
        }
      };
      geo.getCurrentPosition(onSuccess, onError, GEOLOCATION_OPTIONS);
      watchId = geo.watchPosition(onSuccess, onError, GEOLOCATION_OPTIONS);
    }, 100);
    return () => {
      window.clearTimeout(timeoutId);
      if (watchId != null && window.navigator?.geolocation) {
        window.navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      {locationError && (
        <div
          className="absolute bottom-2 left-2 right-2 z-[200] bg-black/80 text-white font-mono text-xs px-3 py-2 text-center"
          role="alert"
        >
          {locationError}
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        style={{ zIndex: 1 }}
        zoomControl={false}
      >
        <MapCenterUpdater center={center} zoom={zoom} />
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapZoomControls />
        {userPosition && (
        <Marker
          position={[userPosition.lat, userPosition.lng]}
          icon={USER_LOCATION_ICON}
          zIndexOffset={-100}
        />
      )}
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.latitude, pin.longitude]}
          icon={createPinIcon(pin, pin.id === newPinId)}
          zIndexOffset={100}
          eventHandlers={{
            click: (e) => {
              e.originalEvent.stopPropagation();
              e.originalEvent.preventDefault();
              onPinClick(pin);
            },
          }}
        />
      ))}
      </MapContainer>
    </div>
  );
}
