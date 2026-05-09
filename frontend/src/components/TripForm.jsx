import { useState } from 'react'
import LocationInput from './LocationInput'
import { planTrip } from '../services/api'

export default function TripForm({ onResult, onLoading, onError, loading, error }) {
  const [currentLocation, setCurrentLocation] = useState(null)
  const [pickupLocation, setPickupLocation] = useState(null)
  const [dropoffLocation, setDropoffLocation] = useState(null)
  const [cycleUsed, setCycleUsed] = useState(0)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!currentLocation?.lat || !pickupLocation?.lat || !dropoffLocation?.lat) {
      onError('Please select all three locations from the dropdown suggestions.')
      return
    }

    onLoading(true)
    onError(null)

    try {
      const data = await planTrip({
        currentLocation,
        pickupLocation,
        dropoffLocation,
        currentCycleUsed: cycleUsed,
      })
      onResult(data)
    } catch (err) {
      onError(err.message || 'Failed to plan trip. Please try again.')
    } finally {
      onLoading(false)
    }
  }

  const remaining = 70 - cycleUsed
  const pct = (cycleUsed / 70) * 100

  return (
    <div className="bg-card rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-text-primary">Trip Details</h2>
        <p className="text-xs text-text-muted mt-1">
          Search and select locations from the dropdown.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <LocationInput
          label="Current Location"
          value={currentLocation}
          onChange={setCurrentLocation}
          placeholder="City, State or ZIP code"
        />
        <LocationInput
          label="Pickup Location"
          value={pickupLocation}
          onChange={setPickupLocation}
          placeholder="City, State or ZIP code"
        />
        <LocationInput
          label="Dropoff Location"
          value={dropoffLocation}
          onChange={setDropoffLocation}
          placeholder="City, State or ZIP code"
        />

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-0.5">
            Current Cycle Used
          </label>
          <p className="text-[11px] text-text-muted mb-1.5">
            Hours already worked this week (FMCSA 70-hr/8-day limit). Enter 0 if starting fresh.
          </p>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="70"
              step="0.5"
              value={cycleUsed}
              onChange={(e) => setCycleUsed(Math.min(70, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-full h-10 px-3 pr-16 rounded-md border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
              / 70 hrs
            </span>
          </div>
          <div className="mt-2">
            <div className="h-1.5 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct > 85 ? '#DC2626' : pct > 60 ? '#D97706' : '#16A34A',
                }}
              />
            </div>
            <p className="text-xs text-text-muted mt-1">{remaining.toFixed(1)} hours remaining</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-lg bg-accent hover:bg-accent-dark active:scale-[0.98] text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-accent/20"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Planning route...
            </>
          ) : (
            'Plan My Trip'
          )}
        </button>

      </form>
    </div>
  )
}
