/**
 * Gantt Chart DSL Parser
 * 
 * Syntax:
 *   gantt: Project Title
 *   @date YYYY-MM-DD
 *   
 *   [Section] Task Name | start ~ duration
 *   [Section] Task Name | after #id | duration
 * 
 * Start options:
 *   - Absolute: YYYY-MM-DD
 *   - Relative: after #<previous_task_id>
 * 
 * Duration format:
 *   - NNd (days)
 *   - NNw (weeks) 
 *   - NNm (months)
 */

export interface GanttTask {
  id: number
  name: string
  section?: string
  startDate: string
  endDate: string
  durationDays: number
  color: string
}

export interface GanttParseResult {
  title: string
  projectDate: string
  tasks: GanttTask[]
  errors: { line: string; message: string; row: number }[]
}

const SECTION_COLORS: Record<string, string> = {
  Planning: '#4CAF50',
  Design: '#2196F3',
  Development: '#FF9800',
  Testing: '#9C27B0',
  Release: '#F44336',
}

function getSectionColor(section: string): string {
  if (SECTION_COLORS[section]) return SECTION_COLORS[section]
  let hash = 0
  for (let i = 0; i < section.length; i++) {
    hash = section.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 60%, 50%)`
}

function parseDuration(duration: string): number {
  const match = duration.trim().match(/^(\d+)([dwm])$/i)
  if (!match) return 0
  const value = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  switch (unit) {
    case 'd': return value
    case 'w': return value * 7
    case 'm': return value * 30
    default: return value
  }
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseGanttInput(input: string): GanttParseResult {
  const lines = input.split('\n')
  const errors: { line: string; message: string; row: number }[] = []
  const tasks: GanttTask[] = []
  
  let title = 'Gantt Chart'
  let projectDate = formatDate(new Date())
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
          const afterMatch = startPart.match(/^after\s+#(\d+)$/i)
          if (afterMatch) {
            const refId = parseInt(afterMatch[1], 10)
            const refTask = tasks.find(t => t.id === refId)
            if (!refTask) {
              errors.push({ line, message: `Task #${refId} not found for dependency`, row: i })
              continue
            }
            startDate = addDays(refTask.endDate, 1)
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

  return { title, projectDate, tasks, errors }
}
