import './GanttStage.css'

interface GanttTask {
  id: number
  name: string
  section?: string
  startDate: string
  endDate: string
  durationDays: number
  color: string
}

interface GanttStageProps {
  tasks: GanttTask[]
  projectDate: string
}

const SECTION_COLORS: Record<string, string> = {
  Planning: '#4CAF50',
  Design: '#2196F3',
  Development: '#FF9800',
  Testing: '#9C27B0',
  Release: '#F44336',
}

function getSectionColor(section?: string): string {
  if (section && SECTION_COLORS[section]) return SECTION_COLORS[section]
  // Generate a color from the section name
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

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function GanttStage({ tasks, projectDate }: GanttStageProps) {
  if (tasks.length === 0) {
    return (
      <div className="gantt-stage">
        <div className="gantt-empty">
          <h2 className="gantt-empty__title">Build a Gantt Chart</h2>
          <p className="gantt-empty__text">
            Enter tasks using the text editor on the left.
          </p>
          <code className="gantt-empty__code">
            [Name] Start ~ Duration
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

  // Layout constants
  const rowHeight = 36
  const headerHeight = 50
  const labelWidth = 180
  const dayWidth = 40
  const chartWidth = totalDays * dayWidth
  const svgWidth = labelWidth + chartWidth + 20
  const svgHeight = headerHeight + tasks.length * rowHeight + 20

  // Group tasks by section for visual grouping
  const sections = new Map<string, GanttTask[]>()
  tasks.forEach(t => {
    const section = t.section || 'Default'
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(t)
  })

  // Generate week markers
  const weekMarkers: { x: number; label: string }[] = []
  let currentWeekStart = new Date(chartStart)
  // Align to Monday
  const dayOfWeek = currentWeekStart.getDay()
  currentWeekStart.setDate(currentWeekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  
  while (currentWeekStart <= chartEnd) {
    const daysFromStart = Math.ceil((currentWeekStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
    if (daysFromStart >= 0) {
      weekMarkers.push({
        x: labelWidth + daysFromStart * dayWidth,
        label: `${currentWeekStart.getMonth() + 1}/${currentWeekStart.getDate()}`,
      })
    }
    currentWeekStart = addDays(currentWeekStart, 7)
  }

  return (
    <div className="gantt-stage">
      <div className="gantt-export-bar">
        <span className="gantt-export-bar__info">{tasks.length} tasks • {totalDays} days</span>
      </div>
      <div className="gantt-stage__scroll">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="gantt-svg"
        >
          {/* Background */}
          <rect width={svgWidth} height={svgHeight} fill="white" />

          {/* Header: date labels */}
          <g className="gantt-header">
            <rect x={0} y={0} width={svgWidth} height={headerHeight} fill="#f8f9fa" />
            {weekMarkers.map((marker, i) => (
              <g key={`week-${i}`}>
                <line
                  x1={marker.x} y1={headerHeight}
                  x2={marker.x} y2={svgHeight}
                  stroke="#e0e0e0"
                  strokeWidth={1}
                />
                <text
                  x={marker.x + 4}
                  y={headerHeight - 8}
                  fontSize={11}
                  fill="#666"
                  fontFamily="var(--font-sans)"
                >
                  {marker.label}
                </text>
              </g>
            ))}
          </g>

          {/* Task rows */}
          {tasks.map((task, i) => {
            const y = headerHeight + i * rowHeight
            const taskStart = parseDate(task.startDate)
            const taskEnd = parseDate(task.endDate)
            const startDays = Math.ceil((taskStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
            const durationDays = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24))
            const barX = labelWidth + startDays * dayWidth
            const barWidth = Math.max(durationDays * dayWidth, 8)
            const color = task.color || getSectionColor(task.section)

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

                {/* Task bar */}
                <rect
                  x={barX}
                  y={y + 6}
                  width={barWidth}
                  height={rowHeight - 12}
                  rx={4}
                  fill={color}
                  opacity={0.85}
                />

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
                  >
                    {task.durationDays}d
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
