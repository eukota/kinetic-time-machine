export interface TrackerLocation {
  team_id: string;
  team_name: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string; // ISO datetime
  status: "tracking";
}

export interface TeamDetail {
  id: string;
  name: string;
  color: string;
  current_location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: string;
  } | null;
  photos: Photo[];
}

export interface Photo {
  id: string;
  url: string;
  timestamp: string;
  note?: string;
}

export interface TrackerRegistration {
  code: string;
  email?: string;
}
