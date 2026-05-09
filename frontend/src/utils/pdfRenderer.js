/**
 * Renders FMCSA Daily Log Sheets directly using jsPDF drawing commands.
 * No DOM capture — pixel-perfect output every time.
 */

const STATUSES = ['off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving']
const STATUS_LABELS = ['Off Duty', 'Sleeper Berth', 'Driving', 'On Duty (Not Drv)']
const HOUR_LABELS = ['M','1','2','3','4','5','6','7','8','9','10','11','N','1','2','3','4','5','6','7','8','9','10','11']

function cleanLocation(name) {
  if (!name) return 'En route'
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(name.trim())) return 'En route'
  return name
}

function timeToFraction(timeStr) {
  if (!timeStr) return 0
  if (timeStr === '24:00') return 1
  const [h, m] = timeStr.split(':').map(Number)
  return (h + (m || 0) / 60) / 24
}

function drawLogSheet(pdf, log, pageIdx, totalPages, username) {
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const m = 10 // margin

  // Colors
  const BLACK = [28, 25, 23]
  const GRAY = [120, 113, 108]
  const LIGHT = [214, 211, 209]
  const VERY_LIGHT = [245, 245, 244]
  const ACCENT = [234, 88, 12]

  const dateObj = new Date(log.date + 'T00:00:00')
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  // === HEADER ===
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...BLACK)
  pdf.text("DRIVER'S DAILY LOG", m, m + 6)

  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...GRAY)
  pdf.text('One Calendar Day — 24 Hours', m, m + 10)

  pdf.setFontSize(6)
  pdf.text('Original — File at home terminal', W - m, m + 6, { align: 'right' })
  pdf.text('Duplicate — Driver retains for 8 days', W - m, m + 9, { align: 'right' })

  // Header fields
  const fieldY = m + 16
  pdf.setFontSize(7)
  pdf.setTextColor(...GRAY)

  const fields = [
    { label: 'DATE:', value: dateStr, x: m, w: 70 },
    { label: 'FROM:', value: cleanLocation(log.from_location), x: m + 80, w: 70 },
    { label: 'TO:', value: cleanLocation(log.to_location), x: m + 160, w: 70 },
  ]
  const fields2 = [
    { label: 'MILES:', value: String(Math.round(log.total_miles_today || 0)), x: m, w: 70 },
    { label: 'CARRIER:', value: 'ELD Trip Planner LLC', x: m + 80, w: 70 },
    { label: 'VEHICLE:', value: 'TRK-001 / TRL-001', x: m + 160, w: 70 },
  ]

  const drawFields = (list, y) => {
    list.forEach(f => {
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(...GRAY)
      pdf.setFontSize(6)
      pdf.text(f.label, f.x, y)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...BLACK)
      pdf.setFontSize(7.5)
      pdf.text(f.value, f.x + 15, y)
      // Underline
      pdf.setDrawColor(...LIGHT)
      pdf.setLineWidth(0.2)
      pdf.line(f.x + 15, y + 0.5, f.x + f.w, y + 0.5)
    })
  }

  drawFields(fields, fieldY)
  drawFields(fields2, fieldY + 7)

  // === GRAPH GRID ===
  const gridX = m + 18
  const gridY = fieldY + 18
  const gridW = W - m * 2 - 30
  const gridH = 48
  const rowH = gridH / 4
  const hourW = gridW / 24

  // Grid background
  pdf.setFillColor(...VERY_LIGHT)
  pdf.rect(gridX, gridY, gridW, rowH, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.rect(gridX, gridY + rowH, gridW, rowH, 'F')
  pdf.setFillColor(...VERY_LIGHT)
  pdf.rect(gridX, gridY + rowH * 2, gridW, rowH, 'F')
  pdf.setFillColor(255, 255, 255)
  pdf.rect(gridX, gridY + rowH * 3, gridW, rowH, 'F')

  // Grid border
  pdf.setDrawColor(...GRAY)
  pdf.setLineWidth(0.3)
  pdf.rect(gridX, gridY, gridW, gridH)

  // Row separators
  pdf.setDrawColor(...LIGHT)
  pdf.setLineWidth(0.15)
  for (let i = 1; i < 4; i++) {
    pdf.line(gridX, gridY + i * rowH, gridX + gridW, gridY + i * rowH)
  }

  // Hour lines
  for (let i = 0; i <= 24; i++) {
    const x = gridX + i * hourW
    const isMajor = i === 0 || i === 12 || i === 24
    const lineColor = isMajor ? GRAY : LIGHT
    pdf.setDrawColor(...lineColor)
    pdf.setLineWidth(isMajor ? 0.3 : 0.1)
    pdf.line(x, gridY, x, gridY + gridH)

    // Hour label
    if (i < 24) {
      pdf.setFontSize(5)
      pdf.setFont('helvetica', (i === 0 || i === 12) ? 'bold' : 'normal')
      pdf.setTextColor(...GRAY)
      pdf.text(HOUR_LABELS[i], x + hourW / 2, gridY - 1.5, { align: 'center' })
    }
  }

  // 15-min ticks (tiny marks at top)
  pdf.setDrawColor(...LIGHT)
  pdf.setLineWidth(0.08)
  for (let i = 0; i < 96; i++) {
    if (i % 4 === 0) continue
    const x = gridX + (i / 96) * gridW
    pdf.line(x, gridY, x, gridY + 1)
  }

  // Row labels
  pdf.setFontSize(5.5)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...GRAY)
  STATUS_LABELS.forEach((label, i) => {
    const y = gridY + i * rowH + rowH / 2
    const lines = label.split(' ')
    if (lines.length > 1) {
      pdf.text(lines[0], gridX - 2, y - 1.5, { align: 'right' })
      pdf.text(lines.slice(1).join(' '), gridX - 2, y + 1.5, { align: 'right' })
    } else {
      pdf.text(label, gridX - 2, y + 0.5, { align: 'right' })
    }
  })

  // Totals column
  const totals = log.totals || {}
  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...BLACK)
  STATUSES.forEach((s, i) => {
    const val = (totals[s] || 0).toFixed(2)
    const y = gridY + i * rowH + rowH / 2 + 0.5
    pdf.text(val, gridX + gridW + 2, y)
  })

  // === DUTY STATUS LINES ===
  const events = log.events || []
  pdf.setDrawColor(...BLACK)
  pdf.setLineWidth(0.7)

  let prevY = null
  events.forEach((evt) => {
    const x1 = gridX + timeToFraction(evt.start) * gridW
    const x2 = gridX + timeToFraction(evt.end) * gridW
    const statusIdx = STATUSES.indexOf(evt.status)
    if (statusIdx === -1) return
    const y = gridY + statusIdx * rowH + rowH / 2

    // Vertical transition
    if (prevY !== null && prevY !== y) {
      pdf.line(x1, prevY, x1, y)
    }

    // Horizontal status line
    if (x2 - x1 > 0.2) {
      pdf.line(x1, y, x2, y)
    }

    prevY = y
  })

  // === REMARKS ===
  const remarksY = gridY + gridH + 8
  pdf.setFontSize(7)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...BLACK)
  pdf.text('REMARKS', m, remarksY)

  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...GRAY)

  const remarks = (log.remarks || []).filter(r => {
    const loc = r.location || ''
    return !/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(loc.trim())
  })

  remarks.slice(0, 6).forEach((r, i) => {
    const y = remarksY + 5 + i * 3.5
    pdf.text(`${r.time || ''}`, m + 2, y)
    pdf.text(`— ${r.location || 'En route'}`, m + 16, y)
    if (r.action) {
      pdf.setTextColor(168, 162, 158)
      pdf.text(`(${r.action})`, m + 70, y)
      pdf.setTextColor(...GRAY)
    }
  })

  if (remarks.length === 0) {
    pdf.setTextColor(168, 162, 158)
    pdf.text('Continuing from prior day', m + 2, remarksY + 5)
  }

  // === TOTALS BAR ===
  const barY = remarksY + 28
  pdf.setDrawColor(...LIGHT)
  pdf.setLineWidth(0.2)
  pdf.line(m, barY, W - m, barY)

  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'normal')
  const items = [
    `Off Duty: ${(totals.off_duty || 0).toFixed(2)}`,
    `Sleeper: ${(totals.sleeper_berth || 0).toFixed(2)}`,
    `Driving: ${(totals.driving || 0).toFixed(2)}`,
    `On Duty ND: ${(totals.on_duty_not_driving || 0).toFixed(2)}`,
  ]
  pdf.setTextColor(...GRAY)
  items.forEach((item, i) => {
    pdf.text(item, m + i * 45, barY + 4)
  })

  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...BLACK)
  pdf.text(`Total: ${(totals.total || 0).toFixed(2)}`, W - m, barY + 4, { align: 'right' })

  // === PAGE BRANDING ===
  pdf.setFontSize(6)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...ACCENT)
  pdf.text('ELD Trip Planner', m, H - m)

  pdf.setTextColor(170, 170, 170)
  pdf.text(`Driver: ${username || 'Guest'}`, m + 30, H - m)
  pdf.text('FMCSA HOS Compliant', W / 2, H - m, { align: 'center' })
  pdf.text(`Day ${log.day_number} — Page ${pageIdx + 1} of ${totalPages}`, W - m, H - m, { align: 'right' })
}

export async function generateLogPdf(dailyLogs, username, singleIdx = false) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const indices = singleIdx !== false ? [singleIdx] : dailyLogs.map((_, i) => i)

  indices.forEach((i, idx) => {
    if (idx > 0) pdf.addPage()
    drawLogSheet(pdf, dailyLogs[i], idx, indices.length, username)
  })

  const dateStr = dailyLogs[0]?.date?.replace(/-/g, '') || 'trip'
  const suffix = singleIdx !== false ? `-day${dailyLogs[singleIdx].day_number}` : '-all'
  pdf.save(`eld-logs-${dateStr}${suffix}.pdf`)
}
