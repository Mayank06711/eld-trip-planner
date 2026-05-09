import { useState, useEffect } from 'react'
import { listTrips, getTrip, deleteTrip } from '../services/api'

export default function SavedTripsPanel({ onLoad, onClose }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    requestAnimationFrame(() => setVisible(true))
    loadTrips()
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300) // wait for animation to finish
  }

  const loadTrips = async () => {
    try {
      const data = await listTrips()
      setTrips(data?.trips || [])
    } catch {
      setTrips([])
    } finally {
      setLoading(false)
    }
  }

  const handleLoad = async (trip) => {
    try {
      const full = await getTrip(trip.id)
      onLoad(full)
    } catch {
      alert('Failed to load trip')
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      await deleteTrip(id)
      setTrips(prev => prev.filter(t => t.id !== id))
    } catch {
      alert('Failed to delete')
    }
  }

  return (
    <div className="fixed inset-0 flex justify-end" style={{ zIndex: 10000 }}>
      {/* Backdrop with fade */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Panel with slide */}
      <div
        className={`relative w-full max-w-sm bg-white shadow-2xl flex flex-col h-full transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">My Saved Trips</h3>
          <button onClick={handleClose} className="text-text-muted hover:text-text-primary text-xl cursor-pointer">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-5 text-center text-sm text-text-muted">Loading...</div>
          )}

          {!loading && trips.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-text-muted">No saved trips yet.</p>
              <p className="text-xs text-text-muted mt-1">Plan a trip and click "Save Trip" to see it here.</p>
            </div>
          )}

          {trips.map((trip) => {
            const s = trip.summary || {}
            const date = new Date(trip.created_at).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric',
            })

            return (
              <div
                key={trip.id}
                onClick={() => handleLoad(trip)}
                className="px-5 py-4 border-b border-border hover:bg-surface cursor-pointer group transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {trip.route_label || 'Trip'}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">{date}</p>
                    <div className="flex gap-3 mt-1.5 text-xs text-text-muted">
                      <span>{Math.round(s.total_distance_miles || 0)} mi</span>
                      <span>{s.total_trip_days || 0} days</span>
                      <span>{s.total_stops || 0} stops</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, trip.id)}
                    className="text-xs text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0 ml-2"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
