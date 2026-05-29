import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import './InputPanel.css'

interface ParseError {
  line: string
  message: string
  row: number
}

interface SampleRecipe {
  name: string
  flows: string
}

interface InputPanelProps {
  value: string
  onChange: (value: string) => void
  errors: ParseError[]
  samples?: SampleRecipe[]
  knownNodeNames?: string[]
}

// Extract all unique node names from the input text
function extractNodeNames(text: string): string[] {
  const names = new Set<string>()
  const lines = text.split('\n')
  for (const line of lines) {
    // Match flow lines: Source [amount] Target
    const flowMatch = line.match(/^(.+?)\s*\[.*?\](.+)$/)
    if (flowMatch) {
      const source = flowMatch[1].trim()
      const target = flowMatch[2].trim()
      // Remove any color/hash suffix from target
      const cleanTarget = target.replace(/#\S+$/, '').trim()
      if (source && source !== ':') names.add(source)
      if (cleanTarget && cleanTarget !== ':') names.add(cleanTarget)
    }
    // Match node color declaration: :NodeName #color
    const nodeMatch = line.match(/^:(\S[^#]*?)(?:\s*#|$)/)
    if (nodeMatch) {
      const nodeName = nodeMatch[1].trim()
      if (nodeName) names.add(nodeName)
    }
  }
  return Array.from(names).sort()
}

// Get the word being typed at cursor position
function getWordAtCursor(text: string, cursorPos: number): { word: string; start: number; end: number } {
  const before = text.slice(0, cursorPos)
  const after = text.slice(cursorPos)

  // Find the start of the current word
  const wordStart = Math.max(
    before.lastIndexOf(' ') + 1,
    before.lastIndexOf('\n') + 1,
    0
  )

  // Find the end of the current word
  const afterTrim = after.match(/^(\S*)/)
  const wordEnd = cursorPos + (afterTrim ? afterTrim[1].length : 0)

  return {
    word: text.slice(wordStart, wordEnd),
    start: wordStart,
    end: wordEnd,
  }
}

// Check if we're in a "node name" position (before or after the amount bracket)
function isInNodeNamePosition(text: string, cursorPos: number): boolean {
  const beforeCursor = text.slice(0, cursorPos)
  const lineStart = beforeCursor.lastIndexOf('\n') + 1
  const currentLine = beforeCursor.slice(lineStart)

  // Check if cursor is on a flow line (contains [amount])
  const hasBracket = currentLine.includes('[')

  // If we haven't typed [ yet, we're in the source position
  // If we've typed ] and haven't hit a newline, we might be in the target position
  const bracketOpen = currentLine.indexOf('[')
  const bracketClose = currentLine.indexOf(']')

  const cursorCol = currentLine.length

  if (bracketOpen === -1) {
    // Before the amount bracket → source node position
    return cursorCol > 0 // has some text typed
  }

  if (bracketClose !== -1 && cursorCol > bracketClose + 1) {
    // After the closing bracket → target node position
    return true
  }

  return false
}

export function InputPanel({ value, onChange, errors, samples, knownNodeNames = [] }: InputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localValue, setLocalValue] = useState(value)
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>()
  const [cursorPos, setCursorPos] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Known node names from parsed results + local text extraction
  const knownNames = useMemo(() => {
    const fromProp = knownNodeNames || []
    const fromText = extractNodeNames(localValue)
    const combined = new Set([...fromProp, ...fromText])
    return Array.from(combined).sort()
  }, [knownNodeNames, localValue])

  // Get current word at cursor for filtering
  const currentWord = useMemo(() => {
    if (!showSuggestions) return ''
    return getWordAtCursor(localValue, cursorPos).word
  }, [showSuggestions, localValue, cursorPos])

  // Filter suggestions based on current word
  const suggestions = useMemo(() => {
    if (!currentWord || currentWord.length < 1) return knownNames.slice(0, 8)
    const lower = currentWord.toLowerCase()
    const startsWith = knownNames.filter(name => name.toLowerCase().startsWith(lower))
    const includes = knownNames.filter(name => name.toLowerCase().includes(lower) && !name.toLowerCase().startsWith(lower))
    return [...startsWith, ...includes].slice(0, 8)
  }, [knownNames, currentWord])

  // Sync external value changes (sample buttons)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // onInput fires on every keystroke — critical for iOS Safari
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const newValue = e.currentTarget.value
    const pos = e.currentTarget.selectionStart || 0
    setLocalValue(newValue)
    setCursorPos(pos)

    // Show suggestions when typing in a node name position
    const inNodePos = isInNodeNamePosition(newValue, pos)
    if (inNodePos && knownNames.length > 0) {
      const word = getWordAtCursor(newValue, pos)
      if (word.word.length >= 1) {
        setShowSuggestions(true)
        setSelectedIndex(0)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }

    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      onChange(newValue)
    }, 250) // faster debounce for real-time feel
  }, [onChange, knownNames])

  // Immediate update (bypass debounce)
  const handlePreview = useCallback(() => {
    setShowSuggestions(false)
    clearTimeout(debounceTimer.current)
    onChange(localValue)
  }, [localValue, onChange])

  // Insert selected suggestion
  const insertSuggestion = useCallback((name: string) => {
    const { start, end } = getWordAtCursor(localValue, cursorPos)
    const newValue = localValue.slice(0, start) + name + localValue.slice(end)
    setLocalValue(newValue)
    setShowSuggestions(false)
    // Update parent immediately so parsing picks up the new node name
    clearTimeout(debounceTimer.current)
    onChange(newValue)
    // Focus back on textarea and set cursor position
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPos = start + name.length
        textareaRef.current.setSelectionRange(newPos, newPos)
      }
    })
  }, [localValue, cursorPos, onChange])

  // Handle keyboard navigation in suggestions
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault()
        insertSuggestion(suggestions[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }, [showSuggestions, suggestions, selectedIndex, insertSuggestion])

  // Close suggestions on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="input-panel">
      <div className="input-panel__header">
        <h2 className="input-panel__title">Inputs</h2>
        <span className="input-panel__hint">Source [amount] Target</span>
      </div>

      {samples && samples.length > 0 && (
        <div className="sample-buttons">
          {samples.map((s) => (
            <button
              key={s.name}
              type="button"
              className="sample-buttons__pill"
              onClick={() => {
                setShowSuggestions(false)
                onChange(s.flows)
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="input-panel__input-wrapper">
        <textarea
          ref={textareaRef}
          className="input-panel__textarea"
          value={localValue}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onSelect={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
          onClick={() => setShowSuggestions(false)}
          placeholder="Wages [1500] Budget\nOther [250] Budget\nBudget [450] Taxes\nBudget [420] Housing\n:Budget #057\nBudget [*] Savings"
          rows={12}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
        />

        {showSuggestions && suggestions.length > 0 && (
          <div className="autocomplete-dropdown" ref={dropdownRef}>
            {suggestions.map((name, i) => (
              <button
                key={name}
                className={`autocomplete-item ${i === selectedIndex ? 'autocomplete-item--selected' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertSuggestion(name)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="input-panel__preview-btn"
        onClick={handlePreview}
      >
        Preview Diagram →
      </button>

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
