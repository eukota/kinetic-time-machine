import { useStore } from '../store'

const YEARS = [2026]

export const YearFilter = () => {
  const { selectedYear, selectYear } = useStore()

  return (
    <div
      data-component="year-filter"
      data-component-version="1.0"
      data-component-category="filter"
    >
      <h3 className="kinetic-filter-heading">📅 Year</h3>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => selectYear(null)}
          data-cta-action="filter-year"
          data-cta-label="All years"
          className={`kinetic-filter-btn ${
            selectedYear === null ? 'kinetic-filter-btn-active' : 'kinetic-filter-btn-inactive'
          }`}
        >
          All Years
        </button>
        {YEARS.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => selectYear(selectedYear === year ? null : year)}
            data-cta-action="filter-year"
            data-cta-label={String(year)}
            className={`kinetic-filter-btn ${
              selectedYear === year ? 'kinetic-filter-btn-active' : 'kinetic-filter-btn-inactive'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  )
}
