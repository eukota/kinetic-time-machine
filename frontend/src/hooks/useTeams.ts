import { useEffect } from 'react'
import { useStore } from '../store'

export const useTeams = () => {
  const { teams, setTeams } = useStore()

  useEffect(() => {
    fetch('/api/teams/')
      .then((r) => r.json())
      .then(setTeams)
      .catch((e) => console.error('Failed to fetch teams:', e))
  }, [setTeams])

  return { teams }
}
