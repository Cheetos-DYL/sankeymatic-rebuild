import { useMemo, useRef, useCallback } from 'react'
import * as d3 from 'd3'
import type {
  SankeyNode as SankeyNodeType,
  SankeyFlow,
  DiagramConfig,
} from '../../engine/types'
import { sankeyLayout } from '../../engine/sankeyLayout'
import { sampleDiagramRecipes } from '../../engine/constants'
import './DiagramStage.css'

interface DiagramStageProps {
  nodes: SankeyNodeType[]
  flows: SankeyFlow[]
  config: DiagramConfig
  onInputChange?: (value: string) => void
  diagramVisible?: boolean
  onToggleDiagram?: () => void
}

export function DiagramStage({ nodes, flows, config, onInputChange, diagramVisible = true, onToggleDiagram }: DiagramStageProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const hasData = flows.length > 0 && nodes.length > 0

  const renderData = useMemo(() => {
    if (!hasData || nodes.length === 0 || flows.length === 0) return null

    // Clone nodes and flows for layout (layout mutates them)
    const layoutNodes = nodes.map(n => ({ ...n }))

    // Build a name→cloned-node map so flows reference the clones
    const nodeMap = new Map<string, SankeyNodeType>()
    layoutNodes.forEach(n => nodeMap.set(n.name, n))

    const layoutFlows = flows.map(f => {
      const srcNode = (typeof f.source === 'object' && f.source !== null)
        ? nodeMap.get((f.source as SankeyNodeType).name)
        : nodeMap.get((f as any).sourceName || '')
      const tgtNode = (typeof f.target === 'object' && f.target !== null)
        ? nodeMap.get((f.target as SankeyNodeType).name)
        : nodeMap.get((f as any).targetName || '')

      return {
        amount: f.amount,
        sourceRow: f.sourceRow,
        operation: f.operation,
        source: srcNode || f.source,
        target: tgtNode || f.target,
        value: f.operation ? undefined : (Number(f.amount) || 0),
      }
    })

    // Resolve wildcard flows (* and ?)
    const flowsBySource = new Map<string, any[]>()
    const flowsByTarget = new Map<string, any[]>()
    const wildcardFlows: any[] = []

    layoutFlows.forEach((f: any) => {
      const srcName = typeof f.source === 'object' ? f.source.name : String(f.source)
      const tgtName = typeof f.target === 'object' ? f.target.name : String(f.target)
      if (!flowsBySource.has(srcName)) flowsBySource.set(srcName, [])
      flowsBySource.get(srcName)!.push(f)
      if (!flowsByTarget.has(tgtName)) flowsByTarget.set(tgtName, [])
      flowsByTarget.get(tgtName)!.push(f)
      if (f.operation) wildcardFlows.push(f)
    })

    for (const wf of wildcardFlows) {
      const srcName = typeof wf.source === 'object' ? wf.source.name : String(wf.source)
      const tgtName = typeof wf.target === 'object' ? wf.target.name : String(wf.target)

      if (wf.operation === '*') {
        const sourceFlows = flowsBySource.get(srcName) || []
        const nonWildOutFlows = sourceFlows.filter((f: any) =>
          (typeof f.source === 'object' ? f.source.name : String(f.source)) === srcName && !f.operation
        )
        let totalIn = 0
        for (const flow of layoutFlows) {
          const tgt = typeof flow.target === 'object' ? flow.target.name : String(flow.target)
          if (tgt === srcName && !flow.operation) totalIn += (flow.value ?? 0)
        }
        const outSum = nonWildOutFlows.reduce((s: number, f: any) => s + (f.value ?? 0), 0)
        wf.value = Math.max(0, totalIn - outSum)
      } else if (wf.operation === '?') {
        const targetFlows = flowsByTarget.get(tgtName) || []
        const nonWildInFlows = targetFlows.filter((f: any) =>
          (typeof f.target === 'object' ? f.target.name : String(f.target)) === tgtName && !f.operation
        )
        let totalOut = 0
        for (const flow of layoutFlows) {
          const src = typeof flow.source === 'object' ? flow.source.name : String(flow.source)
          if (src === tgtName && !flow.operation) totalOut += (flow.value ?? 0)
        }
        const inSum = nonWildInFlows.reduce((s: number, f: any) => s + (f.value ?? 0), 0)
        wf.value = Math.max(0, totalOut - inSum)
      }
    }

    const layout = sankeyLayout()
      .nodes(layoutNodes)
      .flows(layoutFlows)
      .size({ w: config.size_w, h: config.size_h })
      .nodeWidth(config.node_w)
      .nodeHeightFactor(config.node_h / 100)
      .nodeSpacingFactor(config.node_spacing / 100)
      .autoLayout(config.layout_order === 'automatic')
      .rightJustifyEndpoints(config.layout_justifyends)
      .leftJustifyOrigins(config.layout_justifyorigins)

    layout.setup()
    layout.layout(config.internal_iterations)

    // Assign colors
    const colorThemes: Record<string, readonly string[]> = {
      a: d3.schemeCategory10,
      b: d3.schemeTableau10,
      c: d3.schemeDark2,
      d: d3.schemeSet3,
    }
    const themeColors = config.node_theme !== 'none'
      ? (colorThemes[config.node_theme] || d3.schemeCategory10) : null
    layoutNodes.forEach((n, i) => {
      if (!n.color) {
        n.color = themeColors ? themeColors[i % themeColors.length] : config.node_color
      }
    })

    // Assign flow colors — using "outside-in" logic like the original SankeyMATIC
    const stagesArr = layout.stages()
    const stagesMidpoint = (stagesArr.length - 1) / 2

    layoutFlows.forEach((f: any) => {
      const srcNode = typeof f.source === 'object' ? f.source : layoutNodes.find(n => n.name === f.source)
      const tgtNode = typeof f.target === 'object' ? f.target : layoutNodes.find(n => n.name === f.target)
      if (config.flow_inheritfrom === 'source' && srcNode?.color) {
        f.color = srcNode.color
      } else if (config.flow_inheritfrom === 'target' && tgtNode?.color) {
        f.color = tgtNode.color
      } else if (config.flow_inheritfrom === 'outside-in') {
        // Outside-in: left half flows use source color, right half use target color
        const flowMidpoint = ((srcNode?.stage ?? 0) + (tgtNode?.stage ?? 0)) / 2
        if (flowMidpoint <= stagesMidpoint) {
          f.color = srcNode?.color || config.flow_color
        } else {
          f.color = tgtNode?.color || config.flow_color
        }
      } else {
        f.color = config.flow_color
      }
    })

    // Generate flow paths — matching original SankeyMATIC rendering style:
    // Curved flows use stroked paths (stroke-width = flow height)
    // Flat flows use filled parallelogram paths
    const curvature = config.flow_curvature <= 0.1 ? 0 : config.flow_curvature
    const flowsAreFlat = curvature === 0

    const flowPaths = layoutFlows
      .filter((f: any) => {
        const src = typeof f.source === 'object' ? f.source : null
        const tgt = typeof f.target === 'object' ? f.target : null
        return src && tgt && !f.isAShadow && (f.value ?? 0) >= 0 && (f.dy ?? 0) >= 0
      })
      .map((f: any) => {
        const src = typeof f.source === 'object' ? f.source : null
        const tgt = typeof f.target === 'object' ? f.target : null
        if (!src || !tgt) return null

        const sx = (src.x ?? 0) + (src.dx ?? 0) // source trailing edge
        const tx = tgt.x ?? 0                     // target leading edge
        const syC = (src.y ?? 0) + (f.sy ?? 0) + (f.dy ?? 0) / 2  // source flow center
        const tyC = (tgt.y ?? 0) + (f.ty ?? 0) + (f.dy ?? 0) / 2  // target flow center
        const syTop = (src.y ?? 0) + (f.sy ?? 0)
        const syBot = syTop + (f.dy ?? 0)
        const tyTop = (tgt.y ?? 0) + (f.ty ?? 0)
        const tyBot = tyTop + (f.dy ?? 0)

        let d: string
        let renderAs: 'flat' | 'curved'
        let strokeWidth: number

        if (flowsAreFlat || Math.abs(syC - tyC) < 2 || Math.abs(tx - sx) < 12) {
          // Flat flow: parallelogram shape (filled)
          d = `M${sx} ${syTop}v${f.dy} L${tx} ${tyBot}v${-f.dy} z`
          renderAs = 'flat'
          strokeWidth = 0.5
        } else {
          // Curved flow: stroked bezier curve (matching original SankeyMATIC)
          const xinterpolate = d3.interpolateNumber(sx, tx)
          const xcp1 = xinterpolate(curvature)
          const xcp2 = xinterpolate(1 - curvature)
          d = `M${sx} ${syC} C${xcp1} ${syC} ${xcp2} ${tyC} ${tx} ${tyC}`
          renderAs = 'curved'
          strokeWidth = Math.max(1, f.dy ?? 1)
        }

        return {
          d,
          color: f.color || config.flow_color,
          opacity: config.flow_opacity,
          renderAs,
          strokeWidth,
          gradientId: `grad-${f.source?.name?.replace(/[^a-zA-Z0-9]/g, '')}-${f.target?.name?.replace(/[^a-zA-Z0-9]/g, '')}-${f.index}`,
          sourceColor: src.color || config.flow_color,
          targetColor: tgt.color || config.flow_color,
        }
      })
      .filter(Boolean)

    // Generate node labels
    const visibleNodes = layoutNodes.filter((n: any) => !n.isAShadow)
    const maxStage = Math.max(...visibleNodes.map((n: any) => n.stage ?? 0), 0)
    const margin = Math.max(config.margin_l, config.margin_r, 12)

    const formatValue = (v: number): string => {
      const fmt = config.value_format || ',.'
      const useComma = fmt.includes(',')
      const useDot = fmt.includes('.')
      const useSpace = fmt.includes(' ')
      const sep = useSpace ? ' ' : (useComma ? ',' : '.')
      const dec = useDot ? '.' : ','
      const parts = v.toFixed(config.labelvalue_fullprecision ? 2 : 0).split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep)
      const num = parts.join(dec)
      return `${config.value_prefix}${num}${config.value_suffix}`
    }

    const getLabelSide = (stage: number): 'left' | 'right' => {
      if (config.labelposition_scheme === 'per_stage') {
        const alt = config.labelposition_first === 'after'
        return (stage % 2 === 0) !== alt ? 'right' : 'left'
      }
      if (config.labelposition_autoalign === -1) return 'left'
      if (config.labelposition_autoalign === 1) return 'right'
      if (stage === 0) return 'left'
      if (stage >= maxStage) return 'right'
      return stage < config.labelposition_breakpoint ? 'left' : 'right'
    }

    const nodeLabels = visibleNodes.map((n: any) => {
      const side = getLabelSide(n.stage ?? 0)
      const nodeX = n.x ?? 0
      const nodeW = n.dx ?? 0
      const nodeY = n.y ?? 0
      const nodeH = n.dy ?? 0
      const tx = side === 'left' ? nodeX - margin : nodeX + nodeW + margin
      const anchor = side === 'left' ? 'end' : 'start'
      const nameSize = config.labelname_size || 16
      const valueSize = nameSize * (config.labels_relativesize / 100)
      const nodeValue = (n.value ?? 0) || (n.total?.OUT ?? 0) || (n.total?.IN ?? 0)
      const lines: { text: string; size: number; weight: number; yOffset: number }[] = []
      const lh = 1 + (config.labels_linespacing || 0.15)
      const nameH = nameSize * lh
      const valueH = valueSize * lh
      const hasName = config.labelname_appears && !config.labels_hide
      const hasValue = config.labelvalue_appears && !config.labels_hide
      if (!hasName && !hasValue) return null
      const centerY = nodeY + nodeH / 2
      let totalBlockHeight = 0
      if (hasName) totalBlockHeight += nameH
      if (hasValue) totalBlockHeight += valueH
      const blockTop = centerY - totalBlockHeight / 2
      let nextY = blockTop
      if (hasName && hasValue) {
        switch (config.labelvalue_position) {
          case 'above':
            lines.push({ text: formatValue(nodeValue), size: valueSize, weight: config.labelvalue_weight, yOffset: nextY + valueSize * 0.8 })
            nextY += valueH
            lines.push({ text: n.name, size: nameSize, weight: config.labelname_weight, yOffset: nextY + nameSize * 0.8 })
            break
          case 'before':
            lines.push({ text: `${formatValue(nodeValue)} ${n.name}`, size: nameSize, weight: config.labelname_weight, yOffset: nextY + nameSize * 0.8 })
            break
          case 'after':
            lines.push({ text: `${n.name} ${formatValue(nodeValue)}`, size: nameSize, weight: config.labelname_weight, yOffset: nextY + nameSize * 0.8 })
            break
          case 'below':
          default:
            lines.push({ text: n.name, size: nameSize, weight: config.labelname_weight, yOffset: nextY + nameSize * 0.8 })
            nextY += nameH
            lines.push({ text: formatValue(nodeValue), size: valueSize, weight: config.labelvalue_weight, yOffset: nextY + valueSize * 0.8 })
            break
        }
      } else if (hasName) {
        lines.push({ text: n.name, size: nameSize, weight: config.labelname_weight, yOffset: centerY + nameSize * 0.35 })
      } else if (hasValue) {
        lines.push({ text: formatValue(nodeValue), size: valueSize, weight: config.labelvalue_weight, yOffset: centerY + valueSize * 0.35 })
      }
      return { tx, anchor, lines, color: config.labels_color, fontFace: config.labels_fontface }
    }).filter(Boolean)

    const labelPad = 90
    return {
      nodes: layoutNodes,
      flowPaths,
      nodeLabels,
      viewBoxX: -labelPad,
      viewBoxW: config.size_w + 2 * labelPad,
      viewBoxH: config.size_h,
    }
  }, [nodes, flows, config, hasData])

  // Export handlers
  const handleExportPNG = useCallback(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const canvas = document.createElement('canvas')
    const scale = 2
    const vbW = renderData?.viewBoxW ?? config.size_w
    const vbH = renderData?.viewBoxH ?? config.size_h
    canvas.width = vbW * scale
    canvas.height = vbH * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `sankeymatic-${Date.now()}.png`
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }, [config.size_w, config.size_h])

  const handleExportSVG = useCallback(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const svgData = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sankeymatic-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  return (
    <div className="diagram-stage">
      {/* Toggle bar */}
      <div className="diagram-toggle">
        <button
          type="button"
          className="diagram-toggle__btn"
          onClick={onToggleDiagram}
        >
          <span className="diagram-toggle__icon">{diagramVisible ? '▼' : '▶'}</span>
          <span className="diagram-toggle__label">Diagram Preview</span>
          {!diagramVisible && hasData && (
            <span className="diagram-toggle__badge">ready</span>
          )}
        </button>
      </div>

      {diagramVisible && (
        !hasData ? (
          <div className="diagram-empty">
            <h2 className="diagram-empty__title">Build a Sankey Diagram</h2>
            <p className="diagram-empty__text">
              Enter flows between nodes using the text editor on the left.
            </p>
            <code className="diagram-empty__code">
              Source [Amount] Target
            </code>
            {onInputChange && (
              <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', justifyContent: 'center' }}>
                {Array.from(sampleDiagramRecipes.entries()).map(([key, recipe]) => (
                  <button
                    key={key}
                    type="button"
                    className="btn-pill--small"
                    onClick={() => onInputChange(recipe.flows)}
                  >
                    {recipe.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`${renderData?.viewBoxX ?? 0} 0 ${renderData?.viewBoxW ?? config.size_w} ${renderData?.viewBoxH ?? config.size_h}`}
              preserveAspectRatio="xMidYMid meet"
              className="diagram-svg"
              style={{
                background: config.bg_transparent ? 'transparent' : config.bg_color,
              }}
            >
              <defs>
                {/* Gradient definitions for flows */}
                {renderData?.flowPaths
                  .filter((fp: any) => fp.renderAs === 'curved')
                  .map((fp: any, i: number) => (
                    <linearGradient
                      key={`gradient-${i}`}
                      id={fp.gradientId}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor={fp.sourceColor} />
                      <stop offset="100%" stopColor={fp.targetColor} />
                    </linearGradient>
                  ))}
              </defs>

              <g className="diagram-flows">
                {renderData?.flowPaths.map((fp: any, i: number) => (
                  fp.renderAs === 'curved' ? (
                    <path
                      key={`flow-${i}`}
                      d={fp.d}
                      fill="none"
                      stroke={fp.gradientId ? `url(#${fp.gradientId})` : fp.color}
                      strokeWidth={fp.strokeWidth}
                      strokeOpacity={fp.opacity}
                      strokeLinecap="butt"
                    />
                  ) : (
                    <path
                      key={`flow-${i}`}
                      d={fp.d}
                      fill={fp.color}
                      fillOpacity={fp.opacity}
                      stroke="none"
                    />
                  )
                ))}
              </g>

              <g className="diagram-nodes">
                {renderData?.nodes
                  .filter((n: any) => !n.isAShadow)
                  .map((n: any, i: number) => (
                    <rect
                      key={`node-${i}`}
                      x={n.x ?? 0} y={n.y ?? 0}
                      width={n.dx ?? 0} height={n.dy ?? 0}
                      fill={n.color ?? config.node_color}
                      opacity={config.node_opacity}
                      stroke={config.node_border > 0 ? (config.node_border > 0 ? d3.rgb(n.color ?? config.node_color).darker(0.8).toString() : 'none') : 'none'}
                      strokeWidth={config.node_border}
                    />
                  ))}
              </g>

              {!config.labels_hide && (
                <g className="diagram-labels">
                  {renderData?.nodeLabels?.map((label: any, i: number) => (
                    <g key={`label-${i}`}>
                      {label.lines.map((line: any, j: number) => (
                        <text
                          key={j} x={label.tx} y={line.yOffset}
                          textAnchor={label.anchor}
                          fontFamily={label.fontFace || 'sans-serif'}
                          fontSize={line.size} fontWeight={line.weight}
                          fill={label.color}
                        >
                          {line.text}
                        </text>
                      ))}
                    </g>
                  ))}
                </g>
              )}
            </svg>

            <div className="export-bar">
              <button className="btn-pill btn-pill--primary" onClick={handleExportPNG}>Download PNG</button>
              <button className="btn-pill btn-pill--secondary" onClick={handleExportSVG}>Download SVG</button>
            </div>
          </>
        )
      )}
    </div>
  )
}
