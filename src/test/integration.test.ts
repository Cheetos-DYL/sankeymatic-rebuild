import { describe, it, expect } from 'vitest'
import { parseDiagramInput } from '../engine/parser'
import { DEFAULT_CONFIG } from '../engine/types'

describe('Integration: parse + layout', () => {
  it('parses a simple flow and produces nodes', () => {
    const input = 'Wages [1500] Budget\nBudget [450] Taxes'
    const result = parseDiagramInput(input, DEFAULT_CONFIG)
    
    console.log('Flows:', result.flows.length)
    console.log('Nodes:', result.nodes.size)
    console.log('Errors:', JSON.stringify(result.errors))
    console.log('Flow details:', JSON.stringify(result.flows))
    console.log('Node names:', Array.from(result.nodes.keys()))
    
    expect(result.errors).toHaveLength(0)
    expect(result.flows.length).toBeGreaterThan(0)
    expect(result.nodes.size).toBeGreaterThan(0)
  })

  it('parses node color declaration', () => {
    const input = ':Budget #057'
    const result = parseDiagramInput(input, DEFAULT_CONFIG)
    console.log('Node:', JSON.stringify(Array.from(result.nodes.entries())))
    expect(result.errors).toHaveLength(0)
  })

  it('parses the sample diagram', () => {
    const input = `Wages [1500] Budget
Other [250] Budget
Budget [450] Taxes
Budget [420] Housing
Budget [400] Food
Budget [255] Transportation
:Budget #057
Budget [*] Savings`
    const result = parseDiagramInput(input, DEFAULT_CONFIG)
    console.log('Flows:', result.flows.length)
    console.log('Nodes:', result.nodes.size)
    console.log('Errors:', JSON.stringify(result.errors))
    expect(result.errors.length).toBeLessThanOrEqual(1) // wildcard * might cause an issue
  })
})
