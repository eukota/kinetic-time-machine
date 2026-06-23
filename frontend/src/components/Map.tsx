import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useStore, Submission } from '../store'
import { useSubmissions } from '../hooks/useSubmissions'
import { useTrackerLocations } from '../hooks/useTrackerLocations'

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

/** Leaflet does not auto-detect container resizes (e.g. sidebar toggle). */
const MapResizeObserver = () => {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    let settleTimer: ReturnType<typeof setTimeout> | undefined

    const refresh = () => {
      map.invalidateSize()
      clearTimeout(settleTimer)
      // Re-run after sidebar CSS transition (200ms) finishes.
      settleTimer = setTimeout(() => map.invalidateSize(), 250)
    }

    const observer = new ResizeObserver(refresh)
    observer.observe(container)
    const parent = container.parentElement
    if (parent) observer.observe(parent)

    refresh()

    return () => {
      observer.disconnect()
      clearTimeout(settleTimer)
    }
  }, [map])

  return null
}

const RaceCourseOverlay = () => {
  const map = useMap()
  const { selectedDay } = useStore()
  const layersRef = useRef<L.GeoJSON[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/static/race-course.geojson')
      .then((r) => {
        if (!r.ok) throw new Error(`race course fetch failed: ${r.status}`)
        return r.json()
      })
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
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[RaceCourseOverlay]', err)
      })
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

interface TrackerMarkersProps {
  visibleTrackers: Set<string>
}

const TrackerMarkers = ({ visibleTrackers }: TrackerMarkersProps) => {
  const { locations } = useTrackerLocations(30000)

  const visible = locations.filter((l) => visibleTrackers.has(l.team_id))

  // Create a custom icon for tracker markers (different from submission markers)
  const trackerIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjRUYzQjM2IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })

  return (
    <>
      {visible.map((tracker) => (
        <Marker
          key={tracker.team_id}
          position={[tracker.latitude, tracker.longitude]}
          icon={trackerIcon}
          title={tracker.team_name}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{tracker.team_name}</p>
              <p className="text-xs text-gray-600">
                {new Date(tracker.timestamp).toLocaleTimeString()}
              </p>
              <p className="text-xs text-gray-600">
                {tracker.latitude.toFixed(4)}, {tracker.longitude.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

const TrackerMarkers = ({ visibleTrackers }: { visibleTrackers?: Set<string> }) => {
  const map = useMap()
  const { locations } = useTrackerLocations(30000)
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map())

  useEffect(() => {
    // Remove markers that are no longer in locations
    const locationIds = new Set(locations.map((loc) => loc.team_id))
    markersRef.current.forEach((marker, teamId) => {
      if (!locationIds.has(teamId)) {
        map.removeLayer(marker)
        markersRef.current.delete(teamId)
      }
    })

    // Add or update markers
    locations.forEach((loc) => {
      // Skip if visibility filter excludes this tracker
      if (visibleTrackers && !visibleTrackers.has(loc.team_id)) {
        const existing = markersRef.current.get(loc.team_id)
        if (existing) {
          map.removeLayer(existing)
          markersRef.current.delete(loc.team_id)
        }
        return
      }

      const existing = markersRef.current.get(loc.team_id)
      if (existing) {
        // Update existing marker position
        existing.setLatLng([loc.latitude, loc.longitude])
      } else {
        // Create new marker
        const marker = L.circleMarker([loc.latitude, loc.longitude], {
          radius: 8,
          fillColor: '#ff4444',
          color: '#000',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        })

        marker.bindPopup(`<strong>${loc.team_name}</strong><br>Tracking`)

        marker.on('click', () => {
          window.location.href = `/team/${loc.team_id}`
        })

        marker.addTo(map)
        markersRef.current.set(loc.team_id, marker)
      }
    })

    return () => {
      // Cleanup on unmount
      markersRef.current.forEach((marker) => map.removeLayer(marker))
      markersRef.current.clear()
    }
  }, [locations, map, visibleTrackers])

  return null
}

export const Map = ({ visibleTrackers }: { visibleTrackers?: Set<string> } = {}) => {
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
      <TrackerMarkers visibleTrackers={visibleTrackers} />
      <MapZoomTracker />
      <MapResizeObserver />
    </MapContainer>
  )
}
