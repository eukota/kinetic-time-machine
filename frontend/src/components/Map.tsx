import { useEffect, useRef } from 'react'
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
  const { selectedDay } = useStore()
  const layersRef = useRef<L.GeoJSON[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/static/race-course.geojson')
      .then((r) => r.json())
      .then((geojson) => {
        if (cancelled) return
        layersRef.current.forEach((l) => map.removeLayer(l))
        layersRef.current = []

        const visibleLayers: L.GeoJSON[] = []
        geojson.features.forEach((feature: any) => {
          const { day, color } = feature.properties
          if (selectedDay !== null && day !== selectedDay) return
          const opacity = selectedDay === null ? 0.75 : 1.0
          const weight = selectedDay === null ? 3 : 4
          const layer = L.geoJSON(feature, {
            style: { color, weight, opacity, fill: false },
          }).addTo(map)
          layersRef.current.push(layer)
          visibleLayers.push(layer)
        })

        if (visibleLayers.length > 0) {
          const group = L.featureGroup(visibleLayers)
          map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 13 })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [map, selectedDay])

  return null
}

const SubmissionMarkers = () => {
  const { submissions, selectSubmission, selectSubmissions } = useStore()
  const clusterRef = useRef<any>(null)

  const located = submissions.filter(
    (s): s is Submission & { latitude: number; longitude: number } =>
      s.latitude !== null && s.longitude !== null
  )

  // Attach clusterclick directly on the Leaflet instance — more reliable than eventHandlers
  useEffect(() => {
    const group = clusterRef.current
    if (!group) return

    const handler = (e: any) => {
      const childMarkers: L.Marker[] = e.layer.getAllChildMarkers()
      const keys = new Set(
        childMarkers.map((m) => {
          const ll = m.getLatLng()
          return `${ll.lat},${ll.lng}`
        })
      )
      const found = located.filter((s) => keys.has(`${s.latitude},${s.longitude}`))
      if (found.length === 1) {
        selectSubmission(found[0])
      } else {
        selectSubmissions(found)
      }
    }

    group.on('clusterclick', handler)
    return () => group.off('clusterclick', handler)
  }, [located, selectSubmission, selectSubmissions])

  return (
    <MarkerClusterGroup
      ref={clusterRef}
      chunkedLoading
      zoomToBoundsOnClick={false}
      spiderfyOnMaxZoom={false}
    >
      {located.map((s) => (
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
      center={[40.72, -124.18]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <RaceCourseOverlay />
      <SubmissionMarkers />
      <MapZoomTracker />
    </MapContainer>
  )
}
