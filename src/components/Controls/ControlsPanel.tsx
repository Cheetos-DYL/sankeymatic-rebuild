import { CollapsibleSection } from './CollapsibleSection'
import { SliderControl } from './SliderControl'
import type { DiagramConfig } from '../../engine/types'
import './ControlsPanel.css'

interface ControlsPanelProps {
  config: DiagramConfig
  onChange: (updates: Partial<DiagramConfig>) => void
}

export function ControlsPanel({ config, onChange }: ControlsPanelProps) {
  return (
    <div className="controls-panel">
      {/* === SIZE === */}
      <CollapsibleSection title="Size" defaultOpen={false}>
        <div className="control-row">
          <span className="control-row__label">Width</span>
          <input type="number" className="control-row__number" value={config.size_w} min={40}
            onChange={e => onChange({ size_w: Number(e.target.value) })} />
        </div>
        <div className="control-row">
          <span className="control-row__label">Height</span>
          <input type="number" className="control-row__number" value={config.size_h} min={40}
            onChange={e => onChange({ size_h: Number(e.target.value) })} />
        </div>
        <div className="control-row">
          <span className="control-row__label">L margin</span>
          <input type="number" className="control-row__number" value={config.margin_l} min={0}
            onChange={e => onChange({ margin_l: Number(e.target.value) })} />
        </div>
        <div className="control-row">
          <span className="control-row__label">R margin</span>
          <input type="number" className="control-row__number" value={config.margin_r} min={0}
            onChange={e => onChange({ margin_r: Number(e.target.value) })} />
        </div>
        <div className="control-row">
          <span className="control-row__label">T margin</span>
          <input type="number" className="control-row__number" value={config.margin_t} min={0}
            onChange={e => onChange({ margin_t: Number(e.target.value) })} />
        </div>
        <div className="control-row">
          <span className="control-row__label">B margin</span>
          <input type="number" className="control-row__number" value={config.margin_b} min={0}
            onChange={e => onChange({ margin_b: Number(e.target.value) })} />
        </div>
        <label className="control-toggle">
          <input type="checkbox" checked={config.bg_transparent}
            onChange={e => onChange({ bg_transparent: e.target.checked })} />
          Transparent BG
        </label>
        <div className="control-color">
          <span className="control-color__label">BG Color</span>
          <input type="color" className="control-color__swatch" value={config.bg_color}
            onChange={e => onChange({ bg_color: e.target.value })} />
          <code className="control-color__hex">{config.bg_color}</code>
        </div>
      </CollapsibleSection>

      {/* === NODES === */}
      <CollapsibleSection title="Nodes">
        <SliderControl label="Height" value={config.node_h} min={0} max={100} step={0.5}
          onChange={v => onChange({ node_h: v })} formatValue={v => `${v.toFixed(1)}%`} />
        <SliderControl label="Spacing" value={config.node_spacing} min={0} max={100} step={0.5}
          onChange={v => onChange({ node_spacing: v })} formatValue={v => `${v.toFixed(1)}%`} />
        <div className="control-row">
          <span className="control-row__label">Width</span>
          <input type="number" className="control-row__number" value={config.node_w} min={0}
            onChange={e => onChange({ node_w: Number(e.target.value) })} />
        </div>
        <div className="control-row">
          <span className="control-row__label">Border</span>
          <input type="number" className="control-row__number" value={config.node_border} min={0}
            onChange={e => onChange({ node_border: Number(e.target.value) })} />
        </div>
        <SliderControl label="Opacity" value={config.node_opacity} min={0} max={1} step={0.05}
          onChange={v => onChange({ node_opacity: v })} formatValue={v => v.toFixed(2)} />
        <div className="control-color">
          <span className="control-color__label">Color</span>
          <input type="color" className="control-color__swatch" value={config.node_color}
            onChange={e => onChange({ node_color: e.target.value })} />
          <code className="control-color__hex">{config.node_color}</code>
        </div>
        <fieldset className="control-radio-group">
          <legend>Theme</legend>
          {[
            ['a', 'Category10'],
            ['b', 'Tableau10'],
            ['c', 'Dark2'],
            ['d', 'Set3'],
            ['none', 'Single color'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="node_theme" value={val}
                checked={config.node_theme === val}
                onChange={() => onChange({ node_theme: val })} />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="control-row-group" style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', marginTop: 4 }}>
          {[
            ['a', config.themeoffset_a],
            ['b', config.themeoffset_b],
            ['c', config.themeoffset_c],
            ['d', config.themeoffset_d],
          ].map(([key, val]) => (
            <div key={String(key)} className="control-row" style={{ flex: 1, minWidth: 50 }}>
              <span className="control-row__label">Offset {key}</span>
              <input type="number" className="control-row__number" value={Number(val)} min={0} max={11}
                onChange={e => onChange({ [`themeoffset_${key}`]: Number(e.target.value) } as any)} />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* === FLOWS === */}
      <CollapsibleSection title="Flows">
        <SliderControl label="Opacity" value={config.flow_opacity} min={0} max={1} step={0.05}
          onChange={v => onChange({ flow_opacity: v })} formatValue={v => v.toFixed(2)} />
        <SliderControl label="Curviness" value={config.flow_curvature} min={0.1} max={0.9} step={0.04}
          onChange={v => onChange({ flow_curvature: v })} formatValue={v => v.toFixed(2)} />
        <div className="control-color">
          <span className="control-color__label">Color</span>
          <input type="color" className="control-color__swatch" value={config.flow_color}
            onChange={e => onChange({ flow_color: e.target.value })} />
          <code className="control-color__hex">{config.flow_color}</code>
        </div>
        <fieldset className="control-radio-group">
          <legend>Inherit from</legend>
          {[
            ['source', 'Source'],
            ['target', 'Target'],
            ['outside-in', 'Outer→Inner'],
            ['none', 'One color'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="flow_inheritfrom" value={val}
                checked={config.flow_inheritfrom === val}
                onChange={() => onChange({ flow_inheritfrom: val })} />
              {label}
            </label>
          ))}
        </fieldset>
      </CollapsibleSection>

      {/* === LAYOUT === */}
      <CollapsibleSection title="Layout" defaultOpen={false}>
        <fieldset className="control-radio-group">
          <legend>Order</legend>
          {[
            ['automatic', 'Automatic'],
            ['exact', 'Input order'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="layout_order" value={val}
                checked={config.layout_order === val}
                onChange={() => onChange({ layout_order: val })} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="control-toggle">
          <input type="checkbox" checked={config.layout_reversegraph}
            onChange={e => onChange({ layout_reversegraph: e.target.checked })} />
          Reverse (R→L)
        </label>
        <label className="control-toggle">
          <input type="checkbox" checked={config.layout_justifyorigins}
            onChange={e => onChange({ layout_justifyorigins: e.target.checked })} />
          Left-justify origins
        </label>
        <label className="control-toggle">
          <input type="checkbox" checked={config.layout_justifyends}
            onChange={e => onChange({ layout_justifyends: e.target.checked })} />
          Right-justify ends
        </label>
        <fieldset className="control-radio-group">
          <legend>Attach incomplete</legend>
          {[
            ['leading', 'Leading'],
            ['nearest', 'Nearest'],
            ['trailing', 'Trailing'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="layout_attachincompletesto" value={val}
                checked={config.layout_attachincompletesto === val}
                onChange={() => onChange({ layout_attachincompletesto: val })} />
              {label}
            </label>
          ))}
        </fieldset>
        <SliderControl label="Iterations" value={config.internal_iterations} min={0} max={30} step={1}
          onChange={v => onChange({ internal_iterations: v })} formatValue={v => String(v)} />
      </CollapsibleSection>

      {/* === LABELS === */}
      <CollapsibleSection title="Labels" defaultOpen={false}>
        <label className="control-toggle">
          <input type="checkbox" checked={config.labels_hide}
            onChange={e => onChange({ labels_hide: e.target.checked })} />
          Hide All Labels
        </label>
        <label className="control-toggle">
          <input type="checkbox" checked={config.labelname_appears}
            onChange={e => onChange({ labelname_appears: e.target.checked })} />
          Show Names
        </label>
        <label className="control-toggle">
          <input type="checkbox" checked={config.labelvalue_appears}
            onChange={e => onChange({ labelvalue_appears: e.target.checked })} />
          Show Values
        </label>

        <div className="control-row">
          <span className="control-row__label">Name size</span>
          <input type="number" className="control-row__number" value={config.labelname_size} min={6} step={0.5}
            onChange={e => onChange({ labelname_size: Number(e.target.value) })} />
        </div>
        <SliderControl label="Name weight" value={config.labelname_weight} min={100} max={700} step={300}
          onChange={v => onChange({ labelname_weight: v })}
          formatValue={v => v === 100 ? 'Light' : v === 400 ? 'Normal' : 'Bold'} />
        <SliderControl label="Value weight" value={config.labelvalue_weight} min={100} max={700} step={300}
          onChange={v => onChange({ labelvalue_weight: v })}
          formatValue={v => v === 100 ? 'Light' : v === 400 ? 'Normal' : 'Bold'} />

        <fieldset className="control-radio-group">
          <legend>Value position</legend>
          {[
            ['below', 'Below name'],
            ['above', 'Above name'],
            ['before', 'Before name'],
            ['after', 'After name'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="labelvalue_position" value={val}
                checked={config.labelvalue_position === val}
                onChange={() => onChange({ labelvalue_position: val })} />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset className="control-radio-group">
          <legend>Font</legend>
          {[
            ['sans-serif', 'Sans-serif'],
            ['serif', 'Serif'],
            ['monospace', 'Monospace'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="labels_fontface" value={val}
                checked={config.labels_fontface === val}
                onChange={() => onChange({ labels_fontface: val })} />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="control-color">
          <span className="control-color__label">Color</span>
          <input type="color" className="control-color__swatch" value={config.labels_color}
            onChange={e => onChange({ labels_color: e.target.value })} />
          <code className="control-color__hex">{config.labels_color}</code>
        </div>

        <SliderControl label="Rel. size" value={config.labels_relativesize} min={50} max={150} step={1}
          onChange={v => onChange({ labels_relativesize: v })} formatValue={v => `${v}%`} />
        <SliderControl label="Magnify" value={config.labels_magnify} min={50} max={150} step={1}
          onChange={v => onChange({ labels_magnify: v })} formatValue={v => `${v}%`} />
        <SliderControl label="Line spacing" value={config.labels_linespacing} min={0} max={1} step={0.05}
          onChange={v => onChange({ labels_linespacing: v })} formatValue={v => v.toFixed(2)} />
        <SliderControl label="Highlight" value={config.labels_highlight} min={0} max={1} step={0.05}
          onChange={v => onChange({ labels_highlight: v })} formatValue={v => v.toFixed(2)} />

        <fieldset className="control-radio-group">
          <legend>Position scheme</legend>
          {[
            ['auto', 'Automatic'],
            ['per_stage', 'Per Stage'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="labelposition_scheme" value={val}
                checked={config.labelposition_scheme === val}
                onChange={() => onChange({ labelposition_scheme: val })} />
              {label}
            </label>
          ))}
        </fieldset>
        <SliderControl label="Auto align" value={config.labelposition_autoalign} min={-1} max={1} step={1}
          onChange={v => onChange({ labelposition_autoalign: v })}
          formatValue={v => v === -1 ? 'Before' : v === 0 ? 'Centered' : 'After'} />
        <fieldset className="control-radio-group">
          <legend>First stage</legend>
          {[
            ['before', 'Before'],
            ['after', 'After'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="labelposition_first" value={val}
                checked={config.labelposition_first === val}
                onChange={() => onChange({ labelposition_first: val })} />
              {label}
            </label>
          ))}
        </fieldset>
        <div className="control-row">
          <span className="control-row__label">Breakpoint</span>
          <input type="number" className="control-row__number" value={config.labelposition_breakpoint} min={2}
            onChange={e => onChange({ labelposition_breakpoint: Number(e.target.value) })} />
        </div>

        <div className="control-row">
          <span className="control-row__label">Prefix</span>
          <input type="text" className="control-row__text" value={config.value_prefix} maxLength={99}
            onChange={e => onChange({ value_prefix: e.target.value })} />
        </div>
        <div className="control-row">
          <span className="control-row__label">Suffix</span>
          <input type="text" className="control-row__text" value={config.value_suffix} maxLength={99}
            onChange={e => onChange({ value_suffix: e.target.value })} />
        </div>
        <fieldset className="control-radio-group">
          <legend>Number format</legend>
          {[
            [',.', '1,234.56'],
            ['.,', '1.234,56'],
            [' .', '1 234.56'],
            [' ,', '1 234,56'],
            ['X.', '1234.56'],
            ['X,', '1234,56'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="value_format" value={val}
                checked={config.value_format === val}
                onChange={() => onChange({ value_format: val })} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="control-toggle">
          <input type="checkbox" checked={config.labelvalue_fullprecision}
            onChange={e => onChange({ labelvalue_fullprecision: e.target.checked })} />
          Full precision
        </label>
      </CollapsibleSection>
    </div>
  )
}
