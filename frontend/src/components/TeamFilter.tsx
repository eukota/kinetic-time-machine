import { useStore } from '../store'
import { useTeams } from '../hooks/useTeams'

export const TeamFilter = () => {
  const { selectedTeam, selectTeam } = useStore()
  useTeams()
  const { teams } = useStore()

  return (
    <div>
      <h3 className="font-semibold text-sm mb-2 text-gray-700">Filter by Team</h3>
      <div className="space-y-1">
        <button
          onClick={() => selectTeam(null)}
          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
            !selectedTeam ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
          }`}
        >
          All Teams
        </button>
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => selectTeam(team.id)}
            className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
              selectedTeam === team.id ? 'bg-blue-100 text-blue-800 font-medium' : 'hover:bg-gray-100'
            }`}
          >
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: team.color }}
            />
            {team.name}
          </button>
        ))}
        {teams.length === 0 && (
          <p className="text-xs text-gray-400 px-3">No teams yet</p>
        )}
      </div>
    </div>
  )
}
