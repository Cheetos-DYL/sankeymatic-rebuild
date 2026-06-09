import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Layout } from './components/Layout/Layout'
import { TabBar, type DiagramTab } from './components/TabBar/TabBar'
import { InputPanel } from './components/InputPanel/InputPanel'
import { ControlsPanel } from './components/Controls/ControlsPanel'
import { DiagramStage } from './components/Diagram/DiagramStage'
import { GanttInputPanel } from './components/GanttInputPanel/GanttInputPanel'
import { GanttStage } from './components/GanttStage/GanttStage'
import { GanttControlsPanel, DEFAULT_GANTT_CONFIG, type GanttConfig } from './components/GanttControls/GanttControlsPanel'
import { parseDiagramInput } from './engine/parser'
import { parseGanttInput } from './engine/ganttParser'
import type { DiagramConfig } from './engine/types'
import { DEFAULT_CONFIG } from './engine/types'
import { sampleDiagramRecipes } from './engine/constants'

function App() {
  const [activeTab, setActiveTab] = useState<DiagramTab>('sankey')
  const [inputText, setInputText] = useState('')
  const [ganttText, setGanttText] = useState('')
  const [ganttConfig, setGanttConfig] = useState<GanttConfig>(DEFAULT_GANTT_CONFIG)
  const [config, setConfig] = useState<DiagramConfig>(DEFAULT_CONFIG)
  const [diagramVisible, setDiagramVisible] = useState(true)
  const mountedRef = useRef(false)

  // Sankey parsing
  const parseResult = useMemo(
    () => parseDiagramInput(inputText, config),
    [inputText, config]
  )

  // Gantt parsing
  const ganttResult = useMemo(
    () => parseGanttInput(ganttText),
    [ganttText]
  )

  // Use ganttConfig directly — user controls timeline unit via radio buttons
  // Parser's timelineConfig is informational only (not used to override UI)
  const effectiveGanttConfig = ganttConfig

  // ── URL hash persistence — read on mount ──
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      try {
        const params = new URLSearchParams(hash)
        // Sankey input
        const sHash = params.get('s')
        if (sHash) {
          setInputText(decodeURIComponent(atob(sHash)))
        }
        // Gantt input
        const ganttHash = params.get('gantt')
        if (ganttHash) {
          setGanttText(decodeURIComponent(atob(ganttHash)))
        }
        // Gantt config
        const configHash = params.get('ganttConfig')
        if (configHash) {
          const parsed = JSON.parse(decodeURIComponent(atob(configHash)))
          setGanttConfig(prev => ({ ...prev, ...parsed }))
        }
      } catch {
        // Invalid hash — ignore
      }
    }
    mountedRef.current = true
  }, [])

  // ── URL hash persistence — write on change (debounced) ──
  useEffect(() => {
    if (!mountedRef.current) return
    if (!inputText && !ganttText) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (inputText) {
        params.set('s', btoa(encodeURIComponent(inputText)))
      }
      if (ganttText) {
        params.set('gantt', btoa(encodeURIComponent(ganttText)))
      }
      if (JSON.stringify(ganttConfig) !== JSON.stringify(DEFAULT_GANTT_CONFIG)) {
        params.set('ganttConfig', btoa(encodeURIComponent(JSON.stringify(ganttConfig))))
      }
      const hash = params.toString()
      if (hash) {
        window.history.replaceState(null, '', `#${hash}`)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [inputText, ganttText, ganttConfig])

  const handleInputChange = useCallback((value: string) => {
    setInputText(value)
  }, [])

  const handleGanttChange = useCallback((value: string) => {
    setGanttText(value)
  }, [])
  const handleGanttConfigChange = useCallback((updates: Partial<GanttConfig>) => {
    setGanttConfig(prev => ({ ...prev, ...updates }))
  }, [])
  const handleConfigChange = useCallback((updates: Partial<DiagramConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  // Convert Map to array for the diagram
  const nodes = useMemo(
    () => Array.from(parseResult.nodes.values()),
    [parseResult.nodes]
  )

  const sampleRecipes = useMemo(
    () => Array.from(sampleDiagramRecipes.entries()).map(([, recipe]) => recipe),
    []
  )

  // Get known node names from parsed results (for auto-complete)
  const knownNodeNames = useMemo(
    () => nodes.map(n => n.name),
    [nodes]
  )

  // Tab bar element (shared between both tab contents)
  const tabBar = (
    <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
  )

  // Sankey sidebar
  const sankeySidebar = (
    <>
      <InputPanel
        value={inputText}
        onChange={handleInputChange}
        errors={parseResult.errors}
        samples={sampleRecipes}
        knownNodeNames={knownNodeNames}
      />
      <ControlsPanel
        config={config}
        onChange={handleConfigChange}
      />
    </>
  )

  // Gantt sidebar
  const ganttSidebar = (
    <>
      <GanttInputPanel
        value={ganttText}
        onChange={handleGanttChange}
        errors={ganttResult.errors}
      />
      <GanttControlsPanel
        config={effectiveGanttConfig}
        onChange={handleGanttConfigChange}
      />
    </>
  )

  // Main content based on active tab
  const mainContent = activeTab === 'sankey' ? (
    <DiagramStage
      nodes={nodes}
      flows={parseResult.flows}
      config={config}
      onInputChange={handleInputChange}
      diagramVisible={diagramVisible}
      onToggleDiagram={() => setDiagramVisible(v => !v)}
    />
  ) : (
    <GanttStage
      tasks={ganttResult.tasks}
      projectDate={ganttResult.projectDate}
      title={ganttResult.title}
      config={effectiveGanttConfig}
    />
  )

  return (
    <Layout
      tabBar={tabBar}
      sidebar={activeTab === 'sankey' ? sankeySidebar : ganttSidebar}
      main={mainContent}
    />
  )
}

export default App
