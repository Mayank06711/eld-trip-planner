import { STOP_TYPES } from '../utils/constants'

function formatLocation(name) {
  if (!name) return ''
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(name.trim())) return ''
  return name
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatDuration(hours) {
  if (hours >= 1) {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${Math.round(hours * 60)}m`
}

export default function StopsTimeline({ stops, embedded }) {
  if (!stops || stops.length === 0) return null

  const meaningful = stops.filter(s => s.type !== 'pre_trip')

  const list = (
    <div className="divide-y divide-border">
      {meaningful.map((stop, i) => {
        const config = STOP_TYPES[stop.type] || { color: '#64748B', label: stop.type, icon: '●' }
        const time = formatTime(stop.arrival_time)
        const duration = formatDuration(stop.duration_hours)
        const loc = formatLocation(stop.location?.name)

        return (
          <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-surface/50 transition-colors">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm shrink-0 shadow-sm"
              style={{ backgroundColor: config.color }}
            >
              {config.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{config.label}</span>
                {loc && (
                  <span className="text-xs text-text-muted truncate hidden sm:inline">{loc}</span>
                )}
              </div>
              <span className="text-xs text-text-muted">{stop.notes || ''}</span>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-text-primary font-mono">{time}</p>
              <p className="text-xs text-text-muted">{duration}</p>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (embedded) return <div className="max-h-[480px] overflow-y-auto">{list}</div>

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <h3 className="text-base font-semibold text-text-primary">
          Route Stops
          <span className="ml-2 text-sm font-normal text-text-muted">{meaningful.length} stops</span>
        </h3>
      </div>
      {list}
    </div>
  )
}
