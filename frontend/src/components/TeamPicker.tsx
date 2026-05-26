import { useEffect, useRef, useState } from 'react'
import type { Team } from '../store'

interface Props {
  teams: Team[]
  value: string                       // team id, '' for none
  onChange: (id: string) => void
  placeholder?: string
  showNoTeamOption?: boolean
}

export const TeamPicker = ({
  teams,
  value,
  onChange,
  placeholder = 'Type number or name…',
  showNoTeamOption = true,
}: Props) => {
  const selectedName = teams.find((t) => t.id === value)?.name ?? ''
  const [search, setSearch] = useState(selectedName)
  const [showList, setShowList] = useState(false)
  const blurTimeout = useRef<number | undefined>(undefined)

  // Keep the input text in sync if the value changes from outside.
  useEffect(() => { setSearch(selectedName) }, [selectedName])

  useEffect(() => () => { if (blurTimeout.current) window.clearTimeout(blurTimeout.current) }, [])

  const filtered = search.trim() && search !== selectedName
    ? teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : teams

  const select = (id: string, name: string) => {
    onChange(id)
    setSearch(name)
    setShowList(false)
  }

  const clear = () => {
    onChange('')
    setSearch('')
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setShowList(true) }}
          onFocus={() => setShowList(true)}
          onBlur={() => { blurTimeout.current = window.setTimeout(() => setShowList(false), 150) }}
          placeholder={placeholder}
          className="kinetic-input"
        />
        {value && (
          <button type="button" onClick={clear} className="text-kinetic-navy/40 hover:text-kinetic-red px-1 text-lg leading-none">×</button>
        )}
      </div>
      {showList && (
        <ul className="absolute z-50 w-full bg-white border-2 border-kinetic-navy rounded-lg shadow-kinetic max-h-48 overflow-y-auto text-sm mt-1">
          {showNoTeamOption && (
            <li
              className="px-3 py-2 text-kinetic-navy/50 hover:bg-kinetic-parchment cursor-pointer"
              onMouseDown={() => select('', '')}
            >
              Unknown / No team
            </li>
          )}
          {filtered.map((t) => (
            <li
              key={t.id}
              className="px-3 py-2 hover:bg-kinetic-gold/30 cursor-pointer flex items-center gap-2"
              onMouseDown={() => select(t.id, t.name)}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
              {t.name}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-kinetic-navy/40 italic">No matches</li>
          )}
        </ul>
      )}
    </div>
  )
}
