import LogGrid from './LogGrid'

function isCoordinate(str) {
  return /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test((str || '').trim())
}

function cleanLocation(name) {
  if (!name || isCoordinate(name)) return 'En route'
  return name
}

export default function DailyLogSheet({ log }) {
  if (!log) return null

  const dateObj = new Date(log.date + 'T00:00:00')
  const dateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  })

  const fromClean = cleanLocation(log.from_location)
  const toClean = cleanLocation(log.to_location)

  return (
    <div className="min-w-[860px] bg-white border border-stone-300 rounded font-mono text-[11px]">

      {/* Header */}
      <div className="bg-stone-50 border-b border-stone-300 px-5 py-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="text-[13px] font-bold text-stone-900 tracking-wider uppercase">
              Driver's Daily Log
            </h4>
            <p className="text-[9px] text-stone-400 mt-0.5 tracking-wide">
              One Calendar Day — 24 Hours
            </p>
          </div>
          <div className="text-right text-[8px] text-stone-400 leading-relaxed">
            <p>Original — File at home terminal</p>
            <p>Duplicate — Driver retains for 8 days</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-2">
          <LogField label="Date" value={dateStr} />
          <LogField label="From" value={fromClean} />
          <LogField label="To" value={toClean} />
          <LogField label="Miles Today" value={log.total_miles_today > 0 ? Math.round(log.total_miles_today) : '—'} />
          <LogField label="Carrier" value="ELD Trip Planner LLC" />
          <LogField label="Vehicle" value="TRK-001 / TRL-001" />
        </div>
      </div>

      {/* Graph Grid */}
      <div className="px-3 py-4 border-b border-stone-300">
        <LogGrid events={log.events} totals={log.totals} />
      </div>

      {/* Remarks */}
      <div className="px-5 py-3 border-b border-stone-300">
        <p className="text-[10px] font-bold text-stone-700 mb-2 uppercase tracking-wider">Remarks</p>
        <div className="grid grid-cols-1 gap-0.5">
          {(log.remarks || [])
            .filter(r => !isCoordinate(r.location))
            .map((r, i) => (
              <p key={i} className="text-[10px] text-stone-600 leading-relaxed">
                <span className="text-stone-400 font-medium inline-block w-14">{r.time}</span>
                <span className="text-stone-500 mx-1">—</span>
                <span>{r.location || 'En route'}</span>
                {r.action && <span className="text-stone-400 ml-1">({r.action})</span>}
              </p>
            ))}
          {(!log.remarks || log.remarks.filter(r => !isCoordinate(r.location)).length === 0) && (
            <p className="text-[10px] text-stone-400 italic">Continuing from prior day</p>
          )}
        </div>
      </div>

      {/* Totals bar */}
      <div className="px-5 py-2.5 bg-stone-50 flex items-center justify-between">
        <div className="flex gap-5 text-[10px]">
          <TotalItem label="Off Duty" value={log.totals.off_duty} />
          <TotalItem label="Sleeper" value={log.totals.sleeper_berth} />
          <TotalItem label="Driving" value={log.totals.driving} highlight />
          <TotalItem label="On Duty ND" value={log.totals.on_duty_not_driving} />
        </div>
        <div className="text-[11px] font-bold text-stone-900">
          Total: {log.totals.total}
        </div>
      </div>
    </div>
  )
}

function LogField({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5 overflow-hidden">
      <span className="text-[9px] text-stone-400 uppercase tracking-wide whitespace-nowrap shrink-0">
        {label}:
      </span>
      <span className="text-[11px] text-stone-800 border-b border-stone-200 flex-1 truncate pb-px">
        {value || '—'}
      </span>
    </div>
  )
}

function TotalItem({ label, value, highlight }) {
  return (
    <span className="text-stone-500">
      {label}:{' '}
      <strong className={highlight ? 'text-accent' : 'text-stone-800'}>
        {(value || 0).toFixed(2)}
      </strong>
    </span>
  )
}
