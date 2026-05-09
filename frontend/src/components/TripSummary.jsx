import { STOP_TYPES } from '../utils/constants'

export default function TripSummary({ summary, segments }) {
  if (!summary) return null

  const stats = [
    { label: 'Total Distance', value: `${summary.total_distance_miles.toLocaleString()} mi` },
    { label: 'Driving Time', value: `${summary.total_driving_hours} hrs` },
    { label: 'Trip Duration', value: `${summary.total_trip_days} day${summary.total_trip_days > 1 ? 's' : ''}` },
    { label: 'Cycle After Trip', value: `${summary.cycle_hours_after} / 70 hrs` },
  ]

  const routeLabel = segments?.map(s => s.from.name?.split(',')[0]).concat(
    segments?.[segments.length - 1]?.to.name?.split(',')[0]
  ).join('  →  ')

  return (
    <div className="bg-primary-dark rounded-xl p-5 sm:p-6 text-white shadow-md">
      {routeLabel && (
        <p className="text-sm text-white/60 mb-4 font-medium tracking-wide">
          {routeLabel}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-2">
        <span className="text-xs bg-white/10 rounded-full px-2.5 py-1">
          {summary.total_stops} stops
        </span>
        <span className="text-xs bg-white/10 rounded-full px-2.5 py-1">
          {summary.total_trip_days} log sheet{summary.total_trip_days > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}
