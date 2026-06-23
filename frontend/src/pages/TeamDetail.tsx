import { useEffect, useState } from "react";
import { TeamDetail as TeamDetailType } from "../types/tracker";

interface TeamDetailPageProps {
  teamId: string;
  onBack: () => void;
}

export const TeamDetail = ({ teamId, onBack }: TeamDetailPageProps) => {
  const [team, setTeam] = useState<TeamDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeam = async () => {
      if (!teamId) return;
      try {
        const response = await fetch(`/api/teams/${teamId}/detail`);
        if (!response.ok) throw new Error("Team not found");
        const data = await response.json();
        setTeam(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
    const interval = setInterval(fetchTeam, 30000);
    return () => clearInterval(interval);
  }, [teamId]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error || !team) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="flex flex-col h-screen">
      <div className={`p-4 text-white`} style={{ backgroundColor: team.color }}>
        <button
          onClick={onBack}
          className="mb-2 text-sm opacity-80 hover:opacity-100"
        >
          ← Back to map
        </button>
        <h1 className="text-3xl font-bold">{team.name}</h1>
      </div>

      <div className="flex-1 min-h-64 bg-gray-100 flex items-center justify-center">
        {team.current_location ? (
          <p className="text-gray-600">📍 {team.current_location.latitude.toFixed(4)}, {team.current_location.longitude.toFixed(4)}</p>
        ) : (
          <p className="text-gray-600">No location data yet</p>
        )}
      </div>

      <div className="p-4 border-t overflow-y-auto max-h-96">
        <h2 className="text-xl font-bold mb-4">Photos</h2>
        {team.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {team.photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt="team photo"
                className="w-full h-24 object-cover rounded"
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No photos yet</p>
        )}
      </div>
    </div>
  );
};
