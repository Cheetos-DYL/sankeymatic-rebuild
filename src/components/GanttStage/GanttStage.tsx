import { useRef, useCallback, useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import './GanttStage.css'

interface GanttTask {
  id: number
  name: string
  section?: string
  startDate: string
  endDate: string
  durationDays: number
  color: string
  dependsOn?: number
  states?: string[]
  progress?: number
  isMilestone?: boolean
}

interface GanttStageProps {
  tasks: GanttTask[]
  projectDate: string
  title?: string
  config?: {
    colorScheme: 'default' | 'pastel' | 'vivid' | 'mono'
    dateFormat: 'iso' | 'us' | 'eu'
    rowHeight: number
    dayWidth: number
    showToday: boolean
    showDependencies: boolean
    showGridLines: boolean
    bgTransparent: boolean
    bgColor: string
    timelineUnit: 'day' | 'month' | 'quarter' | 'halfyear' | 'year'
    fyStartMonth: number
    fyLabelType: 'fy' | 'full' | 'both'
    exportWidth: number
    exportHeight: number
  }
}

const COLOR_SCHEMES: Record<string, Record<string, string>> = {
  default: {
    Planning: '#4CAF50', Design: '#2196F3', Development: '#FF9800',
    Testing: '#9C27B0', Release: '#F44336',
  },
  pastel: {
    Planning: '#81C784', Design: '#90CAF9', Development: '#FFCC80',
    Testing: '#CE93D8', Release: '#EF9A9A',
  },
  vivid: {
    Planning: '#2E7D32', Design: '#1565C0', Development: '#E65100',
    Testing: '#6A1B9A', Release: '#B71C1C',
  },
  mono: {
    Planning: '#555', Design: '#444', Development: '#666',
    Testing: '#777', Release: '#333',
  },
}

function getSectionColor(section: string, colorScheme: string): string {
  const scheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.default
  if (section && scheme[section]) return scheme[section]
  if (section) {
    let hash = 0
    for (let i = 0; i < section.length; i++) hash = section.charCodeAt(i) + ((hash << 5) - hash)
    return `hsl(${Math.abs(hash) % 360}, 60%, 50%)`
  }
  return '#607D8B'
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

function addDays(date: Date, days: number): Date {
  const r = new Date(date); r.setDate(r.getDate() + days); return r
}

function formatDisplayDate(date: Date, dateFormat: string): string {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0')
  switch (dateFormat) { case 'us': return `${m}/${d}/${y}`; case 'eu': return `${d}.${m}.${y}`; default: return `${y}-${m}-${d}` }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/* ─── FY helpers ─── */

function getFYInfo(date: Date, fyStartMonth: number): { fy: number; quarter: number } {
  const month = date.getMonth() + 1, year = date.getFullYear()
  const fy = month >= fyStartMonth ? year + 1 : year
  const monthOffset = ((month - fyStartMonth + 12) % 12)
  const quarter = Math.floor(monthOffset / 3) + 1
  return { fy, quarter }
}

/* ─── Multi-level header markers ─── */

interface HeaderLevel {
  label: string
  x: number
  width: number
  bgColor: string
  textColor: string
}

interface MultiLevelHeader {
  years: HeaderLevel[]
  halfyears: HeaderLevel[]
  quarters: HeaderLevel[]
  months: HeaderLevel[]
}

function dateToX(date: Date, chartStart: Date, dayWidth: number, labelWidth: number): number {
  const days = Math.ceil((date.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
  return labelWidth + days * dayWidth
}

function generateMultiLevelHeader(
  chartStart: Date, chartEnd: Date, dayWidth: number, labelWidth: number,
  fyStartMonth: number, fyLabelType: 'fy' | 'full' | 'both',
  timelineUnit: 'day' | 'month' | 'quarter' | 'halfyear' | 'year' = 'month',
): MultiLevelHeader {
  const years: HeaderLevel[] = []
  const halfyears: HeaderLevel[] = []
  const quarters: HeaderLevel[] = []
  const months: HeaderLevel[] = []

  // Determine which header levels to generate based on timelineUnit
  const showYears = timelineUnit !== 'day'
  const showHalfyears = timelineUnit === 'halfyear'
  const showQuarters = timelineUnit === 'month' || timelineUnit === 'quarter'
  const showMonths = timelineUnit === 'day' || timelineUnit === 'month'

  // ── Year level ──
  if (showYears) {
    const yearColors = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5']
    let yearStart = new Date(chartStart.getFullYear(), fyStartMonth - 1, 1)
    if (yearStart.getTime() > chartStart.getTime()) yearStart = new Date(chartStart.getFullYear() - 1, fyStartMonth - 1, 1)
    let yIdx = 0
    let yCurrent = new Date(yearStart)
    while (yCurrent.getTime() <= chartEnd.getTime()) {
      const nextYear = new Date(yCurrent.getFullYear() + 1, fyStartMonth - 1, 1)
      const start = yCurrent.getTime() < chartStart.getTime() ? chartStart : yCurrent
      const end = nextYear.getTime() > chartEnd.getTime() ? chartEnd : nextYear
      const { fy } = getFYInfo(yCurrent, fyStartMonth)
      years.push({
        label: fyLabelType === 'full' ? `FY${fy}` : `FY${String(fy).slice(-2)}`,
        x: dateToX(start, chartStart, dayWidth, labelWidth),
        width: dateToX(end, chartStart, dayWidth, labelWidth) - dateToX(start, chartStart, dayWidth, labelWidth),
        bgColor: yearColors[yIdx % yearColors.length],
        textColor: '#333',
      })
      yCurrent = nextYear
      yIdx++
    }
  }

  // ── Half-year level ──
  if (showHalfyears) {
    const hyColors = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5']
    let hyCurrent = new Date(chartStart.getFullYear(), fyStartMonth - 1, 1)
    if (hyCurrent.getTime() > chartStart.getTime()) {
      hyCurrent = new Date(chartStart.getFullYear() - 1, fyStartMonth - 1, 1)
    }
    let hyIdx = 0
    while (hyCurrent.getTime() <= chartEnd.getTime()) {
      const nextHy = new Date(hyCurrent.getFullYear(), hyCurrent.getMonth() + 6, 1)
      const start = hyCurrent.getTime() < chartStart.getTime() ? chartStart : hyCurrent
      const end = nextHy.getTime() > chartEnd.getTime() ? chartEnd : nextHy
      const { fy } = getFYInfo(hyCurrent, fyStartMonth)
      const monthInFy = ((hyCurrent.getMonth() + 1 - fyStartMonth + 12) % 12)
      const hyNumber = Math.floor(monthInFy / 6) + 1
      halfyears.push({
        label: `H${hyNumber} FY${String(fy).slice(-2)}`,
        x: dateToX(start, chartStart, dayWidth, labelWidth),
        width: dateToX(end, chartStart, dayWidth, labelWidth) - dateToX(start, chartStart, dayWidth, labelWidth),
        bgColor: hyColors[hyIdx % hyColors.length],
        textColor: '#444',
      })
      hyCurrent = nextHy
      hyIdx++
    }
  }

  // ── Quarter level ──
  if (showQuarters) {
    const qColors = ['#E8F5E9', '#E3F2FD', '#FFF3E0', '#F3E5F5']
    let qCurrent = new Date(chartStart.getFullYear(), fyStartMonth - 1, 1)
    if (qCurrent.getTime() > chartStart.getTime()) {
      qCurrent = new Date(chartStart.getFullYear() - 1, fyStartMonth - 1, 1)
    }
    // Align to quarter boundary
    const initMonthOffset = ((chartStart.getMonth() + 1 - fyStartMonth + 12) % 12)
    const initQ = Math.floor(initMonthOffset / 3)
    qCurrent = new Date(chartStart.getFullYear(), fyStartMonth - 1 + initQ * 3, 1)
    if (qCurrent.getTime() > chartStart.getTime()) {
      qCurrent = new Date(qCurrent.getFullYear() - 1, fyStartMonth - 1 + 3 * 3, 1)
    }

    let qIdx = 0
    while (qCurrent.getTime() <= chartEnd.getTime()) {
      const nextQ = new Date(qCurrent.getFullYear(), qCurrent.getMonth() + 3, 1)
      const start = qCurrent.getTime() < chartStart.getTime() ? chartStart : qCurrent
      const end = nextQ.getTime() > chartEnd.getTime() ? chartEnd : nextQ
      const { quarter } = getFYInfo(qCurrent, fyStartMonth)
      const qLabel = fyLabelType === 'full'
        ? `${MONTH_NAMES[qCurrent.getMonth()]}-${MONTH_NAMES[(qCurrent.getMonth() + 2) % 12]}`
        : `Q${quarter}`
      quarters.push({
        label: qLabel,
        x: dateToX(start, chartStart, dayWidth, labelWidth),
        width: dateToX(end, chartStart, dayWidth, labelWidth) - dateToX(start, chartStart, dayWidth, labelWidth),
        bgColor: qColors[(qIdx) % qColors.length],
        textColor: '#444',
      })
      qCurrent = nextQ
      qIdx++
    }
  }

  // ── Month level ──
  if (showMonths) {
    let mCurrent = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1)
    let mIdx = 0
    while (mCurrent.getTime() <= chartEnd.getTime()) {
      const nextM = new Date(mCurrent.getFullYear(), mCurrent.getMonth() + 1, 1)
      const start = mCurrent.getTime() < chartStart.getTime() ? chartStart : mCurrent
      const end = nextM.getTime() > chartEnd.getTime() ? chartEnd : nextM
      months.push({
        label: MONTH_NAMES[mCurrent.getMonth()],
        x: dateToX(start, chartStart, dayWidth, labelWidth),
        width: dateToX(end, chartStart, dayWidth, labelWidth) - dateToX(start, chartStart, dayWidth, labelWidth),
        bgColor: mIdx % 2 === 0 ? '#f8f9fa' : '#ffffff',
        textColor: '#555',
      })
      mCurrent = nextM
      mIdx++
    }
  }

  return { years, halfyears, quarters, months }
}

/* ─── Component ─── */

export function GanttStage({ tasks, title, config }: GanttStageProps) {
  const colorScheme = config?.colorScheme || 'default'
  const dateFormat = config?.dateFormat || 'iso'
  const rowHeight = config?.rowHeight || 36
  const dayWidth = config?.dayWidth || 40
  const showToday = config?.showToday ?? true
  const showDependencies = config?.showDependencies ?? true
  const showGridLines = config?.showGridLines ?? true
  const bgTransparent = config?.bgTransparent ?? false
  const bgColor = config?.bgColor || '#ffffff'
  const timelineUnit = config?.timelineUnit || 'month'
  const fyStartMonth = config?.fyStartMonth || 4
  const fyLabelType = config?.fyLabelType || 'fy'
  const svgRef = useRef<SVGSVGElement>(null)

  const handleExportPNG = useCallback(() => {
    const svgEl = svgRef.current; if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas'); const scale = 2
    const vbW = svgEl.viewBox.baseVal.width || svgEl.clientWidth
    const vbH = svgEl.viewBox.baseVal.height || svgEl.clientHeight
    canvas.width = vbW * scale; canvas.height = vbH * scale
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = `gantt-${Date.now()}.png`; a.click() }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  const handleExportSVG = useCallback(() => {
    const svgEl = svgRef.current; if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgData], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `gantt-${Date.now()}.svg`; a.click(); URL.revokeObjectURL(url)
  }, [])

  // ── PDF export with jsPDF ──
  const [pdfPreset, setPdfPreset] = useState<'landscape' | 'portrait' | 'a4'>('landscape')
  const handleExportPDF = useCallback(() => {
    const svgEl = svgRef.current; if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)

    // Render SVG to canvas for PDF embedding
    const canvas = document.createElement('canvas')
    const scale = 2
    const vbW = svgEl.viewBox.baseVal.width || svgEl.clientWidth
    const vbH = svgEl.viewBox.baseVal.height || svgEl.clientHeight
    canvas.width = vbW * scale
    canvas.height = vbH * scale
    const ctx = canvas.getContext('2d'); if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const imgData = canvas.toDataURL('image/png')

      // Create PDF with appropriate orientation
      const isLandscape = vbW > vbH
      const orientation = pdfPreset === 'a4' ? 'portrait' : (isLandscape ? 'landscape' : 'portrait')
      const doc = new jsPDF({ orientation, unit: 'px', format: [vbW, vbH] })

      doc.addImage(imgData, 'PNG', 0, 0, vbW, vbH)
      doc.save(`gantt-${Date.now()}.pdf`)
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [pdfPreset])

  // ── PPT-ready SVG export (inline styles + xmlns + fixed pixels) ──
  const handleExportPPT = useCallback(() => {
    const svgEl = svgRef.current; if (!svgEl) return
    // Clone SVG and add xmlns + inline styles for PPT compatibility
    const clone = svgEl.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    // Add inline font-family fallback
    const allTexts = clone.querySelectorAll('text')
    allTexts.forEach(t => {
      const currentFont = t.getAttribute('font-family') || ''
      if (!currentFont.includes('Arial')) {
        t.setAttribute('font-family', `${currentFont}, Arial, sans-serif`)
      }
    })
    const svgData = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `gantt-ppt-${Date.now()}.svg`; a.click(); URL.revokeObjectURL(url)
  }, [])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (tasks.length === 0) return
    const container = scrollContainerRef.current; if (!container) return
    const timer = setTimeout(() => {
      const today = new Date()
      const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)])
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
      const chartStart = addDays(minDate, -3)
      const daysFromStart = Math.ceil((today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
      container.scrollLeft = Math.max(0, daysFromStart * dayWidth - container.clientWidth / 2)
    }, 100)
    return () => clearTimeout(timer)
  }, [tasks, dayWidth])

  if (tasks.length === 0) {
    return (
      <div className="gantt-stage">
        <div className="gantt-empty">
          <h2 className="gantt-empty__title">Build a Gantt Chart</h2>
          <p className="gantt-empty__text">Enter tasks using Mermaid Gantt syntax on the left.</p>
          <code className="gantt-empty__code">
            gantt<br/>&nbsp;&nbsp;title Project Timeline<br/>&nbsp;&nbsp;dateFormat YYYY-MM-DD<br/><br/>&nbsp;&nbsp;section Planning<br/>&nbsp;&nbsp;Research :a1, 2026-01-01, 15d
          </code>
        </div>
      </div>
    )
  }

  const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)])
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
  const chartStart = addDays(minDate, -3)
  const chartEnd = addDays(maxDate, 3)
  const totalDays = Math.ceil((chartEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))

  const labelWidth = 180
  const chartWidth = totalDays * dayWidth
  const svgWidth = labelWidth + chartWidth + 20

  // Multi-level header
  const header = generateMultiLevelHeader(chartStart, chartEnd, dayWidth, labelWidth, fyStartMonth, fyLabelType, timelineUnit)
  const yearRowH = 26, halfyearRowH = 24, quarterRowH = 24, monthRowH = 22
  const headerHeight = (header.years.length > 0 ? yearRowH : 0)
    + (header.halfyears.length > 0 ? halfyearRowH : 0)
    + (header.quarters.length > 0 ? quarterRowH : 0)
    + (header.months.length > 0 ? monthRowH : 0)

  const svgHeight = headerHeight + tasks.length * rowHeight + 20

  const today = new Date()
  const todayDaysFromStart = Math.ceil((today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
  const todayX = labelWidth + todayDaysFromStart * dayWidth
  const showTodayMarker = todayX >= labelWidth && todayX <= svgWidth - 20

  return (
    <div className="gantt-stage">
      <div className="gantt-export-bar">
        <span className="gantt-export-bar__info">
          {title && <strong className="gantt-export-bar__title">{title} • </strong>}
          {tasks.length} tasks • {totalDays} days • {timelineUnit} view
        </span>
        <div className="gantt-export-bar__actions">
          <button className="btn-pill btn-pill--secondary" onClick={() => {
            const container = scrollContainerRef.current; if (!container) return
            const today = new Date()
            const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)])
            const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
            const chartStart = addDays(minDate, -3)
            const daysFromStart = Math.ceil((today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
            container.scrollTo({ left: Math.max(0, daysFromStart * dayWidth - container.clientWidth / 2), behavior: 'smooth' })
          }}>Today</button>
          <select
            className="gantt-export-bar__select"
            value={pdfPreset}
            onChange={e => setPdfPreset(e.target.value as typeof pdfPreset)}
            title="PDF page orientation"
          >
            <option value="landscape">📄 Landscape</option>
            <option value="portrait">📄 Portrait</option>
            <option value="a4">📄 A4</option>
          </select>
          <button className="btn-pill btn-pill--primary" onClick={handleExportPNG}>PNG</button>
          <button className="btn-pill btn-pill--secondary" onClick={handleExportSVG}>SVG</button>
          <button className="btn-pill btn-pill--secondary" onClick={handleExportPPT}>PPT</button>
          <button className="btn-pill btn-pill--accent" onClick={handleExportPDF}>PDF</button>
        </div>
      </div>
      <div className="gantt-stage__scroll" ref={scrollContainerRef}>
        <svg ref={svgRef} width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="gantt-svg">
          {!bgTransparent && <rect width={svgWidth} height={svgHeight} fill={bgColor} />}

          {title && (
            <text x={svgWidth / 2} y={headerHeight - 12} fontSize={14} fill="#333" textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={600}>
              {title}
            </text>
          )}

          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#999" />
            </marker>
          </defs>

          {/* ─── Multi-level Header ─── */}
          <g className="gantt-header">
            {/* Year row */}
            {header.years.length > 0 && (
              <g>
                {header.years.map((yr, i) => (
                  <g key={`yr-${i}`}>
                    <rect x={yr.x} y={0} width={yr.width} height={yearRowH} fill={yr.bgColor} stroke="#ddd" strokeWidth={0.5} />
                    <text x={yr.x + yr.width / 2} y={yearRowH / 2 + 4} fontSize={12} fill={yr.textColor} textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={700}>
                      {yr.label}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Quarter row */}
            {header.quarters.length > 0 && (
              <g>
                {header.quarters.map((q, i) => (
                  <g key={`q-${i}`}>
                    <rect x={q.x} y={yearRowH + (header.halfyears.length > 0 ? halfyearRowH : 0)} width={q.width} height={quarterRowH} fill={q.bgColor} stroke="#ddd" strokeWidth={0.5} />
                    <text x={q.x + q.width / 2} y={yearRowH + (header.halfyears.length > 0 ? halfyearRowH : 0) + quarterRowH / 2 + 4} fontSize={11} fill={q.textColor} textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={600}>
                      {q.label}
                    </text>
                  </g>
                ))}
              </g>
            )}

            {/* Half-year row */}
            {header.halfyears.length > 0 && (
              <g>
                {header.halfyears.map((hy, i) => {
                  const hyY = yearRowH
                  return (
                    <g key={`hy-${i}`}>
                      <rect x={hy.x} y={hyY} width={hy.width} height={halfyearRowH} fill={hy.bgColor} stroke="#ddd" strokeWidth={0.5} />
                      <text x={hy.x + hy.width / 2} y={hyY + halfyearRowH / 2 + 4} fontSize={11} fill={hy.textColor} textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={600}>
                        {hy.label}
                      </text>
                    </g>
                  )
                })}
              </g>
            )}

            {/* Month row */}
            {header.months.length > 0 && (
              <g>
                {header.months.map((m, i) => {
                  const mY = yearRowH + (header.halfyears.length > 0 ? halfyearRowH : 0) + (header.quarters.length > 0 ? quarterRowH : 0)
                  return (
                    <g key={`m-${i}`}>
                      <rect x={m.x} y={mY} width={m.width} height={monthRowH} fill={m.bgColor} stroke="#e0e0e0" strokeWidth={0.5} />
                      <text x={m.x + m.width / 2} y={mY + monthRowH / 2 + 4} fontSize={10} fill={m.textColor} textAnchor="middle" fontFamily="var(--font-sans)">
                        {m.label}
                      </text>
                    </g>
                  )
                })}
              </g>
            )}

            {/* Grid lines — use the lowest-level header present */}
            {showGridLines && (header.months.length > 0 ? header.months : header.halfyears.length > 0 ? header.halfyears : header.quarters.length > 0 ? header.quarters : header.years).map((level, i) => (
              <line key={`gl-${i}`} x1={level.x} y1={headerHeight} x2={level.x} y2={svgHeight} stroke="#e0e0e0" strokeWidth={1} />
            ))}
          </g>

          {/* Today marker */}
          {showToday && showTodayMarker && (
            <g className="gantt-today">
              <line x1={todayX} y1={headerHeight} x2={todayX} y2={svgHeight} stroke="#F44336" strokeWidth={2} strokeDasharray="4 2" />
              <text x={todayX} y={headerHeight - 2} fontSize={9} fill="#F44336" textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={700}>TODAY</text>
            </g>
          )}

          {/* Task rows */}
          {tasks.map((task, i) => {
            const y = headerHeight + i * rowHeight
            const taskStart = parseDate(task.startDate)
            const taskEnd = parseDate(task.endDate)
            const startDays = Math.ceil((taskStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
            const durationDays = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24))
            const barX = labelWidth + startDays * dayWidth
            const barWidth = Math.max(durationDays * dayWidth, 8)
            const color = task.color || getSectionColor(task.section || '', colorScheme)
            const isDone = task.states?.includes('done')

            return (
              <g key={task.id}>
                <rect x={0} y={y} width={svgWidth} height={rowHeight} fill={i % 2 === 0 ? 'white' : '#fafafa'} />
                <text x={12} y={y + rowHeight / 2 + 4} fontSize={13} fill="#333" fontFamily="var(--font-sans)" textDecoration={isDone ? 'line-through' : 'none'}>
                  {task.isMilestone ? `◇ ${task.name}` : task.name}
                </text>
                {task.section && <rect x={0} y={y} width={4} height={rowHeight} fill={color} />}
                {task.isMilestone ? (
                  /* Milestone: render as a diamond ◆ shape */
                  (() => {
                    const diamondCx = barX + dayWidth * 0.5
                    const diamondCy = y + rowHeight / 2
                    const diamondSize = Math.min(rowHeight * 0.45, 12)
                    const diamondPoints = [
                      `${diamondCx},${diamondCy - diamondSize}`,
                      `${diamondCx + diamondSize},${diamondCy}`,
                      `${diamondCx},${diamondCy + diamondSize}`,
                      `${diamondCx - diamondSize},${diamondCy}`,
                    ].join(' ')
                    return (
                      <g>
                        <polygon
                          points={diamondPoints}
                          fill={color}
                          stroke="#fff"
                          strokeWidth={1.5}
                          opacity={isDone ? 0.5 : 1}
                        >
                          <title>{`${task.name}: ${formatDisplayDate(taskStart, dateFormat)}`}</title>
                        </polygon>
                        <text
                          x={diamondCx + diamondSize + 6}
                          y={y + rowHeight / 2 + 4}
                          fontSize={11}
                          fill={color}
                          fontFamily="var(--font-sans)"
                          fontWeight={600}
                        >
                          ◆ {task.name}
                        </text>
                      </g>
                    )
                  })()
                ) : (
                  <>
                    <rect x={barX} y={y + 6} width={barWidth} height={rowHeight - 12} rx={4} fill={color} opacity={isDone ? 0.5 : 0.85}>
                      <title>{`${task.name}: ${formatDisplayDate(taskStart, dateFormat)} → ${formatDisplayDate(taskEnd, dateFormat)} (${task.durationDays}d)`}</title>
                    </rect>
                    {task.progress != null && task.progress > 0 && (
                      <rect
                        x={barX}
                        y={y + 6}
                        width={Math.max(barWidth * (task.progress / 100), 2)}
                        height={rowHeight - 12}
                        rx={4}
                        fill={color}
                        opacity={1}
                      />
                    )}
                    {barWidth > 40 && (
                      <text x={barX + barWidth / 2} y={y + rowHeight / 2 + 4} fontSize={11} fill="white" textAnchor="middle" fontFamily="var(--font-sans)" fontWeight={500} pointerEvents="none">
                        {task.progress != null ? `${task.progress}%` : `${task.durationDays}d`}
                      </text>
                    )}
                  </>
                )}
              </g>
            )
          })}

          {/* Dependency arrows */}
          {showDependencies && tasks.map((task, i) => {
            if (!task.dependsOn) return null
            const depTask = tasks.find(t => t.id === task.dependsOn)
            if (!depTask) return null
            const depIndex = tasks.indexOf(depTask)
            const depY = headerHeight + depIndex * rowHeight + rowHeight / 2
            const taskY = headerHeight + i * rowHeight + rowHeight / 2
            const depEnd = parseDate(depTask.endDate)
            const depEndDays = Math.ceil((depEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
            const fromX = labelWidth + depEndDays * dayWidth + dayWidth * 0.5
            const taskStart = parseDate(task.startDate)
            const taskStartDays = Math.ceil((taskStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
            const toX = labelWidth + taskStartDays * dayWidth
            const midX = (fromX + toX) / 2
            return (
              <g key={`dep-${task.id}`}>
                <path d={`M${fromX} ${depY} C${midX} ${depY} ${midX} ${taskY} ${toX} ${taskY}`} fill="none" stroke="#999" strokeWidth={1.5} markerEnd="url(#arrowhead)" />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
