import { useEffect } from 'react'
import { useStore, Submission } from '../store'

const REFRESH_MS = 30_000

export const useSubmissions = () => {
  const { selectedTeam, selectedYear, setSubmissions } = useStore()

  useEffect(() => {
    const fetchSubmissions = () => {
      const params = new URLSearchParams()
      if (selectedTeam) params.set('team_id', selectedTeam)
      if (selectedYear !== null) params.set('year', String(selectedYear))
      const url = `/api/submissions/${params.toString() ? `?${params}` : ''}`
      fetch(url)
        .then((r) => r.json())
        .then(setSubmissions)
        .catch((e) => console.error('Failed to fetch submissions:', e))
    }
    fetchSubmissions()
    const poll = setInterval(fetchSubmissions, REFRESH_MS)
    return () => clearInterval(poll)
  }, [selectedTeam, selectedYear, setSubmissions])

  const createSubmission = async (formData: FormData): Promise<Submission | null> => {
    try {
      const r = await fetch('/api/submissions/', { method: 'POST', body: formData })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        const msg = body.detail || 'Upload failed'
        throw new Error(typeof msg === 'string' ? msg : 'Upload failed')
      }
      return r.json()
    } catch (e) {
      console.error('Failed to create submission:', e)
      throw e
    }
  }

  const getSubmissionDetails = async (id: string): Promise<Submission | null> => {
    try {
      const r = await fetch(`/api/submissions/${id}`)
      if (!r.ok) return null
      return r.json()
    } catch (e) {
      console.error('Failed to fetch submission details:', e)
      return null
    }
  }

  return { createSubmission, getSubmissionDetails }
}
