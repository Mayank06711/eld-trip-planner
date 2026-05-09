import { useState } from 'react'
import DailyLogSheet from './DailyLogSheet'
import { generateLogPdf } from '../utils/pdfRenderer'

function downloadCsv(dailyLogs) {
  const rows = [['Day', 'Date', 'From', 'To', 'Miles', 'Off Duty (hrs)', 'Sleeper (hrs)', 'Driving (hrs)', 'On Duty ND (hrs)', 'Total (hrs)']]
  for (const log of dailyLogs) {
    const t = log.totals || {}
    rows.push([
      log.day_number, log.date,
      `"${(log.from_location || '').replace(/"/g, '""')}"`,
      `"${(log.to_location || '').replace(/"/g, '""')}"`,
      log.total_miles_today || 0,
      t.off_duty || 0, t.sleeper_berth || 0, t.driving || 0, t.on_duty_not_driving || 0, t.total || 0,
    ])
  }
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'trip-logs.csv'
  a.click()
}

export default function LogSheetsSection({ dailyLogs, embedded, username }) {
  const [activeDay, setActiveDay] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  if (!dailyLogs || dailyLogs.length === 0) return null

  const handleExport = async (mode) => {
    setShowMenu(false)
    if (mode === 'csv') { downloadCsv(dailyLogs); return }

    setExporting(true)
    try {
      await generateLogPdf(dailyLogs, username, mode === 'current' ? activeDay : false)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {dailyLogs.map((log, i) => {
            const d = new Date(log.date + 'T00:00:00')
            const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  activeDay === i
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface text-text-secondary hover:bg-stone-200'
                }`}
              >
                Day {log.day_number}
                <span className="ml-1 opacity-60">{label}</span>
              </button>
            )
          })}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={exporting}
            className="text-xs px-3 py-1.5 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer font-medium flex items-center gap-1.5"
          >
            {exporting ? 'Exporting...' : (
              <>
                Download
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 bg-white border border-border rounded-lg shadow-xl z-20 min-w-[180px] overflow-hidden">
              <button onClick={() => handleExport('current')} className="w-full text-left px-4 py-2.5 text-xs text-text-primary hover:bg-surface cursor-pointer">
                This log (Day {dailyLogs[activeDay].day_number}) as PDF
              </button>
              <button onClick={() => handleExport('all')} className="w-full text-left px-4 py-2.5 text-xs text-text-primary hover:bg-surface cursor-pointer border-t border-border">
                All logs as PDF ({dailyLogs.length} pages)
              </button>
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 text-xs text-text-primary hover:bg-surface cursor-pointer border-t border-border">
                Export summary as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 overflow-x-auto bg-stone-100/50">
        <DailyLogSheet log={dailyLogs[activeDay]} />
      </div>
    </div>
  )
}
