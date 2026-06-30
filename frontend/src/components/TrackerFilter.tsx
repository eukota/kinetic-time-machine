import { useState } from "react";
import { TrackerLocation } from "../types/tracker";

interface TrackerFilterProps {
  trackers: TrackerLocation[];
  visibleTeams: Set<string>;
  onVisibilityChange: (teamId: string, visible: boolean) => void;
}

export const TrackerFilter = ({
  trackers,
  visibleTeams,
  onVisibilityChange,
}: TrackerFilterProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = trackers
    .filter((t) =>
      t.team_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .reduce((unique, tracker) => {
      if (!unique.find((t) => t.team_id === tracker.team_id)) {
        unique.push(tracker);
      }
      return unique;
    }, [] as typeof trackers);

  const allVisible = trackers.every((t) => visibleTeams.has(t.team_id));
  const noneVisible = trackers.every((t) => !visibleTeams.has(t.team_id));

  const toggleAll = (visible: boolean) => {
    trackers.forEach((t) => onVisibilityChange(t.team_id, visible));
  };

  if (trackers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">📍 Live Tracking</h3>

      <input
        type="text"
        placeholder="Search teams..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
      />

      <div className="flex gap-2">
        <button
          onClick={() => toggleAll(true)}
          className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
            allVisible
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          All On
        </button>
        <button
          onClick={() => toggleAll(false)}
          className={`flex-1 text-xs py-1.5 rounded font-medium transition-colors ${
            noneVisible
              ? "bg-red-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          All Off
        </button>
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto border border-gray-200 rounded p-2">
        {filtered.length > 0 ? (
          filtered.map((tracker) => (
            <label
              key={tracker.team_id}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={visibleTeams.has(tracker.team_id)}
                onChange={(e) =>
                  onVisibilityChange(tracker.team_id, e.target.checked)
                }
                className="w-4 h-4"
              />
              <span className="text-sm flex-1 truncate">{tracker.team_name}</span>
              <span className="text-xs text-red-500">●</span>
            </label>
          ))
        ) : (
          <p className="text-sm text-gray-600 py-2 text-center">No trackers found</p>
        )}
      </div>
    </div>
  );
};
