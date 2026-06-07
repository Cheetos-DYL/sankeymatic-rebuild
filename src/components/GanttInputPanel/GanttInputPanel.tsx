import { useState, useRef, useCallback } from 'react'
import './GanttInputPanel.css'

interface GanttInputPanelProps {
  value: string
  onChange: (value: string) => void
  errors: { line: string; message: string; row: number }[]
}

const SAMPLE_GANTT = `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    
    section Planning
    Market Research     :a1, 2026-01-01, 15d
    Requirements Doc    :a2, after a1, 10d
    
    section Design
    UI/UX Design        :b1, after a2, 20d
    Architecture        :b2, after a2, 15d
    
    milestone Design Complete :after b1
    
    section Development
    Frontend            :c1, after b1, 30d
    Backend             :c2, after b1, 35d
    
    milestone MVP Release :after c1
    
    section Testing
    QA Testing          :d1, after c1, 10d
    Deployment          :d2, after d1, 5d
    
    milestone Production Launch :after d2`

const TAB_SNIPPET = `    section 
    Task Name           :id, after prev-id, 10d`

const SNIPPETS: Record<string, string> = {
  task: TAB_SNIPPET,
  'section': `    section Section Name`,
  date: `    dateFormat  YYYY-MM-DD`,
  active: `    Task Name           :active, id, after prev-id, 10d`,
  done: `    Task Name           :done, id, after prev-id, 10d`,
  crit: `    Task Name           :crit, id, after prev-id, 10d`,
  progress: `    Task Name           :id, after prev-id, 10d, 50%`,
  milestone: `    milestone Milestone Name :after prev-id`,
}

export function GanttInputPanel({ value, onChange, errors }: GanttInputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = value.slice(0, start)
    const after = value.slice(end)
    const newValue = before + text + after
    onChange(newValue)
    // Restore cursor position after the inserted text
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + text.length
    })
  }, [value, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      insertAtCursor(SNIPPETS.task)
    }
  }, [insertAtCursor])

  return (
    <div className="input-panel">
      <div className="input-panel__header">
        <h2 className="input-panel__title">Gantt Chart Input</h2>
        <span className="input-panel__hint">Mermaid syntax</span>
      </div>

      <div className="sample-buttons">
        <button
          type="button"
          className="sample-buttons__pill"
          onClick={() => onChange(SAMPLE_GANTT)}
        >
          📋 Project Template
        </button>
        <button
          type="button"
          className="sample-buttons__pill"
          onClick={() => onChange('')}
        >
          🗑️ Clear
        </button>
        <button
          type="button"
          className={`sample-buttons__pill ${guideOpen ? 'sample-buttons__pill--active' : ''}`}
          onClick={() => setGuideOpen(prev => !prev)}
        >
          📝 Syntax Guide
        </button>
      </div>

      {guideOpen && (
        <div className="syntax-guide">
          <div className="syntax-guide__section">
            <h4 className="syntax-guide__heading">Basic Structure</h4>
            <pre className="syntax-guide__code">{'gantt\n    title My Project\n    dateFormat  YYYY-MM-DD\n\n    section Section Name\n    Task Name  :id, start-date, duration'}</pre>
          </div>

          <div className="syntax-guide__section">
            <h4 className="syntax-guide__heading">Duration Formats</h4>
            <pre className="syntax-guide__code">{'10d    → 10 days\n2w     → 2 weeks\n1m     → 1 month\n2y     → 2 years'}</pre>
          </div>

          <div className="syntax-guide__section">
            <h4 className="syntax-guide__heading">Task States</h4>
            <pre className="syntax-guide__code">{`:active  → currently running\n:done    → completed task\n:crit    → critical path task`}</pre>
          </div>

          <div className="syntax-guide__section">
            <h4 className="syntax-guide__heading">Dependencies</h4>
            <pre className="syntax-guide__code">{'Task A  :a1, 2026-01-01, 10d\nTask B  :b1, after a1, 5d   ← starts after Task A\nTask C  :c1, 2026-01-01, 3d   ← parallel with A'}</pre>
          </div>

          <div className="syntax-guide__section">
            <h4 className="syntax-guide__heading">Date Formats</h4>
            <pre className="syntax-guide__code">{'dateFormat  YYYY-MM-DD\n2026-01-01\n2026-01-01, 15d'}</pre>
          </div>

          <div className="syntax-guide__section">
            <h4 className="syntax-guide__heading">Progress</h4>
            <pre className="syntax-guide__code">{'Task A  :a1, 2026-01-01, 15d, 60%   ← 60% complete\nTask B  :active, b1, after a1, 10d, 30%'}</pre>
          </div>

          <div className="syntax-guide__section">
            <h4 className="syntax-guide__heading">Milestones</h4>
            <pre className="syntax-guide__code">{'milestone MVP Release     :after b1\nmilestone Launch Date     :2026-06-01'}</pre>
            <p style={{margin: '4px 0 0', fontSize: '12px', color: '#888'}}>
              Milestones render as diamond ◆ markers (zero-duration)
            </p>
          </div>

          <div className="syntax-guide__footer">
            <span>Press <kbd>Tab</kbd> to insert a task snippet</span>
          </div>
        </div>
      )}

      <div className="input-panel__input-wrapper">
        <textarea
          ref={textareaRef}
          className="input-panel__textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD

    section Planning
    Market Research  :a1, 2026-01-01, 15d
    Requirements     :a2, after a1, 10d

    section Development
    Frontend         :c1, after a2, 30d`}
          rows={12}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>

      {errors.length > 0 && (
        <div className="input-panel__errors">
          {errors.map((err, i) => (
            <div key={i} className="input-panel__error">
              Line {err.row + 1}: {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
