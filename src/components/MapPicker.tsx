"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google: typeof google;
  }
}

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onSelect: (lat: number, lng: number) => void;
  height?: string;
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.google?.maps) {
      resolve();
      return;
    }
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    document.head.appendChild(script);
  });
}

export default function MapPicker({
  latitude,
  longitude,
  onSelect,
  height = "400px",
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    loadGoogleMapsScript(apiKey).then(() => {
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstance.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: latitude, lng: longitude },
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
    });

    const marker = new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map,
      draggable: true,
      title: "ตำแหน่งสำนักงาน",
    });

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) onSelect(pos.lat(), pos.lng());
    });

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        onSelect(e.latLng.lat(), e.latLng.lng());
      }
    });

    mapInstance.current = map;
    markerRef.current = marker;

    return () => {
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, [loaded]);

  useEffect(() => {
    if (mapInstance.current && markerRef.current) {
      markerRef.current.setPosition({ lat: latitude, lng: longitude });
      mapInstance.current.panTo({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  if (!loaded) {
    return (
      <div
        style={{ height, width: "100%", borderRadius: "12px" }}
        className="flex items-center justify-center bg-gray-100 text-gray-500 text-sm"
      >
        กำลังโหลดแผนที่...
      </div>
    );
  }

  return <div ref={mapRef} style={{ height, width: "100%", borderRadius: "12px" }} />;
}
