"use client";

import { MapContainer, TileLayer, Marker, ZoomControl } from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import type { Pin } from "@/lib/data";

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
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      style={{ zIndex: 1 }}
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.latitude, pin.longitude]}
          icon={createPinIcon(pin, pin.id === newPinId)}
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
  );
}
