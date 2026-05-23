import { useStore } from '../store'

const YEARS = [2026]

export const YearFilter = () => {
  const { selectedYear, selectYear } = useStore()

  return (
    <div>
      <h3 className="font-semibold text-sm mb-2 text-gray-700">Year</h3>
      <div className="space-y-1">
        <button
          onClick={() => selectYear(null)}
          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
            selectedYear === null
              ? 'bg-gray-200 text-gray-900 font-medium'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          All Years
        </button>
        {YEARS.map((year) => (
          <button
            key={year}
            onClick={() => selectYear(selectedYear === year ? null : year)}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
              selectedYear === year
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  )
}
