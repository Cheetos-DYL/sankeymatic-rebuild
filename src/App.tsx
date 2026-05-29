import { useState, useCallback, useMemo } from 'react'
import { Layout } from './components/Layout/Layout'
import { InputPanel } from './components/InputPanel/InputPanel'
import { ControlsPanel } from './components/Controls/ControlsPanel'
import { DiagramStage } from './components/Diagram/DiagramStage'
import { parseDiagramInput } from './engine/parser'
import type { DiagramConfig } from './engine/types'
import { DEFAULT_CONFIG } from './engine/types'
import { sampleDiagramRecipes } from './engine/constants'

function App() {
  const [inputText, setInputText] = useState('')
  const [config, setConfig] = useState<DiagramConfig>(DEFAULT_CONFIG)
  const [diagramVisible, setDiagramVisible] = useState(true)

  const parseResult = useMemo(
    () => parseDiagramInput(inputText, config),
    [inputText, config]
  )

  const handleInputChange = useCallback((value: string) => {
    setInputText(value)
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

  const sidebar = (
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

  return (
    <Layout
      sidebar={sidebar}
      main={
        <DiagramStage
          nodes={nodes}
          flows={parseResult.flows}
          config={config}
          onInputChange={handleInputChange}
          diagramVisible={diagramVisible}
          onToggleDiagram={() => setDiagramVisible(v => !v)}
        />
      }
    />
  )
}

export default App
