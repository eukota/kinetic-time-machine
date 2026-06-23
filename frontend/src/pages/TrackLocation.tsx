import { useEffect, useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";

interface TrackLocationProps {
  teamId: string;
}

export const TrackLocation = ({ teamId }: TrackLocationProps) => {
  const { location, error, watching, startWatching, stopWatching, setMockLocation } = useGeolocation();
  const [trackerStatus, setTrackerStatus] = useState<"approved" | "pending" | "unknown">("unknown");

  useEffect(() => {
    const checkStatus = async () => {
      if (!teamId) return;
      try {
        const response = await fetch(`/api/teams/${teamId}/detail`);
        if (response.ok) setTrackerStatus("approved");
      } catch {
        setTrackerStatus("unknown");
      }
    };
    checkStatus();
  }, [teamId]);

  useEffect(() => {
    if (trackerStatus === "approved" && !watching) {
      startWatching(30000);
    }
  }, [trackerStatus, watching, startWatching]);

  useEffect(() => {
    if (!location || !teamId) return;
    const sendUpdate = async () => {
      try {
        await fetch("/api/trackers/update-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_id: teamId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            timestamp: location.timestamp.toISOString(),
          }),
        });
      } catch (err) {
        console.error("Failed to send location:", err);
      }
    };
    sendUpdate();
  }, [location, teamId]);

  if (trackerStatus === "pending") {
    return (
      <div className="p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Awaiting Approval</h1>
        <p className="text-gray-600">
          Your registration is pending admin approval. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Team Tracker</h1>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <p className="text-sm font-medium mb-2">📍 Tracking Status</p>
        <p className={`text-lg font-bold ${watching ? "text-green-600" : "text-gray-600"}`}>
          {watching ? "🟢 Tracking Active" : "⚫ Not Tracking"}
        </p>
      </div>

      {location && (
        <div className="bg-gray-100 rounded p-4 mb-4 text-sm font-mono">
          <p>Latitude: {location.latitude.toFixed(6)}</p>
          <p>Longitude: {location.longitude.toFixed(6)}</p>
          <p>Accuracy: {location.accuracy ? `±${location.accuracy.toFixed(0)}m` : "N/A"}</p>
          <p>Last update: {location.timestamp.toLocaleTimeString()}</p>
        </div>
      )}

      {error && <p className="text-red-600 mb-4">Error: {error}</p>}

      <div className="space-y-2 mb-6">
        {!watching ? (
          <button
            onClick={() => startWatching(30000)}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Start Tracking
          </button>
        ) : (
          <button
            onClick={stopWatching}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
          >
            Stop Tracking
          </button>
        )}
      </div>

      {setMockLocation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-xs font-medium mb-2">🧪 Mock Mode (Testing)</p>
          <button
            onClick={() => setMockLocation(40.7128, -74.006)}
            className="w-full text-sm bg-yellow-600 text-white py-1 rounded mb-1"
          >
            Test Location 1
          </button>
          <button
            onClick={() => setMockLocation(34.0522, -118.2437)}
            className="w-full text-sm bg-yellow-600 text-white py-1 rounded"
          >
            Test Location 2
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-6">
        Keep this page open during race times. Your location will be updated every 30 seconds.
      </p>
    </div>
  );
};
