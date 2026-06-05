import './GanttInputPanel.css'

interface GanttInputPanelProps {
  value: string
  onChange: (value: string) => void
  errors: { line: string; message: string; row: number }[]
}

const SAMPLE_GANTT = `gantt: Project Timeline
@date 2026-01-01

# Phases
[Planning] Market Research | 2026-01-01 ~ 15d
[Planning] Requirements Doc | after #1 | 10d
[Design] UI/UX Design | after #2 | 20d
[Design] Architecture | after #2 | 15d
[Development] Frontend | after #3 | 30d
[Development] Backend | after #3 | 35d
[Testing] QA Testing | after #5 | 10d
[Release] Deployment | after #7 | 5d`

export function GanttInputPanel({ value, onChange, errors }: GanttInputPanelProps) {
  return (
    <div className="input-panel">
      <div className="input-panel__header">
        <h2 className="input-panel__title">Gantt Chart Input</h2>
        <span className="input-panel__hint">[Name] Start ~ Duration</span>
      </div>

      <div className="sample-buttons">
        <button
          type="button"
          className="sample-buttons__pill"
          onClick={() => onChange(SAMPLE_GANTT)}
        >
          Project Template
        </button>
      </div>

      <div className="input-panel__input-wrapper">
        <textarea
          className="input-panel__textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`gantt: Project Timeline
@date 2026-01-01

[Planning] Research | 2026-01-01 ~ 15d
[Planning] Docs | after #1 | 10d
[Design] UI | after #2 | 20d`}
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
