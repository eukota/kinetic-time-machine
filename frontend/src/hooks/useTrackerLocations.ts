import { useEffect, useState, useCallback } from "react";
import { TrackerLocation } from "../types/tracker";

export const useTrackerLocations = (intervalMs = 30000) => {
  const [locations, setLocations] = useState<TrackerLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/trackers/current-locations");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setLocations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    const id = setInterval(fetchLocations, intervalMs);
    return () => clearInterval(id);
  }, [fetchLocations, intervalMs]);

  return { locations, loading, error };
};
