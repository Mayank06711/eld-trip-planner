import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Header from './components/Header'
import TripForm from './components/TripForm'
import TripResults from './components/TripResults'
import SavedTripsPanel from './components/SavedTripsPanel'
import { getMe, isLoggedIn, healthCheck } from './services/api'

const FEATURES = [
  {
    title: '11-Hour Driving Limit',
    desc: 'Automatically enforces the maximum driving hours per shift with mandatory rest scheduling.',
    icon: '⏱️',
  },
  {
    title: 'ELD Log Sheets',
    desc: 'Generates FMCSA-compliant daily log sheets with the 24-hour duty status grid drawn for you.',
    icon: '📋',
  },
  {
    title: 'Fuel Stop Planning',
    desc: 'Inserts fuel stops every 1,000 miles along your route with 30-minute refueling windows.',
    icon: '⛽',
  },
  {
    title: 'Interactive Route Map',
    desc: 'View your full route with labeled markers for every pickup, dropoff, rest, and fuel stop.',
    icon: '🗺️',
  },
  {
    title: '70-Hr Cycle Tracking',
    desc: 'Tracks your rolling 8-day on-duty hours and triggers 34-hour restarts when needed.',
    icon: '🔄',
  },
  {
    title: 'PDF Export',
    desc: 'Download each daily log sheet as a PDF for your records or DOT inspection compliance.',
    icon: '📄',
  },
]

const HOS_RULES = [
  { label: '11 hrs', desc: 'Max driving' },
  { label: '14 hrs', desc: 'On-duty window' },
  { label: '30 min', desc: 'Break after 8hr' },
  { label: '10 hrs', desc: 'Mandatory rest' },
  { label: '70 hrs', desc: '8-day cycle' },
]

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [tripData, setTripData] = useState(() => {
    // Restore from sessionStorage on refresh
    try {
      const saved = sessionStorage.getItem('eld_trip_data')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [isFromSaved, setIsFromSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [showTripsPanel, setShowTripsPanel] = useState(false)

  useEffect(() => {
    healthCheck()
    if (isLoggedIn()) {
      getMe().then(u => { if (u) setUser(u) })
    }
  }, [])

  // Sync URL with state
  useEffect(() => {
    if (tripData && location.pathname !== '/results') {
      navigate('/results', { replace: true })
    }
    if (!tripData && location.pathname === '/results') {
      // User landed on /results but no data — try sessionStorage
      const saved = sessionStorage.getItem('eld_trip_data')
      if (saved) {
        setTripData(JSON.parse(saved))
      } else {
        navigate('/', { replace: true })
      }
    }
  }, [tripData, location.pathname, navigate])

  const handleReset = () => {
    setTripData(null)
    setIsFromSaved(false)
    setError(null)
    sessionStorage.removeItem('eld_trip_data')
    navigate('/', { replace: true })
  }

  const handleNewTrip = (data) => {
    setTripData(data)
    setIsFromSaved(false)
    sessionStorage.setItem('eld_trip_data', JSON.stringify(data))
    navigate('/results')
  }

  const handleLoadSaved = useCallback((trip) => {
    if (trip) {
      setTripData(trip)
      setIsFromSaved(true)
      setShowTripsPanel(false)
      sessionStorage.setItem('eld_trip_data', JSON.stringify(trip))
      navigate('/results')
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        onReset={tripData ? handleReset : null}
        user={user}
        onAuth={setUser}
        onShowTrips={user ? () => setShowTripsPanel(true) : null}
      />

      {!tripData ? (
        <main className="flex-1 flex flex-col">

          {/* ── HERO ── */}
          <section className="relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-primary-light" />
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
            />

            <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                {/* Left — Hero copy */}
                <div className="text-white">
                  <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-xs text-white/70 mb-6 backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    FMCSA 49 CFR Part 395 Compliant
                  </div>

                  <h2 className="text-3xl sm:text-5xl font-bold leading-[1.1] tracking-tight">
                    Plan Your
                    <br />
                    HOS-Compliant
                    <br />
                    <span className="text-accent-light">Route in Seconds</span>
                  </h2>

                  <p className="mt-5 text-white/50 text-base sm:text-lg leading-relaxed max-w-lg">
                    Enter your trip details and get a complete driving plan with mandatory
                    rest stops, fuel breaks, and auto-generated ELD daily log sheets.
                  </p>

                  {/* HOS rule pills */}
                  <div className="mt-8 flex flex-wrap gap-2">
                    {HOS_RULES.map((r) => (
                      <div key={r.label} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center backdrop-blur-sm">
                        <p className="text-sm font-bold text-white">{r.label}</p>
                        <p className="text-[10px] text-white/40">{r.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — Form */}
                <div>
                  <TripForm
                    onResult={handleNewTrip}
                    onLoading={setLoading}
                    onError={setError}
                    loading={loading}
                    error={error}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURES GRID ── */}
          <section className="bg-white border-t border-border py-14 sm:py-20">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-10">
                <h3 className="text-2xl sm:text-3xl font-bold text-text-primary">
                  Everything You Need for Trip Compliance
                </h3>
                <p className="mt-2 text-text-muted max-w-xl mx-auto">
                  Built for property-carrying CMV drivers following FMCSA Hours of Service regulations.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {FEATURES.map((f) => (
                  <div key={f.title} className="bg-background rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
                    <span className="text-2xl">{f.icon}</span>
                    <h4 className="mt-3 text-sm font-semibold text-text-primary">{f.title}</h4>
                    <p className="mt-1 text-xs text-text-muted leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── HOW IT WORKS ── */}
          <section className="bg-surface border-t border-border py-14">
            <div className="max-w-4xl mx-auto px-4">
              <h3 className="text-xl font-bold text-text-primary text-center mb-8">How It Works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { step: '1', title: 'Enter Locations', desc: 'Type your current, pickup, and dropoff locations. Supports city names and ZIP codes.' },
                  { step: '2', title: 'Get Your Plan', desc: 'The HOS engine calculates your route, mandatory stops, rest periods, and fuel breaks.' },
                  { step: '3', title: 'View & Export', desc: 'See your route on the map, review each daily log sheet, and download as PDF.' },
                ].map((s) => (
                  <div key={s.step} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-accent text-white font-bold text-lg flex items-center justify-center mx-auto">
                      {s.step}
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-text-primary">{s.title}</h4>
                    <p className="mt-1 text-xs text-text-muted leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </main>
      ) : (
        /* ── RESULTS ── */
        <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
          <TripResults data={tripData} onReset={handleReset} user={user} onAuth={setUser} isFromSaved={isFromSaved} />
        </main>
      )}

      <footer className="bg-primary-dark text-center py-5 text-white/30 text-xs">
        ELD Trip Planner &middot; FMCSA HOS Compliant &middot; Property-Carrying CMV
      </footer>

      {showTripsPanel && (
        <SavedTripsPanel onLoad={handleLoadSaved} onClose={() => setShowTripsPanel(false)} />
      )}
    </div>
  )
}

export default App
