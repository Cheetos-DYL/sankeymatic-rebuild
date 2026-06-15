import { describe, it, expect } from 'vitest'
import {
  parseGanttInput,
  parseMermaidGantt,
  parseLegacyGantt,
  detectSyntax,
  parseDuration,
} from '../engine/ganttParser'

/* ─────────────────────────────────────────────
 *  parseDuration — unit conversion
 * ───────────────────────────────────────────── */
describe('parseDuration', () => {
  it('parses days (d)', () => {
    expect(parseDuration('5d')).toBe(5)
    expect(parseDuration('0d')).toBe(0)
    expect(parseDuration('999d')).toBe(999)
  })

  it('parses weeks (w)', () => {
    expect(parseDuration('1w')).toBe(7)
    expect(parseDuration('2w')).toBe(14)
    expect(parseDuration('4w')).toBe(28)
  })

  it('parses months (m or mo)', () => {
    expect(parseDuration('1m')).toBe(30)
    expect(parseDuration('2m')).toBe(60)
    expect(parseDuration('1mo')).toBe(30)
    expect(parseDuration('6mo')).toBe(180)
  })

  it('parses quarters (q)', () => {
    expect(parseDuration('1q')).toBe(90)
    expect(parseDuration('4q')).toBe(360)
  })

  it('parses half-years (h)', () => {
    expect(parseDuration('1h')).toBe(180)
    expect(parseDuration('2h')).toBe(360)
  })

  it('parses years (y)', () => {
    expect(parseDuration('1y')).toBe(365)
    expect(parseDuration('2y')).toBe(730)
  })

  it('returns 0 for invalid formats', () => {
    expect(parseDuration('abc')).toBe(0)
    expect(parseDuration('')).toBe(0)
    expect(parseDuration('5')).toBe(0)
    expect(parseDuration('-3d')).toBe(0)
  })

  it('handles whitespace between number and unit', () => {
    expect(parseDuration('5  d')).toBe(5)
    expect(parseDuration('10 w')).toBe(70)
  })
})

/* ─────────────────────────────────────────────
 *  detectSyntax
 * ───────────────────────────────────────────── */
describe('detectSyntax', () => {
  it('detects Mermaid syntax when input starts with bare "gantt"', () => {
    expect(detectSyntax('gantt\ntitle Test')).toBe('mermaid')
    expect(detectSyntax('gantt')).toBe('mermaid')
    expect(detectSyntax('\n\n  gantt')).toBe('mermaid')
  })

  it('detects legacy syntax when input starts with "gantt:"', () => {
    expect(detectSyntax('gantt: My Project')).toBe('legacy')
  })

  it('falls back to legacy for unclear input', () => {
    expect(detectSyntax('some random text')).toBe('legacy')
  })
})

/* ─────────────────────────────────────────────
 *  Mermaid syntax — basic parsing
 * ───────────────────────────────────────────── */
describe('parseMermaidGantt — basic', () => {
  it('parses title and dateFormat directives', () => {
    const result = parseMermaidGantt(`gantt
    title My Project
    dateFormat  YYYY-MM-DD`)
    expect(result.title).toBe('My Project')
    expect(result.timelineConfig?.dateFormat).toBe('YYYY-MM-DD')
    expect(result.isMermaid).toBe(true)
  })

  it('parses a single task with absolute date', () => {
    const result = parseMermaidGantt(`gantt
    title Test
    dateFormat  YYYY-MM-DD
    section Planning
    Research :a1, 2026-01-01, 15d`)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].name).toBe('Research')
    expect(result.tasks[0].section).toBe('Planning')
    expect(result.tasks[0].startDate).toBe('2026-01-01')
    expect(result.tasks[0].endDate).toBe('2026-01-15')
    expect(result.tasks[0].durationDays).toBe(15)
    expect(result.tasks[0].color).toBeTruthy()
  })

  it('parses multiple tasks with dependencies', () => {
    const result = parseMermaidGantt(`gantt
    title Project
    dateFormat  YYYY-MM-DD
    section Dev
    Task A  :a1, 2026-01-01, 10d
    Task B  :b1, after a1, 5d`)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[0].name).toBe('Task A')
    expect(result.tasks[0].startDate).toBe('2026-01-01')
    expect(result.tasks[1].name).toBe('Task B')
    expect(result.tasks[1].dependsOn).toBe(result.tasks[0].id)
    // Task B starts the day after Task A ends (2026-01-10 + 1 = 2026-01-11)
    expect(result.tasks[1].startDate).toBe('2026-01-11')
  })

  it('computes projectDate as the earliest start date', () => {
    const result = parseMermaidGantt(`gantt
    title Project
    dateFormat  YYYY-MM-DD
    section A
    Task 1  :a1, 2026-03-01, 5d
    Task 2  :a2, 2026-01-15, 10d`)
    expect(result.projectDate).toBe('2026-01-15')
  })
})

/* ─────────────────────────────────────────────
 *  Mermaid syntax — tasks with states
 * ───────────────────────────────────────────── */
describe('parseMermaidGantt — task states', () => {
  it('parses active state', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Active Task :active, a1, 2026-01-01, 10d`)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks[0].states).toContain('active')
  })

  it('parses done state', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Done Task :done, a1, 2026-01-01, 10d`)
    expect(result.tasks[0].states).toContain('done')
  })

  it('parses crit state', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Crit Task :crit, a1, 2026-01-01, 10d`)
    expect(result.tasks[0].states).toContain('crit')
  })

  it('parses multiple states (active + done)', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Complex :active, done, a1, 2026-01-01, 10d`)
    expect(result.tasks[0].states).toContain('active')
    expect(result.tasks[0].states).toContain('done')
  })
})

/* ─────────────────────────────────────────────
 *  Mermaid syntax — progress percentage
 * ───────────────────────────────────────────── */
describe('parseMermaidGantt — progress', () => {
  it('parses progress percentage', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Task :a1, 2026-01-01, 10d, 60%`)
    expect(result.tasks[0].progress).toBe(60)
  })

  it('clamps progress to 0–100', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Task :a1, 2026-01-01, 10d, 150%`)
    expect(result.tasks[0].progress).toBe(100)
  })

  it('parses progress with active state', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Task :active, a1, 2026-01-01, 10d, 30%`)
    expect(result.tasks[0].states).toContain('active')
    expect(result.tasks[0].progress).toBe(30)
  })
})

/* ─────────────────────────────────────────────
 *  Mermaid syntax — milestones
 * ───────────────────────────────────────────── */
describe('parseMermaidGantt — milestones', () => {
  it('parses milestone with absolute date', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Planning
    Task :a1, 2026-01-01, 10d
    milestone Launch :2026-01-15`)
    const ms = result.tasks.find(t => t.isMilestone)
    expect(ms).toBeDefined()
    expect(ms!.name).toBe('Launch')
    expect(ms!.durationDays).toBe(0)
    expect(ms!.startDate).toBe('2026-01-15')
    expect(ms!.endDate).toBe('2026-01-15')
  })

  it('parses milestone with dependency', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Task :a1, 2026-01-01, 10d
    milestone Review :after a1`)
    const ms = result.tasks.find(t => t.isMilestone)
    expect(ms).toBeDefined()
    expect(ms!.dependsOn).toBe(result.tasks[0].id)
    expect(ms!.startDate).toBe('2026-01-11')
  })
})

/* ─────────────────────────────────────────────
 *  Mermaid syntax — error handling
 * ───────────────────────────────────────────── */
describe('parseMermaidGantt — errors', () => {
  it('lines without a colon are silently skipped (no error)', () => {
    const result = parseMermaidGantt(`gantt
    title Test
    dateFormat  YYYY-MM-DD
    section Dev
    No Colon Here
    Also no colon`)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks).toHaveLength(0)
  })

  it('returns error for invalid duration', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Bad Task :a1, 2026-01-01, xyz`)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns error for invalid start date', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Bad Task :a1, not-a-date, 10d`)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns error for missing task id', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    No ID :2026-01-01, 10d`)  // first part after colon is parsed as state, then date → no id
    // After states: "2026-01-01" is not a valid state → it's the id
    // Then "10d" is start, which is not a valid date → error
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns error for unfound dependency reference', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Task :a1, after nonexistent, 10d`)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns error for milestone with missing spec', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    milestone Nameless`)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('handles empty input gracefully', () => {
    const result = parseMermaidGantt('')
    expect(result.tasks).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
    expect(result.title).toBe('Gantt Chart')
  })
})

/* ─────────────────────────────────────────────
 *  Mermaid syntax — comments (%%)
 * ───────────────────────────────────────────── */
describe('parseMermaidGantt — comments', () => {
  it('ignores %% comments', () => {
    const result = parseMermaidGantt(`gantt
    %% This is a comment
    dateFormat  YYYY-MM-DD
    section Dev
    %% Another comment
    Task :a1, 2026-01-01, 5d`)
    expect(result.tasks).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })
})

/* ─────────────────────────────────────────────
 *  Mermaid syntax — multi-section
 * ───────────────────────────────────────────── */
describe('parseMermaidGantt — multiple sections', () => {
  it('assigns tasks to their respective sections', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Planning
    Research :a1, 2026-01-01, 15d
    section Development
    Coding  :b1, after a1, 30d
    section Testing
    QA      :c1, after b1, 10d`)
    expect(result.tasks).toHaveLength(3)
    expect(result.tasks[0].section).toBe('Planning')
    expect(result.tasks[1].section).toBe('Development')
    expect(result.tasks[2].section).toBe('Testing')
  })
})

/* ─────────────────────────────────────────────
 *  Mermaid syntax — timeline directives
 * ───────────────────────────────────────────── */
describe('parseMermaidGantt — timeline directives', () => {
  it('extracts timelineUnit directive', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    timelineUnit quarter
    section Dev
    Task :a1, 2026-01-01, 10d`)
    expect(result.timelineConfig?.timelineUnit).toBe('quarter')
  })

  it('extracts fyStartMonth directive', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    fyStartMonth 1
    section Dev
    Task :a1, 2026-01-01, 10d`)
    expect(result.timelineConfig?.fyStartMonth).toBe(1)
  })

  it('infers timelineUnit from axisFormat', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    axisFormat  %Y
    section Dev
    Task :a1, 2026-01-01, 10d`)
    expect(result.timelineConfig?.timelineUnit).toBe('year')
  })
})

/* ─────────────────────────────────────────────
 *  Legacy syntax
 * ───────────────────────────────────────────── */
describe('parseLegacyGantt', () => {
  it('parses legacy format with title and ~ duration', () => {
    const result = parseLegacyGantt(`gantt: My Legacy Project
@date 2026-01-01
[Planning] Research | 2026-01-01 ~ 15d
[Planning] Requirements | after #1 | 10d`)
    expect(result.title).toBe('My Legacy Project')
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[0].name).toBe('Research')
    expect(result.tasks[0].section).toBe('Planning')
    expect(result.tasks[0].durationDays).toBe(15)
  })

  it('parses legacy dependency references', () => {
    const result = parseLegacyGantt(`gantt: Legacy
@date 2026-01-01
[Dev] Task A | 2026-01-01 ~ 10d
[Dev] Task B | after #1 | 5d`)
    expect(result.tasks).toHaveLength(2)
    expect(result.tasks[1].dependsOn).toBe(1)
  })

  it('reports error for unfound dependency in legacy mode', () => {
    const result = parseLegacyGantt(`gantt: Legacy
@date 2026-01-01
[Dev] Task | after #99 | 5d`)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('reports error for invalid duration in legacy mode', () => {
    const result = parseLegacyGantt(`gantt: Legacy
@date 2026-01-01
[Dev] Task | 2026-01-01 ~ abc`)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

/* ─────────────────────────────────────────────
 *  Auto-detection with fallback
 * ───────────────────────────────────────────── */
describe('parseGanttInput — auto-detect', () => {
  it('parses Mermaid syntax when detected', () => {
    const result = parseGanttInput(`gantt
    title Auto Detect
    dateFormat  YYYY-MM-DD
    section Dev
    Task :a1, 2026-01-01, 10d`)
    expect(result.isMermaid).toBe(true)
    expect(result.tasks).toHaveLength(1)
  })

  it('parses legacy syntax when detected', () => {
    const result = parseGanttInput(`gantt: Auto Legacy
@date 2026-01-01
[Dev] Task | 2026-01-01 ~ 10d`)
    expect(result.isMermaid).toBe(false)
    expect(result.tasks).toHaveLength(1)
  })

  it('provides a default title for untitled charts', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Task :a1, 2026-01-01, 5d`)
    expect(result.title).toBe('Gantt Chart')
  })
})

/* ─────────────────────────────────────────────
 *  Edge cases
 * ───────────────────────────────────────────── */
describe('edge cases', () => {
  it('handles whitespace-heavy input', () => {
    const result = parseGanttInput(`

    gantt

    title    Spaced Out

    dateFormat  YYYY-MM-DD

    section  Dev

    Task   :  a1  ,  2026-01-01  ,  15d

`)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].name).toBe('Task')
    expect(result.tasks[0].durationDays).toBe(15)
  })

  it('produces unique task IDs', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section A
    T1 :a1, 2026-01-01, 5d
    T2 :a2, after a1, 3d
    T3 :a3, after a2, 2d`)
    const ids = result.tasks.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('handles 0-day task (edge case)', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Zero :a1, 2026-01-01, 0d`)
    expect(result.errors.length).toBeGreaterThan(0) // 0 duration is invalid
  })

  it('handles very large duration', () => {
    const result = parseMermaidGantt(`gantt
    dateFormat  YYYY-MM-DD
    section Dev
    Long :a1, 2026-01-01, 1000d`)
    expect(result.tasks[0].durationDays).toBe(1000)
  })
})
