import { useState } from 'react'
import { login, register } from '../services/api'

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      let user
      if (mode === 'login') {
        user = await login(username, password)
      } else {
        user = await register(username, password, email)
      }
      onAuth(user)
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl cursor-pointer">&times;</button>
        </div>

        <p className="text-xs text-text-muted mb-4">
          {mode === 'login'
            ? 'Sign in to save trips and access your history.'
            : 'Create an account to save and revisit your trip plans.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-md px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-accent hover:bg-accent-dark text-white font-semibold text-sm transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-text-muted text-center mt-4">
          {mode === 'login' ? (
            <>No account? <button onClick={() => { setMode('register'); setError(null) }} className="text-accent font-medium cursor-pointer">Create one</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(null) }} className="text-accent font-medium cursor-pointer">Sign in</button></>
          )}
        </p>
      </div>
    </div>
  )
}
