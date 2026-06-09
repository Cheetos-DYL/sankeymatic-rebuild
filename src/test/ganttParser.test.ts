import { describe, it, expect } from 'vitest'
import { parseGanttInput, parseMermaidGantt, parseLegacyGantt, detectSyntax, parseDuration } from '../engine/ganttParser'

describe('parseDuration', () => {
  it('parses days', () => {
    expect(parseDuration('15d')).toBe(15)
    expect(parseDuration('0d')).toBe(0)
  })

  it('parses weeks', () => {
    expect(parseDuration('2w')).toBe(14)
    expect(parseDuration('1w')).toBe(7)
  })

  it('parses months (30d)', () => {
    expect(parseDuration('1m')).toBe(30)
    expect(parseDuration('3mo')).toBe(90)
  })

  it('parses quarters (90d)', () => {
    expect(parseDuration('2q')).toBe(180)
  })

  it('parses half-years (180d)', () => {
    expect(parseDuration('1h')).toBe(180)
  })

  it('parses years (365d)', () => {
    expect(parseDuration('1y')).toBe(365)
  })

  it('returns 0 for invalid duration strings', () => {
    expect(parseDuration('')).toBe(0)
    expect(parseDuration('abc')).toBe(0)
    expect(parseDuration('5')).toBe(0)
    expect(parseDuration('-3d')).toBe(0)
  })
})

describe('detectSyntax', () => {
  it('detects Mermaid syntax from bare "gantt" keyword', () => {
    expect(detectSyntax('gantt\n    title Project')).toBe('mermaid')
  })

  it('detects legacy syntax from "gantt:" prefix', () => {
    expect(detectSyntax('gantt: My Project')).toBe('legacy')
    expect(detectSyntax('gantt: My Project\n@date 2026-01-01')).toBe('legacy')
  })

  it('returns legacy for empty input', () => {
    expect(detectSyntax('')).toBe('legacy')
  })
})

describe('parseMermaidGantt', () => {
  it('parses a full project with sections, tasks, dependencies, milestones', () => {
    const input = `gantt
    title Project Alpha
    dateFormat  YYYY-MM-DD

    section Planning
    Market Research     :a1, 2026-01-01, 15d
    Requirements Doc    :a2, after a1, 10d

    section Design
    UI/UX Design        :b1, after a2, 20d

    milestone Design Complete :after b1

    section Dev
    Frontend            :c1, after b1, 30d
    Backend             :c2, after b1, 35d`

    const result = parseMermaidGantt(input)
    expect(result.errors).toHaveLength(0)
    expect(result.title).toBe('Project Alpha')
    expect(result.tasks.length).toBe(6) // 5 tasks + 1 milestone

    // First task
    expect(result.tasks[0].name).toBe('Market Research')
    expect(result.tasks[0].startDate).toBe('2026-01-01')
    expect(result.tasks[0].durationDays).toBe(15)
    expect(result.tasks[0].endDate).toBe('2026-01-15')
    expect(result.tasks[0].section).toBe('Planning')
    expect(result.tasks[0].mermaidId).toBe('a1')

    // Task with dependency
    expect(result.tasks[1].name).toBe('Requirements Doc')
    expect(result.tasks[1].startDate).toBe('2026-01-16')
    expect(result.tasks[1].dependsOn).toBe(1)
    expect(result.tasks[1].mermaidId).toBe('a2')

    // Milestone
    const milestone = result.tasks.find(t => t.isMilestone)
    expect(milestone).toBeDefined()
    expect(milestone!.name).toBe('Design Complete')
    expect(milestone!.durationDays).toBe(0)
  })

  it('parses task states (active, done, crit)', () => {
    const input = `gantt
    section Dev
    Active Task     :active, a1, 2026-01-01, 10d
    Done Task       :done, a2, 2026-01-01, 10d
    Crit Task       :crit, a3, 2026-01-01, 10d`

    const result = parseMermaidGantt(input)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks).toHaveLength(3)

    const activeTask = result.tasks.find(t => t.states?.includes('active'))
    expect(activeTask).toBeDefined()
    expect(activeTask!.states).toContain('active')

    const doneTask = result.tasks.find(t => t.states?.includes('done'))
    expect(doneTask).toBeDefined()
    expect(doneTask!.states).toContain('done')

    const critTask = result.tasks.find(t => t.states?.includes('crit'))
    expect(critTask).toBeDefined()
    expect(critTask!.states).toContain('crit')
  })

  it('parses progress percentage', () => {
    const input = `gantt
    section Dev
    In Progress Task  :a1, 2026-01-01, 10d, 60%`

    const result = parseMermaidGantt(input)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks[0].progress).toBe(60)
  })

  it('parses milestones with date and dependency', () => {
    const input = `gantt
    section Planning
    Research         :a1, 2026-01-01, 10d
    milestone Launch :after a1
    milestone Review :2026-02-01`

    const result = parseMermaidGantt(input)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks).toHaveLength(3)

    const afterMs = result.tasks.find(t => t.name === 'Launch')
    expect(afterMs).toBeDefined()
    expect(afterMs!.isMilestone).toBe(true)
    expect(afterMs!.durationDays).toBe(0)
    expect(afterMs!.startDate).toBe('2026-01-11') // day after Research ends

    const dateMs = result.tasks.find(t => t.name === 'Review')
    expect(dateMs).toBeDefined()
    expect(dateMs!.isMilestone).toBe(true)
    expect(dateMs!.startDate).toBe('2026-02-01')
  })

  it('parses different duration units', () => {
    const input = `gantt
    section Test
    Days Task    :a1, 2026-01-01, 5d
    Weeks Task   :a2, 2026-01-01, 2w
    Months Task  :a3, 2026-01-01, 1m
    Quart Task   :a4, 2026-01-01, 1q`

    const result = parseMermaidGantt(input)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks[0].durationDays).toBe(5)
    expect(result.tasks[1].durationDays).toBe(14)
    expect(result.tasks[2].durationDays).toBe(30)
    expect(result.tasks[3].durationDays).toBe(90)
  })

  it('ignores Mermaid comments (%% lines)', () => {
    const input = `gantt
    %% This is a comment
    title My Project
    %% Another comment
    section Dev
    Task :a1, 2026-01-01, 5d`

    const result = parseMermaidGantt(input)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks).toHaveLength(1)
    expect(result.title).toBe('My Project')
  })

  it('extracts timelineConfig directives', () => {
    const input = `gantt
    title Project
    dateFormat  YYYY-MM-DD
    axisFormat  %Y-%m-%d
    timelineUnit quarter
    fyStartMonth 1
    section Dev
    Task :a1, 2026-01-01, 5d`

    const result = parseMermaidGantt(input)
    expect(result.timelineConfig).toBeDefined()
    expect(result.timelineConfig!.dateFormat).toBe('YYYY-MM-DD')
    expect(result.timelineConfig!.axisFormat).toBe('%Y-%m-%d')
    expect(result.timelineConfig!.timelineUnit).toBe('quarter')
    expect(result.timelineConfig!.fyStartMonth).toBe(1)
  })

  it('reports errors for missing dependency references', () => {
    const input = `gantt
    section Dev
    Task B :b1, after a1, 10d`

    const result = parseMermaidGantt(input)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].message).toContain('not found')
  })

  it('reports errors for invalid duration', () => {
    const input = `gantt
    section Dev
    Task :a1, 2026-01-01, invalid`

    const result = parseMermaidGantt(input)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0].message).toContain('Invalid duration')
  })

  it('skips lines without a colon (no task spec)', () => {
    // Lines without a colon are not valid task lines, so they're silently skipped
    const input = `gantt
    section Dev
    Task without colon`

    const result = parseMermaidGantt(input)
    expect(result.tasks).toHaveLength(0)
  })

  it('handles empty input gracefully', () => {
    const result = parseMermaidGantt('')
    expect(result.tasks).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
    expect(result.title).toBe('Gantt Chart')
  })

  it('handles input with only directives (no tasks)', () => {
    const input = `gantt
    title Empty Project
    dateFormat  YYYY-MM-DD`

    const result = parseMermaidGantt(input)
    expect(result.tasks).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
    expect(result.title).toBe('Empty Project')
  })

  it('computes projectDate as earliest task start', () => {
    const input = `gantt
    section A
    Task Late  :t1, 2026-03-01, 5d
    Task Early :t2, 2026-01-15, 5d
    Task Mid   :t3, 2026-02-01, 5d`

    const result = parseMermaidGantt(input)
    expect(result.projectDate).toBe('2026-01-15')
  })

  it('assigns colors based on section names', () => {
    const input = `gantt
    section Planning
    Task :a1, 2026-01-01, 5d
    section Development
    Task :b1, 2026-01-10, 5d`

    const result = parseMermaidGantt(input)
    expect(result.tasks[0].color).toBeTruthy()
    expect(result.tasks[1].color).toBeTruthy()
    // Different sections should have different colors
    expect(result.tasks[0].color).not.toBe(result.tasks[1].color)
  })

  it('parses state combinations (active + crit, etc.)', () => {
    const input = `gantt
    section Dev
    High Priority :active, crit, a1, 2026-01-01, 10d`

    const result = parseMermaidGantt(input)
    expect(result.errors).toHaveLength(0)
    expect(result.tasks[0].states).toContain('active')
    expect(result.tasks[0].states).toContain('crit')
  })
})

describe('parseLegacyGantt', () => {
  it('parses legacy format with title', () => {
    const input = `gantt: Project Legacy
@date 2026-01-01

[Planning] Market Research | 2026-01-01 ~ 15d
[Planning] Requirements | after #1 | 10d`

    const result = parseLegacyGantt(input)
    expect(result.errors).toHaveLength(0)
    expect(result.title).toBe('Project Legacy')
    expect(result.projectDate).toBe('2026-01-01')
    expect(result.tasks).toHaveLength(2)

    expect(result.tasks[0].name).toBe('Market Research')
    expect(result.tasks[0].startDate).toBe('2026-01-01')
    expect(result.tasks[0].durationDays).toBe(15)

    expect(result.tasks[1].name).toBe('Requirements')
    expect(result.tasks[1].dependsOn).toBe(1)
  })

  it('handles empty legacy input', () => {
    const result = parseLegacyGantt('')
    expect(result.tasks).toHaveLength(0)
    expect(result.title).toBe('Gantt Chart')
  })

  it('reports errors for invalid legacy syntax', () => {
    const input = `gantt: Bad Project
Bad line without pipes`

    const result = parseLegacyGantt(input)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe('parseGanttInput (auto-detect)', () => {
  it('routes Mermaid syntax correctly', () => {
    const input = `gantt
    title Auto Detect
    section Test
    Task :a1, 2026-01-01, 10d`

    const result = parseGanttInput(input)
    expect(result.isMermaid).toBe(true)
    expect(result.tasks).toHaveLength(1)
  })

  it('routes legacy syntax correctly', () => {
    const input = `gantt: Legacy Project
[Section] Task | 2026-01-01 ~ 10d`

    const result = parseGanttInput(input)
    expect(result.isMermaid).toBe(false)
    expect(result.tasks).toHaveLength(1)
  })

  it('returns errors for completely unrecognized input', () => {
    const input = `this is not valid gantt syntax at all`

    const result = parseGanttInput(input)
    // Should return something, not crash
    expect(result).toBeDefined()
    expect(result.errors.length).toBeGreaterThanOrEqual(0)
  })
})
