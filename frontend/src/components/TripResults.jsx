import { useRef, useEffect, useState } from 'react'
import TripSummary from './TripSummary'
import RouteMap from './RouteMap'
import StopsTimeline from './StopsTimeline'
import LogSheetsSection from './LogSheetsSection'
import AuthModal from './AuthModal'
import { saveTrip, isLoggedIn } from '../services/api'

export default function TripResults({ data, onReset, user, onAuth, isFromSaved }) {
  const ref = useRef(null)
  const [saved, setSaved] = useState(isFromSaved || false)
  const [saving, setSaving] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [activeTab, setActiveTab] = useState('stops')
  const savingRef = useRef(false)

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const doSave = async () => {
    if (savingRef.current || saved) return
    savingRef.current = true
    setSaving(true)
    try {
      await saveTrip(data)
      setSaved(true)
    } catch (err) {
      alert(err.message || 'Failed to save trip')
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  const handleSave = () => {
    if (!isLoggedIn()) { setShowAuth(true); return }
    doSave()
  }

  const handleAuthSuccess = (authUser) => {
    setShowAuth(false)
    if (onAuth) onAuth(authUser)
    doSave()
  }

  const visibleStops = (data.stops || []).filter(s => s.type !== 'pre_trip')
  const logCount = data.daily_logs?.length || 0

  const saveLabel = saved ? 'Saved!' : saving ? 'Saving...' : isLoggedIn() ? 'Save Trip' : 'Sign in to Save'

  return (
    <>
      <div ref={ref} className="space-y-6">
        <TripSummary summary={data.summary} segments={data.route?.segments} />
        <RouteMap geometry={data.route?.geometry} stops={visibleStops} />

        {/* Tabbed section with Save inside */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center border-b border-border">
            <button
              onClick={() => setActiveTab('stops')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors cursor-pointer relative ${
                activeTab === 'stops' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Route Stops
              <span className="ml-1.5 text-xs opacity-60">{visibleStops.length}</span>
              {activeTab === 'stops' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors cursor-pointer relative ${
                activeTab === 'logs' ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Daily Log Sheets
              <span className="ml-1.5 text-xs opacity-60">{logCount}</span>
              {activeTab === 'logs' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
            </button>

            {/* Save button in tab bar */}
            {!isFromSaved && (
              <button
                onClick={handleSave}
                disabled={saved || saving}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-md mr-3 transition-colors cursor-pointer font-medium ${
                  saved ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent hover:bg-accent/20'
                }`}
              >
                {saveLabel}
              </button>
            )}
          </div>

          {activeTab === 'stops' && <StopsTimeline stops={visibleStops} embedded />}
          {activeTab === 'logs' && <LogSheetsSection dailyLogs={data.daily_logs} embedded username={user?.username} />}
        </div>
      </div>

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuthSuccess} />
      )}
    </>
  )
}
