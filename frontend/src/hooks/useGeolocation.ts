import { useCallback, useEffect, useRef, useState } from "react";
import { getMockPosition, setMockLocation } from "../mocks/geolocation";

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

const useMock = import.meta.env.VITE_MOCK_GEOLOCATION === "true";

export const useGeolocation = () => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation && !useMock) {
      setError("Geolocation not supported");
      return;
    }

    if (useMock) {
      const pos = getMockPosition();
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy || undefined,
        timestamp: new Date(pos.timestamp),
      });
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy || undefined,
            timestamp: new Date(pos.timestamp),
          });
          setError(null);
        },
        (err) => setError(err.message)
      );
    }
  }, []);

  const startWatching = useCallback((intervalMs = 30000) => {
    requestLocation();
    setWatching(true);
    const id = window.setInterval(requestLocation, intervalMs);
    watchIdRef.current = id;
  }, [requestLocation]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      window.clearInterval(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  }, []);

  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  return {
    location,
    error,
    watching,
    requestLocation,
    startWatching,
    stopWatching,
    setMockLocation: useMock ? setMockLocation : undefined,
  };
};
