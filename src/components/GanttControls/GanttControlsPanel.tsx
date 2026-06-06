import { CollapsibleSection } from '../Controls/CollapsibleSection'
import { SliderControl } from '../Controls/SliderControl'
import './GanttControls.css'

export interface GanttConfig {
  colorScheme: 'default' | 'pastel' | 'vivid' | 'mono'
  dateFormat: 'iso' | 'us' | 'eu'
  rowHeight: number
  dayWidth: number
  showToday: boolean
  showDependencies: boolean
  showGridLines: boolean
  bgTransparent: boolean
  bgColor: string
}

export const DEFAULT_GANTT_CONFIG: GanttConfig = {
  colorScheme: 'default',
  dateFormat: 'iso',
  rowHeight: 36,
  dayWidth: 40,
  showToday: true,
  showDependencies: true,
  showGridLines: true,
  bgTransparent: false,
  bgColor: '#ffffff',
}

interface GanttControlsProps {
  config: GanttConfig
  onChange: (updates: Partial<GanttConfig>) => void
}

export function GanttControlsPanel({ config, onChange }: GanttControlsProps) {
  return (
    <div className="controls-panel">
      {/* === APPEARANCE === */}
      <CollapsibleSection title="Appearance">
        <fieldset className="control-radio-group">
          <legend>Color scheme</legend>
          {[
            ['default', 'Default'],
            ['pastel', 'Pastel'],
            ['vivid', 'Vivid'],
            ['mono', 'Monochrome'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="gantt_colorscheme" value={val}
                checked={config.colorScheme === val}
                onChange={() => onChange({ colorScheme: val as GanttConfig['colorScheme'] })} />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="control-toggle">
          <input type="checkbox" checked={config.bgTransparent}
            onChange={e => onChange({ bgTransparent: e.target.checked })} />
          Transparent BG
        </label>
        {!config.bgTransparent && (
          <div className="control-color">
            <span className="control-color__label">BG Color</span>
            <input type="color" className="control-color__swatch" value={config.bgColor}
              onChange={e => onChange({ bgColor: e.target.value })} />
            <code className="control-color__hex">{config.bgColor}</code>
          </div>
        )}
      </CollapsibleSection>

      {/* === LAYOUT === */}
      <CollapsibleSection title="Layout">
        <SliderControl label="Row height" value={config.rowHeight} min={24} max={60} step={2}
          onChange={v => onChange({ rowHeight: v })} formatValue={v => `${v}px`} />
        <SliderControl label="Day width (zoom)" value={config.dayWidth} min={16} max={80} step={4}
          onChange={v => onChange({ dayWidth: v })} formatValue={v => `${v}px`} />
      </CollapsibleSection>

      {/* === DISPLAY === */}
      <CollapsibleSection title="Display">
        <label className="control-toggle">
          <input type="checkbox" checked={config.showToday}
            onChange={e => onChange({ showToday: e.target.checked })} />
          Show today marker
        </label>
        <label className="control-toggle">
          <input type="checkbox" checked={config.showDependencies}
            onChange={e => onChange({ showDependencies: e.target.checked })} />
          Show dependency arrows
        </label>
        <label className="control-toggle">
          <input type="checkbox" checked={config.showGridLines}
            onChange={e => onChange({ showGridLines: e.target.checked })} />
          Show grid lines
        </label>
      </CollapsibleSection>

      {/* === DATE FORMAT === */}
      <CollapsibleSection title="Date Format" defaultOpen={false}>
        <fieldset className="control-radio-group">
          <legend>Format</legend>
          {[
            ['iso', 'YYYY-MM-DD'],
            ['us', 'MM/DD/YYYY'],
            ['eu', 'DD.MM.YYYY'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="gantt_dateformat" value={val}
                checked={config.dateFormat === val}
                onChange={() => onChange({ dateFormat: val as GanttConfig['dateFormat'] })} />
              {label}
            </label>
          ))}
        </fieldset>
      </CollapsibleSection>
    </div>
  )
}
