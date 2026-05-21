import { create } from 'zustand'

export interface Photo {
  id: string
  file_path: string
  uploaded_at: string
}

export interface Submission {
  id: string
  latitude: number | null
  longitude: number | null
  timestamp: string | null
  team_id: string | null
  note: string | null
  photo_count: number
  photos?: Photo[]
}

export interface Team {
  id: string
  name: string
  color: string
}

interface Store {
  submissions: Submission[]
  teams: Team[]
  selectedSubmission: Submission | null
  selectedTeam: string | null
  selectedDay: number | null
  mapZoom: number
  setSubmissions: (submissions: Submission[]) => void
  setTeams: (teams: Team[]) => void
  selectSubmission: (submission: Submission | null) => void
  selectTeam: (teamId: string | null) => void
  selectDay: (day: number | null) => void
  setMapZoom: (zoom: number) => void
  addSubmission: (submission: Submission) => void
}

export const useStore = create<Store>((set) => ({
  submissions: [],
  teams: [],
  selectedSubmission: null,
  selectedTeam: null,
  selectedDay: null,
  mapZoom: 12,
  setSubmissions: (submissions) => set({ submissions }),
  setTeams: (teams) => set({ teams }),
  selectSubmission: (submission) => set({ selectedSubmission: submission }),
  selectTeam: (teamId) => set({ selectedTeam: teamId }),
  selectDay: (day) => set({ selectedDay: day }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  addSubmission: (submission) =>
    set((state) => ({ submissions: [submission, ...state.submissions] })),
}))
