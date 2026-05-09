import { useState } from 'react'
import { logout } from '../services/api'

export default function Header({ onReset, user, onAuth, onShowTrips }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    if (onAuth) onAuth(null)
    setMenuOpen(false)
  }

  const actions = (
    <>
      {user && onShowTrips && (
        <button
          onClick={() => { onShowTrips(); setMenuOpen(false) }}
          className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 transition-colors cursor-pointer"
        >
          My Trips
        </button>
      )}
      {onReset && (
        <button
          onClick={() => { onReset(); setMenuOpen(false) }}
          className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 transition-colors cursor-pointer"
        >
          &larr; New Trip
        </button>
      )}
      {user && (
        <>
          <span className="text-xs text-white/40">{user.username}</span>
          <button
            onClick={handleLogout}
            className="text-xs px-2 py-1 rounded text-white/30 hover:text-white/70 cursor-pointer"
          >
            Logout
          </button>
        </>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-[1000] bg-primary-dark/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={onReset || (() => {})}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-md">
            E
          </div>
          <span className="text-white font-semibold text-sm">ELD Trip Planner</span>
        </button>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          {actions}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden text-white/70 hover:text-white cursor-pointer p-1"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-white/5 px-4 py-3 flex flex-col gap-2 bg-primary-dark">
          {actions}
        </div>
      )}
    </header>
  )
}
