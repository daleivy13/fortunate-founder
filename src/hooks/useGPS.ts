"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Position { lat: number; lng: number; timestamp: number }

interface GPSState {
  isTracking: boolean;
  currentPos: Position | null;
  positions: Position[];
  totalMiles: number;
  error: string | null;
  startTracking: () => void;
  stopTracking: () => Promise<number>;
}

const EARTH_RADIUS_MILES = 3958.8;

function haversineMiles(a: Position, b: Position): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export function useGPS(): GPSState {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPos, setCurrentPos] = useState<Position | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [totalMiles, setTotalMiles] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const posRef = useRef<Position[]>([]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setError(null);
    posRef.current = [];
    setPositions([]);
    setTotalMiles(0);
    setIsTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPos: Position = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
        };
        setCurrentPos(newPos);
        setPositions((prev) => {
          const updated = [...prev, newPos];
          posRef.current = updated;
          // Recalculate total miles
          let miles = 0;
          for (let i = 1; i < updated.length; i++) {
            miles += haversineMiles(updated[i - 1], updated[i]);
          }
          setTotalMiles(Math.round(miles * 10) / 10);
          return updated;
        });
      },
      (err) => {
        setError(err.message);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }, []);

  const stopTracking = useCallback(async (): Promise<number> => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);

    let miles = 0;
    for (let i = 1; i < posRef.current.length; i++) {
      miles += haversineMiles(posRef.current[i - 1], posRef.current[i]);
    }
    const finalMiles = Math.round(miles * 10) / 10;

    // Log to backend
    try {
      await fetch("/api/mileage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          miles: finalMiles,
          date: new Date().toISOString().split("T")[0],
          purpose: "Pool service route",
        }),
      });
    } catch {}

    return finalMiles;
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return { isTracking, currentPos, positions, totalMiles, error, startTracking, stopTracking };
}
