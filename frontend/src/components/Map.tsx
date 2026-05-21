import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore, Submission } from '../store'
import { useSubmissions } from '../hooks/useSubmissions'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const MapZoomTracker = () => {
  const { setMapZoom } = useStore()
  useMapEvents({ zoomend: (e) => setMapZoom(e.target.getZoom()) })
  return null
}

const RaceCourseOverlay = () => {
  const map = useMap()
  useEffect(() => {
    fetch('/static/race-course.geojson')
      .then((r) => r.json())
      .then((geojson) => {
        const layer = L.geoJSON(geojson, {
          style: { color: '#e63946', weight: 3, opacity: 0.8, fill: false },
        }).addTo(map)
        return () => { map.removeLayer(layer) }
      })
      .catch(() => {})
  }, [map])
  return null
}

const SubmissionMarkers = () => {
  const { submissions, selectSubmission } = useStore()
  return (
    <MarkerClusterGroup chunkedLoading>
      {submissions
        .filter((s): s is Submission & { latitude: number; longitude: number } =>
          s.latitude !== null && s.longitude !== null
        )
        .map((s) => (
          <Marker
            key={s.id}
            position={[s.latitude, s.longitude]}
            eventHandlers={{ click: () => selectSubmission(s) }}
          />
        ))}
    </MarkerClusterGroup>
  )
}

export const Map = () => {
  useSubmissions()
  return (
    <MapContainer
      center={[40.83, -124.16]}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <RaceCourseOverlay />
      <SubmissionMarkers />
      <MapZoomTracker />
    </MapContainer>
  )
}
