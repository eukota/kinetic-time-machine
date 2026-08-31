import { useStore } from '../store'
import { CourseDayHeadingIcon } from './TabIcons'
import { dayColor } from '../lib/dayColors'

const DAYS = [
  { day: 1, label: 'Day 1', sublabel: 'Arcata → Eureka' },
  { day: 2, label: 'Day 2', sublabel: 'Eureka → Crab Park' },
  { day: 3, label: 'Day 3', sublabel: 'Crab Park → Ferndale' },
]

export const CourseFilter = () => {
  const { selectedDay, selectDay } = useStore()

  return (
    <div
      data-component="course-filter"
      data-component-version="1.0"
      data-component-category="filter"
    >
      <h3 className="kinetic-filter-heading flex items-center gap-2.5">
        <CourseDayHeadingIcon size={36} className="drop-shadow-[0_2px_0_rgba(27,38,59,0.25)]" />
        <span>Course Day</span>
      </h3>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => selectDay(null)}
          data-cta-action="filter-day"
          data-cta-label="All days"
          className={`kinetic-filter-btn ${
            selectedDay === null ? 'kinetic-filter-btn-active' : 'kinetic-filter-btn-inactive'
          }`}
        >
          All Days
        </button>
        {DAYS.map(({ day, label, sublabel }) => (
          <button
            key={day}
            type="button"
            onClick={() => selectDay(selectedDay === day ? null : day)}
            data-cta-action="filter-day"
            data-cta-label={label}
            className={`kinetic-filter-btn flex items-center gap-2 ${
              selectedDay === day ? 'kinetic-filter-btn-active' : 'kinetic-filter-btn-inactive'
            }`}
          >
            <span
              className="inline-block w-4 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: dayColor(day) }}
            />
            <span>
              <span className="font-bold">{label}</span>
              <span className="text-xs text-kinetic-navy/50 ml-1">{sublabel}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
