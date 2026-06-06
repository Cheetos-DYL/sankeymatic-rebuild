/**
 * Gantt Chart Parser — Mermaid.js Syntax (primary) + Legacy Fallback
 *
 * ─── Mermaid Syntax (primary) ───────────────────────────────────────
 *   gantt
 *       title My Project
 *       dateFormat  YYYY-MM-DD
 *       axisFormat  %Y-%m-%d
 *       excludes    weekends          (informational, not enforced here)
 *
 *       section Planning
 *       Research        :a1, 2026-01-01, 15d
 *       Requirements    :a2, after a1, 10d
 *
 *       section Development
 *       UI Design       :active, b1, after a2, 20d
 *       Frontend        :done,  b2, after b1, 30d
 *
 * ─── Mermaid Task States ───────────────────────────────────────────
 *   :active   → task is in progress  (colored as-is)
 *   :done     → task completed       (colored as-is)
 *   :crit     → critical path        (colored as-is)
 *   (multiple states are comma-separated before the id)
 *
 * ─── Duration Units ────────────────────────────────────────────────
 *   Nd   → N days          Nw   → N weeks
 *   Nm   → N months (≈ 30d)  Nmo  → N months (≈ 30d, Mermaid style)
 *   Nq   → N quarters (≈ 90d) Nh   → N half-years (≈ 180d)
 *   Ny   → N years  (≈ 365d)
 *
 * ─── Legacy Syntax (fallback) ─────────────────────────────────────
 *   gantt: Title
 *   @date  YYYY-MM-DD
 *   [Section] Task Name | start ~ duration
 *   [Section] Task Name | after #id | duration
 *
 * ─── New Config Fields ─────────────────────────────────────────────
 *   timelineUnit  : day | month | quarter | halfyear | year
 *   fyStartMonth  : 1–12  (first month of financial year, 1 = Jan)
 *   dateFormat    : Mermaid date token string
 *   axisFormat    : Mermaid axis format string
 */

/* ────────────────────────────────────────────────────────────────────
 *  Public types
 * ──────────────────────────────────────────────────────────────────── */

export type TaskState = 'active' | 'done' | 'crit' | 'activeDone' | 'activeCrit' | 'doneCrit' | 'activeDoneCrit'

export interface GanttTask {
  id: number            // sequential numeric id assigned during parse
  name: string
  section?: string
  startDate: string     // YYYY-MM-DD
  endDate: string       // YYYY-MM-DD  (inclusive)
  durationDays: number
  color: string
  dependsOn?: number    // numeric id of prerequisite task
  states?: TaskState[]  // Mermaid task states (active, done, crit)
  mermaidId?: string    // original Mermaid task id (e.g. "a1")
}

export interface GanttTimelineConfig {
  /** Granularity hint for axis rendering */
  timelineUnit?: 'day' | 'month' | 'quarter' | 'halfyear' | 'year'
  /** Month (1–12) that the financial year starts on */
  fyStartMonth?: number
  /** Mermaid dateFormat token (e.g. "YYYY-MM-DD") */
  dateFormat?: string
  /** Mermaid axisFormat token (e.g. "%Y-%m-%d") */
  axisFormat?: string
}

export interface GanttParseResult {
  title: string
  projectDate: string          // earliest task start date
  tasks: GanttTask[]
  errors: { line: string; message: string; row: number }[]
  /** Optional timeline config extracted from Mermaid directives */
  timelineConfig?: GanttTimelineConfig
  /** Whether input was Mermaid syntax (true) or legacy (false) */
  isMermaid?: boolean
}

/* ────────────────────────────────────────────────────────────────────
 *  Constants & helpers
 * ──────────────────────────────────────────────────────────────────── */

const SECTION_COLORS: Record<string, string> = {
  Planning: '#4CAF50',
  Design: '#2196F3',
  Development: '#FF9800',
  Testing: '#9C27B0',
  Release: '#F44336',
}

const SECTION_PALETTE = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#795548', '#607D8B', '#E91E63', '#3F51B5',
  '#009688', '#FFC107', '#8BC34A', '#673AB7', '#CDDC39',
]

/** Deterministic colour from a section name */
function getSectionColor(section: string): string {
  if (SECTION_COLORS[section]) return SECTION_COLORS[section]
  let hash = 0
  for (let i = 0; i < section.length; i++) {
    hash = section.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % SECTION_PALETTE.length
  return SECTION_PALETTE[idx]
}

/** Parse duration string → days.  Supports Nd, Nw, Nm, Nmo, Nq, Nh, Ny. */
export function parseDuration(duration: string): number {
  const match = duration.trim().match(/^(\d+)\s*(d|w|m|mo|q|h|y)$/i)
  if (!match) return 0
  const value = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  switch (unit) {
    case 'd':  return value
    case 'w':  return value * 7
    case 'm':  return value * 30
    case 'mo': return value * 30
    case 'q':  return value * 90
    case 'h':  return value * 180
    case 'y':  return value * 365
    default:   return value
  }
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function today(): string {
  return formatDate(new Date())
}

/* ────────────────────────────────────────────────────────────────────
 *  Mermaid date parsing helpers
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Very small YYYY-MM-DD parser (no timezone shift).
 * Returns null if the string does not match.
 */
function parseMermaidDate(s: string): Date | null {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return new Date(+m[1], +m[2] - 1, +m[3])
}

/** Infer timelineUnit from axisFormat token */
function inferTimelineUnit(axisFmt: string | undefined): GanttTimelineConfig['timelineUnit'] {
  if (!axisFmt) return undefined
  if (/%(Y|y)/.test(axisFmt) && !/%[md]/.test(axisFmt)) return 'year'
  if (/%[Qq]/.test(axisFmt)) return 'quarter'
  if (/%[mM]/.test(axisFmt) && !/%[dD]/.test(axisFmt)) return 'month'
  if (/half|HY|fy/i.test(axisFmt)) return 'halfyear'
  return 'day'
}

/* ────────────────────────────────────────────────────────────────────
 *  Mermaid Gantt Parser  (primary)
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Parse a single Mermaid task line.
 *
 * Expected tokens after trimming leading whitespace:
 *   [:state1[,state2]] <name> :<id> , <start> , <duration>
 *
 * start can be:
 *   - absolute date  2026-01-01
 *   - "after <otherId>"
 */
function parseMermaidTaskLine(
  raw: string,
  section: string,
  nextId: number,
): { task: Omit<GanttTask, 'color'> | null; error: string | null } {

  const line = raw.replace(/\s+/g, ' ').trim()

  // Split at the FIRST colon that introduces the task spec
  // e.g. "UI Design :active, b1, after a2, 20d"
  const colonIdx = line.indexOf(':')
  if (colonIdx === -1) return { task: null, error: 'Missing ":" to define task spec' }

  const taskName = line.substring(0, colonIdx).trim()
  const spec = line.substring(colonIdx + 1).trim()

  // Spec parts split by comma (but ignore commas inside values)
  const parts = spec.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length < 2) {
    return { task: null, error: 'Task spec needs at least id, start, duration' }
  }

  // ── Identify states ──
  const validStates = new Set(['active', 'done', 'crit'])
  const states: TaskState[] = []
  let partsIdx = 0

  while (partsIdx < parts.length && validStates.has(parts[partsIdx])) {
    states.push(parts[partsIdx] as TaskState)
    partsIdx++
  }

  // ── Task id ──
  if (partsIdx >= parts.length) return { task: null, error: 'Missing task id' }
  const mermaidId = parts[partsIdx++]

  // ── Start ──
  if (partsIdx >= parts.length) return { task: null, error: 'Missing start value' }
  const startRaw = parts[partsIdx++]

  // ── Duration ──
  if (partsIdx >= parts.length) return { task: null, error: 'Missing duration value' }
  const durationRaw = parts[partsIdx++]

  const durationDays = parseDuration(durationRaw)
  if (durationDays === 0) {
    return { task: null, error: `Invalid duration "${durationRaw}". Use Nd, Nw, Nm, Nmo, Nq, Nh, or Ny.` }
  }

  return { task: { id: nextId, name: taskName, section, startDate: startRaw, durationDays, dependsOn: undefined, states, mermaidId } as Omit<GanttTask, 'color'>, error: null }
}

function parseMermaidInput(input: string): GanttParseResult {
  const lines = input.split('\n')
  const errors: { line: string; message: string; row: number }[] = []
  const tasks: GanttTask[] = []

  let title = 'Gantt Chart'
  let projectDate = today()
  let currentSection = ''
  let dateFormat = 'YYYY-MM-DD'
  let axisFormat: string | undefined
  let nextId = 1

  // ── First pass: parse directives & tasks (order-dependent for "after") ──
  // We collect raw task descriptors first, then resolve dates in a second pass.
  interface RawTask {
    row: number
    name: string
    section: string
    mermaidId: string
    startRaw: string
    durationRaw: string
    states: TaskState[]
  }

  const rawTasks: RawTask[] = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    // Skip empty lines and Mermaid comments (%%)
    if (!trimmed || trimmed.startsWith('%%')) continue

    // ── Block-level directives ──
    const titleMatch = trimmed.match(/^title\s+(.+)$/i)
    if (titleMatch) { title = titleMatch[1].trim(); continue }

    const dateFmtMatch = trimmed.match(/^dateFormat\s+(.+)$/i)
    if (dateFmtMatch) { dateFormat = dateFmtMatch[1].trim(); continue }

    const axisFmtMatch = trimmed.match(/^axisFormat\s+(.+)$/i)
    if (axisFmtMatch) { axisFormat = axisFmtMatch[1].trim(); continue }

    // Custom directives we support
    const fyMatch = trimmed.match(/^fyStartMonth\s+(\d{1,2})$/i)
    if (fyMatch) continue // handled in timelineConfig below

    const tlMatch = trimmed.match(/^timelineUnit\s+(day|month|quarter|halfyear|year)$/i)
    if (tlMatch) continue // handled in timelineConfig below

    // ── Section ──
    const sectionMatch = trimmed.match(/^section\s+(.+)$/i)
    if (sectionMatch) { currentSection = sectionMatch[1].trim(); continue }

    // ── Task line ──
    // A Mermaid task line contains a ':' somewhere after the name
    if (trimmed.includes(':')) {
      const parsed = parseMermaidTaskLine(trimmed, currentSection, nextId)
      if (parsed.error) {
        errors.push({ line: trimmed, message: parsed.error, row: i })
        continue
      }
      if (parsed.task) {
        nextId++
        rawTasks.push({
          row: i,
          name: parsed.task.name,
          section: parsed.task.section ?? '',
          mermaidId: parsed.task.mermaidId ?? '',
          startRaw: parsed.task.startDate, // may be "after xxx"
          durationRaw: trimmed.split(':').pop()?.trim() ?? '',
          states: (parsed.task as any).states ?? [],
        })
      }
    }
  }

  // ── Second pass: resolve "after" references & build GanttTask list ──
  const mermaidIdToTask = new Map<string, GanttTask>()

  // Re-parse each raw task to get final data
  for (const rt of rawTasks) {
    const durationDays = parseDuration(rt.durationRaw.split(',').pop()?.trim() ?? '')
    if (durationDays === 0) {
      errors.push({ line: rt.name, message: `Invalid duration "${rt.durationRaw}"`, row: rt.row })
      continue
    }

    let startDate = ''
    let dependsOn: number | undefined

    const afterMatch = rt.startRaw.match(/^after\s+(\S+)$/i)
    if (afterMatch) {
      const refMermaidId = afterMatch[1]
      const refTask = mermaidIdToTask.get(refMermaidId)
      if (!refTask) {
        errors.push({ line: rt.name, message: `Dependency "${refMermaidId}" not found (referenced before definition?)`, row: rt.row })
        continue
      }
      startDate = addDays(refTask.endDate, 1)
      dependsOn = refTask.id
    } else {
      // Absolute date
      startDate = rt.startRaw
      if (!parseMermaidDate(startDate)) {
        errors.push({ line: rt.name, message: `Invalid start date "${startDate}". Use YYYY-MM-DD or "after <id>"`, row: rt.row })
        continue
      }
    }

    const endDate = addDays(startDate, durationDays - 1)
    const color = rt.section ? getSectionColor(rt.section) : '#607D8B'

    const task: GanttTask = {
      id: rt.name ? tasks.length + 1 : tasks.length + 1,
      name: rt.name,
      section: rt.section || undefined,
      startDate,
      endDate,
      durationDays,
      color,
      dependsOn,
      states: rt.states.length > 0 ? rt.states : undefined,
      mermaidId: rt.mermaidId || undefined,
    }
    // Assign a stable numeric id based on position in tasks array
    task.id = tasks.length + 1

    tasks.push(task)
    if (rt.mermaidId) mermaidIdToTask.set(rt.mermaidId, task)
  }

  // ── Compute projectDate (earliest start) ──
  if (tasks.length > 0) {
    projectDate = tasks.reduce((min, t) => (t.startDate < min ? t.startDate : min), tasks[0].startDate)
  }

  // ── Build timeline config ──
  const timelineConfig: GanttTimelineConfig = {
    dateFormat,
    axisFormat,
  }

  // Try to infer timelineUnit from axisFormat
  const inferred = inferTimelineUnit(axisFormat)
  if (inferred) timelineConfig.timelineUnit = inferred

  // Check for explicit timelineUnit directive
  for (const raw of lines) {
    const trimmed = raw.trim()
    const tlMatch = trimmed.match(/^timelineUnit\s+(day|month|quarter|halfyear|year)$/i)
    if (tlMatch) {
      timelineConfig.timelineUnit = tlMatch[1].toLowerCase() as GanttTimelineConfig['timelineUnit']
    }
    const fyMatch = trimmed.match(/^fyStartMonth\s+(\d{1,2})$/i)
    if (fyMatch) {
      const val = parseInt(fyMatch[1], 10)
      if (val >= 1 && val <= 12) {
        timelineConfig.fyStartMonth = val
      } else {
        errors.push({ line: trimmed, message: `fyStartMonth must be 1–12, got ${val}`, row: lines.indexOf(raw) })
      }
    }
  }

  return {
    title,
    projectDate,
    tasks,
    errors,
    timelineConfig,
    isMermaid: true,
  }
}

/* ────────────────────────────────────────────────────────────────────
 *  Legacy Gantt Parser  (fallback)
 * ──────────────────────────────────────────────────────────────────── */

function parseLegacyInput(input: string): GanttParseResult {
  const lines = input.split('\n')
  const errors: { line: string; message: string; row: number }[] = []
  const tasks: GanttTask[] = []

  let title = 'Gantt Chart'
  let projectDate = today()
  let currentSection = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue

    // Parse title: gantt: Title
    const titleMatch = line.match(/^gantt:\s*(.+)$/i)
    if (titleMatch) {
      title = titleMatch[1].trim()
      continue
    }

    // Parse project date: @date YYYY-MM-DD
    const dateMatch = line.match(/^@date\s+(\d{4}-\d{2}-\d{2})$/i)
    if (dateMatch) {
      projectDate = dateMatch[1]
      continue
    }

    // Parse section: [Section Name] (standalone, no pipe)
    const sectionMatch = line.match(/^\[([^\]]+)\]\s*$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim()
      continue
    }

    // Parse task line: split by | to get parts
    // Format: [Section] Task Name | start ~ duration
    //    or:  [Section] Task Name | after #id | duration
    if (line.includes('|')) {
      const pipeParts = line.split('|').map(p => p.trim())

      // First part should be [Section] Task Name
      const headerMatch = pipeParts[0].match(/^\[([^\]]*)\]\s*(.+)$/)
      if (headerMatch) {
        const section = headerMatch[1].trim() || currentSection
        const taskName = headerMatch[2].trim()

        if (pipeParts.length === 2) {
          // Format: [Section] Name | start ~ duration
          const timingPart = pipeParts[1]
          const tildeParts = timingPart.split('~').map(p => p.trim())

          if (tildeParts.length !== 2) {
            errors.push({ line, message: 'Use format: start ~ duration (e.g., 2026-01-01 ~ 15d)', row: i })
            continue
          }

          const startPart = tildeParts[0]
          const durationPart = tildeParts[1]
          const durationDays = parseDuration(durationPart)

          if (durationDays === 0) {
            errors.push({ line, message: `Invalid duration: "${durationPart}". Use NNd, NNw, or NNm`, row: i })
            continue
          }

          const startDate = startPart
          const dateCheck = startDate.match(/^\d{4}-\d{2}-\d{2}$/)
          if (!dateCheck) {
            errors.push({ line, message: `Invalid start date: "${startDate}". Use YYYY-MM-DD`, row: i })
            continue
          }

          const endDate = addDays(startDate, durationDays - 1)
          const color = section ? getSectionColor(section) : '#607D8B'

          tasks.push({
            id: tasks.length + 1,
            name: taskName,
            section: section || undefined,
            startDate,
            endDate,
            durationDays,
            color,
          })
        } else if (pipeParts.length === 3) {
          // Format: [Section] Name | after #id | duration
          const startPart = pipeParts[1]
          const durationPart = pipeParts[2]
          const durationDays = parseDuration(durationPart)

          if (durationDays === 0) {
            errors.push({ line, message: `Invalid duration: "${durationPart}". Use NNd, NNw, or NNm`, row: i })
            continue
          }

          let startDate: string

          // Check if start is "after #N" (relative)
          let dependsOn: number | undefined
          const afterMatch = startPart.match(/^after\s+#(\d+)$/i)
          if (afterMatch) {
            const refId = parseInt(afterMatch[1], 10)
            const refTask = tasks.find(t => t.id === refId)
            if (!refTask) {
              errors.push({ line, message: `Task #${refId} not found for dependency`, row: i })
              continue
            }
            startDate = addDays(refTask.endDate, 1)
            dependsOn = refId
          } else {
            // Absolute date
            const dateCheck = startPart.match(/^\d{4}-\d{2}-\d{2}$/)
            if (!dateCheck) {
              errors.push({ line, message: `Invalid start date: "${startPart}". Use YYYY-MM-DD or after #N`, row: i })
              continue
            }
            startDate = startPart
          }

          const endDate = addDays(startDate, durationDays - 1)
          const color = section ? getSectionColor(section) : '#607D8B'

          tasks.push({
            id: tasks.length + 1,
            name: taskName,
            section: section || undefined,
            startDate,
            endDate,
            durationDays,
            color,
            dependsOn,
          })
        } else {
          errors.push({ line, message: 'Task needs start and duration separated by |', row: i })
        }
        continue
      }
    }

    // If we got here, it's an unrecognized line
    if (line && !line.startsWith('#')) {
      errors.push({ line, message: 'Unrecognized syntax. Use [Name] Task | start ~ duration', row: i })
    }
  }

  return { title, projectDate, tasks, errors, isMermaid: false }
}

/* ────────────────────────────────────────────────────────────────────
 *  Format detection
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Returns true if the input starts with a bare `gantt` keyword
 * (Mermaid style), false if it starts with `gantt:` (legacy style)
 * or neither.
 */
function detectMermaidSyntax(input: string): boolean {
  const firstMeaningfulLine = input
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('%%'))

  if (!firstMeaningfulLine) return false

  // Mermaid: bare "gantt" keyword (optionally followed by whitespace/newline)
  // Legacy:  "gantt:" with a title on the same line
  return /^gantt\s*$/i.test(firstMeaningfulLine)
}

/* ────────────────────────────────────────────────────────────────────
 *  Main entry point
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Parse Gantt chart input.
 * Detects Mermaid vs Legacy syntax automatically.
 *
 * - Mermaid: starts with a bare `gantt` line
 * - Legacy: starts with `gantt: Title`
 * - If ambiguous, tries Mermaid first; falls back to legacy if
 *   Mermaid produces 0 tasks and >0 errors.
 */
export function parseGanttInput(input: string): GanttParseResult {
  const trimmed = input.trim()

  if (detectMermaidSyntax(trimmed)) {
    return parseMermaidInput(trimmed)
  }

  // Ambiguous or legacy — try legacy first since it's the simpler format
  const legacyResult = parseLegacyInput(trimmed)

  // If legacy got nothing useful, try Mermaid as a last resort
  if (legacyResult.tasks.length === 0 && legacyResult.errors.length > 0) {
    const mermaidResult = parseMermaidInput(trimmed)
    if (mermaidResult.tasks.length > 0) {
      return mermaidResult
    }
  }

  return legacyResult
}

/* ────────────────────────────────────────────────────────────────────
 *  Additional exports for consumers
 * ──────────────────────────────────────────────────────────────────── */

/** Convenience: parse only Mermaid syntax (no fallback) */
export function parseMermaidGantt(input: string): GanttParseResult {
  return parseMermaidInput(input.trim())
}

/** Convenience: parse only legacy syntax (no fallback) */
export function parseLegacyGantt(input: string): GanttParseResult {
  return parseLegacyInput(input.trim())
}

/** Convenience: detect which syntax the input uses */
export function detectSyntax(input: string): 'mermaid' | 'legacy' | 'unknown' {
  return detectMermaidSyntax(input.trim()) ? 'mermaid' : 'legacy'
}
