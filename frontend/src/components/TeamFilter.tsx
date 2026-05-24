import { useStore } from '../store'
import { useTeams } from '../hooks/useTeams'

export const TeamFilter = () => {
  const { selectedTeam, selectTeam } = useStore()
  useTeams()
  const { teams } = useStore()

  return (
    <div
      data-component="team-filter"
      data-component-version="1.0"
      data-component-category="filter"
    >
      <h3 className="kinetic-filter-heading">🏁 Filter by Team</h3>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => selectTeam(null)}
          data-cta-action="filter-team"
          data-cta-label="All teams"
          className={`kinetic-filter-btn ${
            !selectedTeam ? 'kinetic-filter-btn-active' : 'kinetic-filter-btn-inactive'
          }`}
        >
          All Teams
        </button>
        {teams.map((team) => (
          <button
            key={team.id}
            type="button"
            onClick={() => selectTeam(team.id)}
            data-cta-action="filter-team"
            data-cta-label={team.name}
            className={`kinetic-filter-btn flex items-center gap-2 ${
              selectedTeam === team.id ? 'kinetic-filter-btn-active' : 'kinetic-filter-btn-inactive'
            }`}
          >
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0 border border-kinetic-navy/20"
              style={{ backgroundColor: team.color }}
            />
            {team.name}
          </button>
        ))}
        {teams.length === 0 && (
          <p className="text-xs text-kinetic-navy/40 px-3">No teams yet</p>
        )}
      </div>
    </div>
  )
}
