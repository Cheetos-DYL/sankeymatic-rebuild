import { useRef, useCallback, useEffect } from 'react'
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
    Planning: '#4CAF50',
    Design: '#2196F3',
    Development: '#FF9800',
    Testing: '#9C27B0',
    Release: '#F44336',
  },
  pastel: {
    Planning: '#81C784',
    Design: '#90CAF9',
    Development: '#FFCC80',
    Testing: '#CE93D8',
    Release: '#EF9A9A',
  },
  vivid: {
    Planning: '#2E7D32',
    Design: '#1565C0',
    Development: '#E65100',
    Testing: '#6A1B9A',
    Release: '#B71C1C',
  },
  mono: {
    Planning: '#555555',
    Design: '#444444',
    Development: '#666666',
    Testing: '#777777',
    Release: '#333333',
  },
}

function getSectionColor(section: string, colorScheme: string): string {
  const scheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.default
  if (section && scheme[section]) return scheme[section]
  if (section) {
    let hash = 0
    for (let i = 0; i < section.length; i++) {
      hash = section.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 60%, 50%)`
  }
  return '#607D8B'
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00')
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayDate(date: Date, dateFormat: string): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  switch (dateFormat) {
    case 'us': return `${m}/${d}/${y}`
    case 'eu': return `${d}.${m}.${y}`
    default: return `${y}-${m}-${d}`
  }
}

/* ─── Financial Year helpers ─── */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Get FY number and quarter for a given date */
function getFYInfo(date: Date, fyStartMonth: number): { fy: number; quarter: number; monthInFY: number } {
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()

  // Months in FY order starting from fyStartMonth
  const monthOffset = ((month - fyStartMonth + 12) % 12) // 0-11
  const quarter = Math.floor(monthOffset / 3) + 1 // 1-4
  const monthInFY = monthOffset + 1 // 1-12

  // FY number is the calendar year of the FY's ending month
  // e.g. if FY starts April, FY27 = April 2026 - March 2027
  let fy: number
  if (fyStartMonth === 1) {
    // Calendar year FY (Jan start)
    fy = year
  } else if (month >= fyStartMonth) {
    // We're in the first 12 months of this FY
    fy = year + 1 - Math.floor((12 - (13 - fyStartMonth)) / 12)
    // Simpler: FY year is the year the FY ends
    fy = year + 1
    if (month >= fyStartMonth && month <= 12) {
      fy = year + 1
    } else {
      fy = year
    }
  } else {
    fy = year
  }

  // Simpler logic: if current month >= fyStartMonth, FY ends next year
  if (month >= fyStartMonth) {
    fy = year + 1
  } else {
    fy = year
  }

  return { fy, quarter, monthInFY }
}

/** Get the FY label for a date */
function getFYLabel(date: Date, fyStartMonth: number, labelType: 'fy' | 'full' | 'both'): string {
  const { fy, quarter } = getFYInfo(date, fyStartMonth)

  if (labelType === 'full') {
    // Get the month range for this quarter in FY
    const qStartMonth = ((fyStartMonth - 1 + (quarter - 1) * 3) % 12)
    const qEndMonth = (qStartMonth + 2) % 12
    const startName = MONTH_NAMES[qStartMonth]
    const endName = MONTH_NAMES[qEndMonth]
    const startYear = qStartMonth >= fyStartMonth - 1 ? fy - 1 : fy
    return `${startName}-${endName} ${startYear + (qEndMonth >= fyStartMonth - 1 ? 1 : 0)}`
  }

  if (labelType === 'both') {
    const qStartMonth = ((fyStartMonth - 1 + (quarter - 1) * 3) % 12)
    const qEndMonth = (qStartMonth + 2) % 12
    const startName = MONTH_NAMES[qStartMonth]
    const endName = MONTH_NAMES[qEndMonth]
    const startYear = qStartMonth >= fyStartMonth - 1 ? fy - 1 : fy
    return `FY${String(fy).slice(-2)} Q${quarter} (${startName}-${endName})`
  }

  return `FY${String(fy).slice(-2)} Q${quarter}`
}

/** Get half-year label */
function getHalfYearLabel(date: Date, fyStartMonth: number, labelType: 'fy' | 'full' | 'both'): string {
  const { fy } = getFYInfo(date, fyStartMonth)
  const month = date.getMonth() + 1
  const monthOffset = ((month - fyStartMonth + 12) % 12)
  const half = monthOffset < 6 ? 1 : 2

  if (labelType === 'full') {
    const hStartMonth = ((fyStartMonth - 1 + (half - 1) * 6) % 12)
    const hEndMonth = (hStartMonth + 5) % 12
    const startName = MONTH_NAMES[hStartMonth]
    const endName = MONTH_NAMES[hEndMonth]
    const year = hStartMonth >= fyStartMonth - 1 ? fy - 1 : fy
    return `${startName}-${endName} ${year + (hEndMonth >= fyStartMonth - 1 ? 1 : 0)}`
  }

  if (labelType === 'both') {
    return `FY${String(fy).slice(-2)} H${half}`
  }

  return `FY${String(fy).slice(-2)} H${half}`
}

/** Generate timeline markers based on unit */
interface TimelineMarker {
  x: number
  label: string
  date: Date
}

function generateTimelineMarkers(
  chartStart: Date,
  chartEnd: Date,
  totalDays: number,
  dayWidth: number,
  labelWidth: number,
  timelineUnit: string,
  fyStartMonth: number,
  fyLabelType: 'fy' | 'full' | 'both',
): TimelineMarker[] {
  const markers: TimelineMarker[] = []

  if (timelineUnit === 'day') {
    // Daily markers — show every 7 days to avoid clutter
    let current = new Date(chartStart)
    while (current <= chartEnd) {
      const daysFromStart = Math.ceil((current.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
      if (daysFromStart >= 0) {
        markers.push({
          x: labelWidth + daysFromStart * dayWidth,
          label: `${current.getMonth() + 1}/${current.getDate()}`,
          date: new Date(current),
        })
      }
      current = addDays(current, 7)
    }
  } else if (timelineUnit === 'month') {
    // Monthly markers
    let current = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1)
    while (current <= chartEnd) {
      const daysFromStart = Math.ceil((current.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
      if (daysFromStart >= 0) {
        markers.push({
          x: labelWidth + daysFromStart * dayWidth,
          label: `${current.getMonth() + 1}/${current.getDate()}`,
          date: new Date(current),
        })
      }
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
    }
  } else if (timelineUnit === 'quarter') {
    // Quarterly markers (aligned to FY)
    let current = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1)
    // Align to FY quarter boundary
    const monthOffset = ((current.getMonth() + 1 - fyStartMonth + 12) % 12)
    const quarterInFY = Math.floor(monthOffset / 3)
    current = new Date(current.getFullYear(), fyStartMonth - 1 + quarterInFY * 3, 1)
    if (current > chartStart) {
      current = addDays(current, -1)
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
    }

    while (current <= chartEnd) {
      const daysFromStart = Math.ceil((current.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
      if (daysFromStart >= 0) {
        markers.push({
          x: labelWidth + daysFromStart * dayWidth,
          label: getFYLabel(current, fyStartMonth, fyLabelType),
          date: new Date(current),
        })
      }
      current = new Date(current.getFullYear(), current.getMonth() + 3, 1)
    }
  } else if (timelineUnit === 'halfyear') {
    // Half-year markers
    let current = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1)
    // Align to FY half-year boundary
    const monthOffset = ((current.getMonth() + 1 - fyStartMonth + 12) % 12)
    const halfInFY = Math.floor(monthOffset / 6)
    current = new Date(current.getFullYear(), fyStartMonth - 1 + halfInFY * 6, 1)
    if (current > chartStart) {
      current = addDays(current, -1)
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
    }

    while (current <= chartEnd) {
      const daysFromStart = Math.ceil((current.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
      if (daysFromStart >= 0) {
        markers.push({
          x: labelWidth + daysFromStart * dayWidth,
          label: getHalfYearLabel(current, fyStartMonth, fyLabelType),
          date: new Date(current),
        })
      }
      current = new Date(current.getFullYear(), current.getMonth() + 6, 1)
    }
  } else if (timelineUnit === 'year') {
    // Year markers — find the FY start closest to chartStart
    // Start from the FY year that contains chartStart
    const chartStartDate = chartStart.getTime()
    let current = new Date(chartStart.getFullYear(), fyStartMonth - 1, 1)
    // If this FY start is after chartStart, step back one FY
    if (current.getTime() > chartStartDate) {
      current = new Date(current.getFullYear() - 1, fyStartMonth - 1, 1)
    }
    // Safety: limit to 10 iterations
    let safety = 0
    while (current.getTime() <= chartEnd.getTime() && safety < 10) {
      const daysFromStart = Math.ceil((current.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
      if (daysFromStart >= 0) {
        const { fy } = getFYInfo(current, fyStartMonth)
        markers.push({
          x: labelWidth + daysFromStart * dayWidth,
          label: fyLabelType === 'full' ? `FY${fy}` : `FY${String(fy).slice(-2)}`,
          date: new Date(current),
        })
      }
      current = new Date(current.getFullYear() + 1, fyStartMonth - 1, 1)
      safety++
    }
  }

  return markers
}

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
    const svgEl = svgRef.current
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const scale = 2
    const vbW = svgEl.viewBox.baseVal.width || svgEl.clientWidth
    const vbH = svgEl.viewBox.baseVal.height || svgEl.clientHeight
    canvas.width = vbW * scale
    canvas.height = vbH * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `gantt-chart-${Date.now()}.png`
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [])

  const handleExportSVG = useCallback(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gantt-chart-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  // Auto-scroll to today's date when chart loads
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (tasks.length === 0) return
    const container = scrollContainerRef.current
    if (!container) return
    const timer = setTimeout(() => {
      const today = new Date()
      const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)])
      const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
      const chartStart = addDays(minDate, -3)
      const daysFromStart = Math.ceil((today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
      const scrollTarget = Math.max(0, daysFromStart * dayWidth - container.clientWidth / 2)
      container.scrollLeft = scrollTarget
    }, 100)
    return () => clearTimeout(timer)
  }, [tasks, dayWidth])

  if (tasks.length === 0) {
    return (
      <div className="gantt-stage">
        <div className="gantt-empty">
          <h2 className="gantt-empty__title">Build a Gantt Chart</h2>
          <p className="gantt-empty__text">
            Enter tasks using Mermaid Gantt syntax on the left.
          </p>
          <code className="gantt-empty__code">
            gantt<br/>
            &nbsp;&nbsp;title Project Timeline<br/>
            &nbsp;&nbsp;dateFormat YYYY-MM-DD<br/>
            <br/>
            &nbsp;&nbsp;section Planning<br/>
            &nbsp;&nbsp;Research :a1, 2026-01-01, 15d
          </code>
        </div>
      </div>
    )
  }

  // Calculate date range
  const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)])
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))

  // Add padding days
  const chartStart = addDays(minDate, -3)
  const chartEnd = addDays(maxDate, 3)
  const totalDays = Math.ceil((chartEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))

  // Layout constants (using config values)
  const headerHeight = 50
  const labelWidth = 180
  const chartWidth = totalDays * dayWidth
  const svgWidth = labelWidth + chartWidth + 20
  const svgHeight = headerHeight + tasks.length * rowHeight + 20

  // Generate timeline markers based on unit setting
  const timelineMarkers = generateTimelineMarkers(
    chartStart, chartEnd, totalDays, dayWidth, labelWidth,
    timelineUnit, fyStartMonth, fyLabelType,
  )

  // Build today marker position
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
            const container = scrollContainerRef.current
            if (!container) return
            const today = new Date()
            const allDates = tasks.flatMap(t => [parseDate(t.startDate), parseDate(t.endDate)])
            const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
            const chartStart = addDays(minDate, -3)
            const daysFromStart = Math.ceil((today.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
            const scrollTarget = Math.max(0, daysFromStart * dayWidth - container.clientWidth / 2)
            container.scrollTo({ left: scrollTarget, behavior: 'smooth' })
          }}>Today</button>
          <button className="btn-pill btn-pill--primary" onClick={handleExportPNG}>Download PNG</button>
          <button className="btn-pill btn-pill--secondary" onClick={handleExportSVG}>Download SVG</button>
        </div>
      </div>
      <div className="gantt-stage__scroll" ref={scrollContainerRef}>
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="gantt-svg"
        >
          {/* Background */}
          {!bgTransparent && <rect width={svgWidth} height={svgHeight} fill={bgColor} />}

          {/* Title in SVG */}
          {title && (
            <text
              x={svgWidth / 2}
              y={headerHeight - 12}
              fontSize={14}
              fill="#333"
              textAnchor="middle"
              fontFamily="var(--font-sans)"
              fontWeight={600}
            >
              {title}
            </text>
          )}

          {/* Arrow marker definition for dependency arrows */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#999" />
            </marker>
          </defs>

          {/* Header: timeline markers */}
          <g className="gantt-header">
            <rect x={0} y={0} width={svgWidth} height={headerHeight} fill="#f8f9fa" />
            {timelineMarkers.map((marker, i) => (
              <g key={`marker-${i}`}>
                {showGridLines && (
                  <line
                    x1={marker.x} y1={headerHeight}
                    x2={marker.x} y2={svgHeight}
                    stroke="#e0e0e0"
                    strokeWidth={1}
                  />
                )}
                <text
                  x={marker.x + 4}
                  y={headerHeight - 8}
                  fontSize={timelineUnit === 'year' ? 12 : 11}
                  fill="#666"
                  fontFamily="var(--font-sans)"
                  fontWeight={timelineUnit === 'year' ? 600 : 400}
                >
                  {marker.label}
                </text>
              </g>
            ))}
          </g>

          {/* Today marker */}
          {showToday && showTodayMarker && (
            <g className="gantt-today">
              <line
                x1={todayX} y1={headerHeight}
                x2={todayX} y2={svgHeight}
                stroke="#F44336"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
              <text
                x={todayX}
                y={headerHeight - 4}
                fontSize={10}
                fill="#F44336"
                textAnchor="middle"
                fontFamily="var(--font-sans)"
                fontWeight={600}
              >
                TODAY
              </text>
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

            // Determine opacity based on states
            const isDone = task.states?.includes('done')
            const barOpacity = isDone ? 0.5 : 0.85

            return (
              <g key={task.id}>
                {/* Row background */}
                <rect
                  x={0} y={y}
                  width={svgWidth} height={rowHeight}
                  fill={i % 2 === 0 ? 'white' : '#fafafa'}
                />

                {/* Task label */}
                <text
                  x={12} y={y + rowHeight / 2 + 4}
                  fontSize={13}
                  fill="#333"
                  fontFamily="var(--font-sans)"
                  textDecoration={isDone ? 'line-through' : 'none'}
                >
                  {task.name}
                </text>

                {/* Section indicator */}
                {task.section && (
                  <rect
                    x={0} y={y}
                    width={4} height={rowHeight}
                    fill={color}
                  />
                )}

                {/* Task bar with tooltip */}
                <rect
                  x={barX}
                  y={y + 6}
                  width={barWidth}
                  height={rowHeight - 12}
                  rx={4}
                  fill={color}
                  opacity={barOpacity}
                >
                  <title>{`${task.name}: ${formatDisplayDate(taskStart, dateFormat)} → ${formatDisplayDate(taskEnd, dateFormat)} (${task.durationDays}d)`}</title>
                </rect>

                {/* Duration label on bar */}
                {barWidth > 40 && (
                  <text
                    x={barX + barWidth / 2}
                    y={y + rowHeight / 2 + 4}
                    fontSize={11}
                    fill="white"
                    textAnchor="middle"
                    fontFamily="var(--font-sans)"
                    fontWeight={500}
                    pointerEvents="none"
                  >
                    {task.durationDays}d
                  </text>
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

            // End of dependency task bar
            const depEnd = parseDate(depTask.endDate)
            const depEndDays = Math.ceil((depEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
            const fromX = labelWidth + depEndDays * dayWidth + dayWidth * 0.5

            // Start of this task bar
            const taskStart = parseDate(task.startDate)
            const taskStartDays = Math.ceil((taskStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
            const toX = labelWidth + taskStartDays * dayWidth

            // Draw a curved arrow
            const midX = (fromX + toX) / 2
            const path = `M${fromX} ${depY} C${midX} ${depY} ${midX} ${taskY} ${toX} ${taskY}`

            return (
              <g key={`dep-${task.id}`}>
                <path
                  d={path}
                  fill="none"
                  stroke="#999"
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                />
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
