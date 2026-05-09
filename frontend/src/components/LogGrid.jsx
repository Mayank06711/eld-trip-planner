const STATUSES = ['off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving']

const HOUR_LABELS = [
  'M', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
  'N', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
]

const ROW_LABELS = ['Off Duty', 'Sleeper\nBerth', 'Driving', 'On Duty\n(Not Drv)']

// Grid dimensions
const G = {
  LEFT: 72,
  TOP: 22,
  WIDTH: 696,     // 29px per hour * 24
  ROW_H: 32,
  get HOUR_W() { return this.WIDTH / 24 },
  get TICK_W() { return this.HOUR_W / 4 },
  get HEIGHT() { return this.ROW_H * 4 },
}

function timeToX(timeStr) {
  if (!timeStr) return G.LEFT
  if (timeStr === '24:00') return G.LEFT + G.WIDTH
  const [h, m] = timeStr.split(':').map(Number)
  return G.LEFT + (h + (m || 0) / 60) * G.HOUR_W
}

function rowY(status) {
  const idx = STATUSES.indexOf(status)
  return idx >= 0 ? G.TOP + idx * G.ROW_H + G.ROW_H / 2 : G.TOP
}

export default function LogGrid({ events, totals }) {
  const W = G.LEFT + G.WIDTH + 50
  const H = G.TOP + G.HEIGHT + 20

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 800 }}>

      {/* Grid background with alternating row shading */}
      {STATUSES.map((_, i) => (
        <rect key={`bg-${i}`}
          x={G.LEFT} y={G.TOP + i * G.ROW_H}
          width={G.WIDTH} height={G.ROW_H}
          fill={i % 2 === 0 ? '#FAFAF9' : '#FFFFFF'}
        />
      ))}

      {/* Grid border */}
      <rect x={G.LEFT} y={G.TOP} width={G.WIDTH} height={G.HEIGHT}
        fill="none" stroke="#A8A29E" strokeWidth={1} />

      {/* Row separator lines */}
      {[1, 2, 3].map(i => (
        <line key={`row-${i}`}
          x1={G.LEFT} y1={G.TOP + i * G.ROW_H}
          x2={G.LEFT + G.WIDTH} y2={G.TOP + i * G.ROW_H}
          stroke="#D6D3D1" strokeWidth={0.5}
        />
      ))}

      {/* Hour columns */}
      {Array.from({ length: 25 }, (_, i) => {
        const x = G.LEFT + i * G.HOUR_W
        const isMidnightOrNoon = i === 0 || i === 12 || i === 24
        return (
          <g key={`h-${i}`}>
            <line
              x1={x} y1={G.TOP} x2={x} y2={G.TOP + G.HEIGHT}
              stroke={isMidnightOrNoon ? '#78716C' : '#E7E5E4'}
              strokeWidth={isMidnightOrNoon ? 1 : 0.5}
            />
            {i < 24 && (
              <text
                x={x + G.HOUR_W / 2} y={G.TOP - 5}
                textAnchor="middle" dominantBaseline="auto"
                fill={isMidnightOrNoon ? '#57534E' : '#A8A29E'}
                fontSize={7.5} fontFamily="'IBM Plex Mono', monospace"
                fontWeight={isMidnightOrNoon ? 600 : 400}
              >
                {HOUR_LABELS[i]}
              </text>
            )}
          </g>
        )
      })}

      {/* 15-min tick marks (small dashes at top of grid only) */}
      {Array.from({ length: 24 * 4 }, (_, i) => {
        if (i % 4 === 0) return null
        const x = G.LEFT + i * G.TICK_W
        return (
          <line key={`t-${i}`}
            x1={x} y1={G.TOP} x2={x} y2={G.TOP + 4}
            stroke="#D6D3D1" strokeWidth={0.5}
          />
        )
      })}

      {/* Row labels */}
      {ROW_LABELS.map((label, i) => {
        const lines = label.split('\n')
        const y = G.TOP + i * G.ROW_H + G.ROW_H / 2
        return (
          <g key={`label-${i}`}>
            {lines.map((line, li) => (
              <text key={li}
                x={G.LEFT - 5}
                y={y + (li - (lines.length - 1) / 2) * 9}
                textAnchor="end" dominantBaseline="middle"
                fill="#78716C" fontSize={7.5}
                fontFamily="'IBM Plex Mono', monospace" fontWeight={500}
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}

      {/* Totals column (right side) */}
      {totals && STATUSES.map((s, i) => {
        const val = totals[s] ?? 0
        const y = G.TOP + i * G.ROW_H + G.ROW_H / 2
        return (
          <text key={`total-${i}`}
            x={G.LEFT + G.WIDTH + 5} y={y}
            textAnchor="start" dominantBaseline="middle"
            fill="#1C1917" fontSize={8.5}
            fontFamily="'IBM Plex Mono', monospace" fontWeight={600}
          >
            {val.toFixed(2)}
          </text>
        )
      })}

      {/* === DUTY STATUS LINES (the main drawn content) === */}
      <DutyLines events={events} />
    </svg>
  )
}

function DutyLines({ events }) {
  if (!events || events.length === 0) return null

  const elements = []
  let prevY = null

  events.forEach((evt, i) => {
    const x1 = timeToX(evt.start)
    const x2 = timeToX(evt.end)
    const y = rowY(evt.status)

    // Vertical transition line
    if (prevY !== null && prevY !== y) {
      elements.push(
        <line key={`v-${i}`}
          x1={x1} y1={prevY} x2={x1} y2={y}
          stroke="#1C1917" strokeWidth={2.5} strokeLinecap="square"
        />
      )
    }

    // Horizontal status line
    if (x2 - x1 > 0.3) {
      elements.push(
        <line key={`h-${i}`}
          x1={x1} y1={y} x2={x2} y2={y}
          stroke="#1C1917" strokeWidth={2.5} strokeLinecap="square"
        />
      )
    }

    prevY = y
  })

  return <g>{elements}</g>
}
