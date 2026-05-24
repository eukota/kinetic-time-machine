/** Format an ISO date string as MM/DD/YYYY HH:MM (24-hour). */
export function formatSubmissionDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd}/${yyyy} ${hh}:${min}`
}

export function submissionDisplayDate(submission: {
  timestamp?: string | null
  created_at?: string | null
}): string | null {
  return formatSubmissionDate(submission.timestamp ?? submission.created_at)
}
