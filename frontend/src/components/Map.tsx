import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, LayersControl, useMap, useMapEvents } from 'react-leaflet'
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
          const weight = selectedDay === null ? 5 : 7
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

export const Map = () => {
  useSubmissions()
  return (
    <MapContainer
      center={[40.72, -124.18]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <RaceCourseOverlay />
      <SubmissionMarkers />
      <MapZoomTracker />
      <MapResizeObserver />
    </MapContainer>
  )
}
