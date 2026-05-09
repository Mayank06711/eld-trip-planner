export const DUTY_STATUSES = {
  off_duty: { label: 'Off Duty', short: 'OFF', color: '#16A34A', row: 0 },
  sleeper_berth: { label: 'Sleeper Berth', short: 'SB', color: '#7C2D12', row: 1 },
  driving: { label: 'Driving', short: 'D', color: '#EA580C', row: 2 },
  on_duty_not_driving: { label: 'On Duty (Not Driving)', short: 'ON', color: '#2563EB', row: 3 },
}

export const STOP_TYPES = {
  start: { label: 'Start', color: '#16A34A', icon: '📍' },
  pickup: { label: 'Pickup', color: '#2563EB', icon: '📦' },
  dropoff: { label: 'Dropoff', color: '#DC2626', icon: '🏁' },
  fuel: { label: 'Fuel Stop', color: '#D97706', icon: '⛽' },
  overnight_rest: { label: 'Rest (10hr)', color: '#7C2D12', icon: '🛏️' },
  rest_break: { label: 'Break (30min)', color: '#0891B2', icon: '☕' },
  cycle_restart: { label: 'Cycle Reset (34hr)', color: '#7C2D12', icon: '🔄' },
  pre_trip: { label: 'Pre-trip', color: '#64748B', icon: '🔧' },
}

export const GRID = {
  LEFT: 80,
  TOP: 10,
  WIDTH: 720,
  ROW_HEIGHT: 36,
  get HOUR_W() { return this.WIDTH / 24 },
  get TICK_W() { return this.HOUR_W / 4 },
  get HEIGHT() { return this.ROW_HEIGHT * 4 },
}
