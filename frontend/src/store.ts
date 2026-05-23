import { create } from 'zustand'

export interface Photo {
  id: string
  file_path: string
  mime_type: string | null
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
  created_at?: string
  first_photo?: string | null
  first_photo_mime?: string | null
  photos?: Photo[]
  approved?: boolean
  pending_review?: boolean
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
  selectedSubmissions: Submission[]
  initialIndex: number
  selectedTeam: string | null
  selectedDay: number | null
  selectedYear: number | null
  mapZoom: number
  setSubmissions: (submissions: Submission[]) => void
  setTeams: (teams: Team[]) => void
  selectSubmission: (submission: Submission | null) => void
  selectSubmissions: (submissions: Submission[]) => void
  selectSubmissionsAt: (submissions: Submission[], index: number) => void
  selectTeam: (teamId: string | null) => void
  selectDay: (day: number | null) => void
  selectYear: (year: number | null) => void
  setMapZoom: (zoom: number) => void
}

export const useStore = create<Store>((set) => ({
  submissions: [],
  teams: [],
  selectedSubmission: null,
  selectedSubmissions: [],
  initialIndex: 0,
  selectedTeam: null,
  selectedDay: null,
  selectedYear: 2026,
  mapZoom: 12,
  setSubmissions: (submissions) => set({ submissions }),
  setTeams: (teams) => set({ teams }),
  selectSubmission: (submission) => set({ selectedSubmission: submission, selectedSubmissions: [], initialIndex: 0 }),
  selectSubmissions: (submissions) => set({ selectedSubmissions: submissions, selectedSubmission: null, initialIndex: 0 }),
  selectSubmissionsAt: (submissions, index) => set({ selectedSubmissions: submissions, selectedSubmission: null, initialIndex: index }),
  selectTeam: (teamId) => set({ selectedTeam: teamId }),
  selectDay: (day) => set({ selectedDay: day }),
  selectYear: (year) => set({ selectedYear: year }),
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
}))
