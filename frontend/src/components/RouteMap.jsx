import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { STOP_TYPES } from '../utils/constants'

const MARKER_LABELS = {
  pickup: 'P',
  dropoff: 'D',
  fuel: 'F',
  overnight_rest: 'R',
  rest_break: 'B',
  cycle_restart: 'C',
  pre_trip: '',
  start: 'S',
}

function createLabeledIcon(color, label, isLarge) {
  const size = isLarge ? 28 : 22
  const fontSize = isLarge ? 12 : 10
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: ${fontSize}px;
      font-weight: 700;
      font-family: system-ui, sans-serif;
      line-height: 1;
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 2)],
  })
}

function FitBounds({ geometry }) {
  const map = useMap()
  useEffect(() => {
    if (geometry && geometry.length > 1) {
      const bounds = L.latLngBounds(geometry)
      // Large padding keeps the route clearly visible with buffer around edges
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 })
    }
  }, [geometry, map])
  return null
}

function formatDuration(hours) {
  if (hours >= 1) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${Math.round(hours * 60)}m`
}

export default function RouteMap({ geometry, stops }) {
  if (!geometry || geometry.length === 0) return null

  const center = geometry[Math.floor(geometry.length / 2)]
  const visibleStops = stops || []

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="p-4 pb-2 border-b border-border flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">Route Map</h3>
        <span className="text-xs text-text-muted">{visibleStops.length} stops along route</span>
      </div>

      <div style={{ height: 450 }}>
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          minZoom={4}
          maxZoom={14}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline
            positions={geometry}
            color="#1E293B"
            weight={3}
            opacity={0.8}
          />
          <FitBounds geometry={geometry} />

          {visibleStops.map((stop, i) => {
            const loc = stop.location
            if (!loc?.lat || !loc?.lng) return null
            const config = STOP_TYPES[stop.type] || { color: '#64748B', label: stop.type }
            const label = MARKER_LABELS[stop.type] || ''
            const isLarge = ['pickup', 'dropoff'].includes(stop.type)

            return (
              <Marker
                key={i}
                position={[loc.lat, loc.lng]}
                icon={createLabeledIcon(config.color, label, isLarge)}
              >
                <Popup>
                  <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 180, padding: '2px 0' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: config.color, marginBottom: 4 }}>
                      {config.icon} {config.label}
                    </div>
                    {stop.notes && (
                      <div style={{ fontSize: 12, color: '#57534E', marginBottom: 4 }}>{stop.notes}</div>
                    )}
                    {stop.duration_hours > 0 && (
                      <div style={{ fontSize: 11, color: '#A8A29E' }}>
                        Duration: {formatDuration(stop.duration_hours)}
                      </div>
                    )}
                    {stop.arrival_time && (
                      <div style={{ fontSize: 11, color: '#A8A29E' }}>
                        Arrival: {new Date(stop.arrival_time).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                        })}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-border flex flex-wrap gap-x-5 gap-y-1.5">
        {[
          { key: 'pickup', letter: 'P' },
          { key: 'dropoff', letter: 'D' },
          { key: 'fuel', letter: 'F' },
          { key: 'overnight_rest', letter: 'R' },
          { key: 'rest_break', letter: 'B' },
          { key: 'cycle_restart', letter: 'C' },
        ].map(({ key, letter }) => {
          const cfg = STOP_TYPES[key]
          if (!cfg) return null
          return (
            <div key={key} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span
                className="w-5 h-5 rounded-full inline-flex items-center justify-center text-white text-[9px] font-bold"
                style={{ backgroundColor: cfg.color }}
              >
                {letter}
              </span>
              {cfg.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
