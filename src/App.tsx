import { useState, useCallback, useMemo } from 'react'
import { Layout } from './components/Layout/Layout'
import { TabBar, type DiagramTab } from './components/TabBar/TabBar'
import { InputPanel } from './components/InputPanel/InputPanel'
import { ControlsPanel } from './components/Controls/ControlsPanel'
import { DiagramStage } from './components/Diagram/DiagramStage'
import { GanttInputPanel } from './components/GanttInputPanel/GanttInputPanel'
import { GanttStage } from './components/GanttStage/GanttStage'
import { parseDiagramInput } from './engine/parser'
import { parseGanttInput } from './engine/ganttParser'
import type { DiagramConfig } from './engine/types'
import { DEFAULT_CONFIG } from './engine/types'
import { sampleDiagramRecipes } from './engine/constants'

function App() {
  const [activeTab, setActiveTab] = useState<DiagramTab>('sankey')
  const [inputText, setInputText] = useState('')
  const [ganttText, setGanttText] = useState('')
  const [config, setConfig] = useState<DiagramConfig>(DEFAULT_CONFIG)
  const [diagramVisible, setDiagramVisible] = useState(true)

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

  const handleInputChange = useCallback((value: string) => {
    setInputText(value)
  }, [])

  const handleGanttChange = useCallback((value: string) => {
    setGanttText(value)
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
    <GanttInputPanel
      value={ganttText}
      onChange={handleGanttChange}
      errors={ganttResult.errors}
    />
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
