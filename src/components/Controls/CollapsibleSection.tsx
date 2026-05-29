import { useState, ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="control-section">
      <button
        className="control-section__header"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="control-section__indicator">{open ? '−' : '+'}</span>
        <span className="control-section__title">{title}</span>
        <span className="control-section__hint">{open ? ':' : '...'}</span>
      </button>
      {open && <div className="control-section__body">{children}</div>}
    </div>
  )
}
