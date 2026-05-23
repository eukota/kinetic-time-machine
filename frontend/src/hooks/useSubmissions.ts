import { useEffect } from 'react'
import { useStore, Submission } from '../store'

export const useSubmissions = () => {
  const { selectedTeam, selectedYear, setSubmissions } = useStore()

  useEffect(() => {
    const params = new URLSearchParams()
    if (selectedTeam) params.set('team_id', selectedTeam)
    if (selectedYear !== null) params.set('year', String(selectedYear))
    const url = `/api/submissions/${params.toString() ? `?${params}` : ''}`
    fetch(url)
      .then((r) => r.json())
      .then(setSubmissions)
      .catch((e) => console.error('Failed to fetch submissions:', e))
  }, [selectedTeam, selectedYear, setSubmissions])

  const createSubmission = async (formData: FormData): Promise<Submission | null> => {
    try {
      const r = await fetch('/api/submissions/', { method: 'POST', body: formData })
      if (!r.ok) throw new Error('Upload failed')
      const submission: Submission = await r.json()
      useStore.getState().addSubmission(submission)
      return submission
    } catch (e) {
      console.error('Failed to create submission:', e)
      return null
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
