import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request if available
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Extract server error message from envelope
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const serverMsg = error.response?.data?.message
    if (serverMsg) return Promise.reject(new Error(serverMsg))
    return Promise.reject(error)
  }
)

function unwrap(response) {
  const body = response.data
  if (body.status === 'error') throw new Error(body.message || 'Request failed')
  return body.data
}

// ── Public endpoints ──

export async function geocode(query) {
  const resp = await client.get('/api/geocode/', { params: { q: query } })
  return unwrap(resp)
}

export async function planTrip({ currentLocation, pickupLocation, dropoffLocation, currentCycleUsed }) {
  const resp = await client.post('/api/trip/plan/', {
    current_location: currentLocation,
    pickup_location: pickupLocation,
    dropoff_location: dropoffLocation,
    current_cycle_used: currentCycleUsed,
  })
  return unwrap(resp)
}

export async function healthCheck() {
  try { await client.get('/api/health/'); return true } catch { return false }
}

// ── Auth endpoints ──

export async function login(username, password) {
  const resp = await client.post('/api/auth/login/', { username, password })
  const { access, refresh } = resp.data
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
  // Get user info
  const user = await getMe()
  return user
}

export async function register(username, password, email) {
  const resp = await client.post('/api/auth/register/', { username, password, email })
  const data = unwrap(resp)
  localStorage.setItem('access_token', data.access)
  localStorage.setItem('refresh_token', data.refresh)
  return data.user
}

export async function getMe() {
  try {
    const resp = await client.get('/api/auth/me/')
    return unwrap(resp)
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function isLoggedIn() {
  return !!localStorage.getItem('access_token')
}

// ── Trip save/load (requires auth) ──

export async function saveTrip(tripData) {
  const resp = await client.post('/api/trips/save/', tripData)
  return unwrap(resp)
}

export async function listTrips() {
  const resp = await client.get('/api/trips/')
  return unwrap(resp)
}

export async function getTrip(id) {
  const resp = await client.get(`/api/trips/${id}/`)
  return unwrap(resp)
}

export async function deleteTrip(id) {
  await client.delete(`/api/trips/${id}/delete/`)
}
