import { useStore } from '../store'

const DAYS = [
  { day: 1, label: 'Day 1', sublabel: 'Arcata → Eureka', color: '#2563eb' },
  { day: 2, label: 'Day 2', sublabel: 'Eureka → Crab Park', color: '#16a34a' },
  { day: 3, label: 'Day 3', sublabel: 'Crab Park → Ferndale', color: '#ea580c' },
]

export const CourseFilter = () => {
  const { selectedDay, selectDay } = useStore()

  return (
    <div>
      <h3 className="font-semibold text-sm mb-2 text-gray-700">Course Day</h3>
      <div className="space-y-1">
        <button
          onClick={() => selectDay(null)}
          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
            selectedDay === null
              ? 'bg-gray-200 text-gray-900 font-medium'
              : 'hover:bg-gray-100 text-gray-600'
          }`}
        >
          All Days
        </button>
        {DAYS.map(({ day, label, sublabel, color }) => (
          <button
            key={day}
            onClick={() => selectDay(selectedDay === day ? null : day)}
            className={`w-full text-left px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
              selectedDay === day
                ? 'bg-gray-100 font-medium'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <span
              className="inline-block w-4 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span>
              <span className={selectedDay === day ? 'text-gray-900' : ''}>{label}</span>
              <span className="text-xs text-gray-400 ml-1">{sublabel}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
