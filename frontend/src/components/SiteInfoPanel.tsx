import { useEffect, useState } from 'react'
import { buildInfo } from '../lib/buildInfo'

interface SiteInfo {
  env_name: string
  git_sha: string
  database_url: string
  db_file_size_bytes: number | null
  photos_dir: string
  team_count: number
  submission_count: number
  photo_count: number
}

interface Props {
  token: string
}

const fmtBytes = (n: number | null) => {
  if (n == null) return '?'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const SiteInfoPanel = ({ token }: Props) => {
  const [info, setInfo] = useState<SiteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch('/api/admin/info', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setInfo)
      .catch((e: Error) => setError(e.message))
  }, [token])

  if (error) return <p className="text-xs text-kinetic-red/70">site info: {error}</p>
  if (!info) return null

  const envMatches = info.env_name === buildInfo.env
  const rows: [string, string][] = [
    ['frontend build', `${buildInfo.env} · ${buildInfo.branch} · ${buildInfo.sha}`],
    ['backend env', `${info.env_name} · ${info.git_sha}`],
    ['database', `${info.database_url}  (${fmtBytes(info.db_file_size_bytes)})`],
    ['photos dir', info.photos_dir],
    ['counts', `${info.team_count} teams · ${info.submission_count} submissions · ${info.photo_count} photos`],
  ]

  return (
    <div className="mt-8 p-4 border-2 border-kinetic-navy/20 bg-white/40 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-kinetic-navy">Site Info</h3>
        {!envMatches && (
          <span className="text-[10px] font-mono text-kinetic-red bg-kinetic-red/10 px-2 py-0.5 rounded">
            frontend/backend env mismatch
          </span>
        )}
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs font-mono text-kinetic-navy/80">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-kinetic-navy/50">{k}</dt>
            <dd className="break-all">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
