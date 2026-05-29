import { describe, it, expect } from 'vitest'
import { parseDiagramInput } from '../engine/parser'
import { sankeyLayout } from '../engine/sankeyLayout'
import { DEFAULT_CONFIG, DiagramConfig } from '../engine/types'

describe('Full pipeline: parse → layout → render', () => {
  const sampleInput = `Wages [1500] Budget
Other [250] Budget
Budget [450] Taxes
Budget [420] Housing
Budget [400] Food
Budget [255] Transportation
:Budget #057
Budget [*] Savings`

  it('parses without errors', () => {
    const result = parseDiagramInput(sampleInput, DEFAULT_CONFIG)
    expect(result.errors).toHaveLength(0)
    expect(result.flows.length).toBeGreaterThan(0)
    expect(result.nodes.size).toBeGreaterThan(0)
  })

  it('runs the sankey layout without throwing', () => {
    const result = parseDiagramInput(sampleInput, DEFAULT_CONFIG)
    const nodes = Array.from(result.nodes.values())

    // Clone nodes and flows for layout
    const layoutNodes = nodes.map(n => ({ ...n }))
    const nodeMap = new Map(layoutNodes.map(n => [n.name, n]))

    const layoutFlows = result.flows.map(f => ({
      amount: f.amount,
      sourceRow: f.sourceRow,
      operation: f.operation,
      source: nodeMap.get(
        typeof f.source === 'object' && f.source ? (f.source as any).name : ''
      ) || f.source,
      target: nodeMap.get(
        typeof f.target === 'object' && f.target ? (f.target as any).name : ''
      ) || f.target,
      value: f.operation ? 0 : Number(f.amount) || 0,
    }))

    const layout = sankeyLayout()
      .nodes(layoutNodes)
      .flows(layoutFlows)
      .size({ w: 600, h: 600 })
      .nodeWidth(12)
      .nodeHeightFactor(0.5)
      .nodeSpacingFactor(0.75)
      .autoLayout(true)
      .rightJustifyEndpoints(false)
      .leftJustifyOrigins(false)

    // This should not throw
    expect(() => {
      layout.setup()
      layout.layout(25)
    }).not.toThrow()
  })

  it('produces positioned nodes after layout', () => {
    const result = parseDiagramInput(sampleInput, DEFAULT_CONFIG)
    const nodes = Array.from(result.nodes.values())

    const layoutNodes = nodes.map(n => ({ ...n }))
    const nodeMap = new Map(layoutNodes.map(n => [n.name, n]))

    const layoutFlows = result.flows.map(f => ({
      amount: f.amount,
      sourceRow: f.sourceRow,
      operation: f.operation,
      source: nodeMap.get(
        typeof f.source === 'object' && f.source ? (f.source as any).name : ''
      ) || f.source,
      target: nodeMap.get(
        typeof f.target === 'object' && f.target ? (f.target as any).name : ''
      ) || f.target,
      value: f.operation ? 0 : Number(f.amount) || 0,
    }))

    const layout = sankeyLayout()
      .nodes(layoutNodes)
      .flows(layoutFlows)
      .size({ w: 600, h: 600 })
      .nodeWidth(12)
      .nodeHeightFactor(0.5)
      .nodeSpacingFactor(0.75)
      .autoLayout(true)

    layout.setup()
    layout.layout(25)

    // Check that nodes have positions
    const positionedNodes = layoutNodes.filter(n => !n.isAShadow && n.dx && n.dy)
    console.log('Positioned nodes:', positionedNodes.length, 'of', layoutNodes.length)
    
    positionedNodes.forEach(n => {
      expect(typeof n.x).toBe('number')
      expect(typeof n.y).toBe('number')
      expect(n.dx).toBeGreaterThan(0)
      expect(n.dy).toBeGreaterThan(0)
      expect(typeof n.stage).toBe('number')
      console.log(`  ${n.name}: stage=${n.stage}, x=${n.x?.toFixed(1)}, y=${n.y?.toFixed(1)}, w=${n.dx?.toFixed(1)}, h=${n.dy?.toFixed(1)}`)
    })

    expect(positionedNodes.length).toBeGreaterThan(0)
  })
})
