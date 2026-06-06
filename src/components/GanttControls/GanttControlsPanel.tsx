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
  timelineUnit: 'day' | 'month' | 'quarter' | 'halfyear' | 'year'
  fyStartMonth: number  // 1-12, default 4 (April for UK)
  fyLabelType: 'fy' | 'full' | 'both'
  exportWidth: number
  exportHeight: number
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
  timelineUnit: 'month',
  fyStartMonth: 4,
  fyLabelType: 'fy',
  exportWidth: 1920,
  exportHeight: 1080,
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

      {/* === TIMELINE === */}
      <CollapsibleSection title="Timeline">
        <fieldset className="control-radio-group">
          <legend>Timeline unit</legend>
          {[
            ['day', 'Day'],
            ['month', 'Month'],
            ['quarter', 'Quarter'],
            ['halfyear', 'Half-Year'],
            ['year', 'Year'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="gantt_timeline_unit" value={val}
                checked={config.timelineUnit === val}
                onChange={() => onChange({ timelineUnit: val as GanttConfig['timelineUnit'] })} />
              {label}
            </label>
          ))}
        </fieldset>

        <label className="control-select">
          <span className="control-select__label">FY start month</span>
          <select value={config.fyStartMonth}
            onChange={e => onChange({ fyStartMonth: Number(e.target.value) })}>
            {[
              [1, 'January'], [2, 'February'], [3, 'March'], [4, 'April'],
              [5, 'May'], [6, 'June'], [7, 'July'], [8, 'August'],
              [9, 'September'], [10, 'October'], [11, 'November'], [12, 'December'],
            ].map(([val, name]) => (
              <option key={val} value={val}>{name}</option>
            ))}
          </select>
        </label>

        <fieldset className="control-radio-group">
          <legend>FY label format</legend>
          {[
            ['fy', 'FY27 Q1'],
            ['full', 'Apr-Jun 2026'],
            ['both', 'FY27 Q1 (Apr-Jun)'],
          ].map(([val, label]) => (
            <label key={val} className="control-radio">
              <input type="radio" name="gantt_fy_label" value={val}
                checked={config.fyLabelType === val}
                onChange={() => onChange({ fyLabelType: val as GanttConfig['fyLabelType'] })} />
              {label}
            </label>
          ))}
        </fieldset>
      </CollapsibleSection>

      {/* === EXPORT SIZE === */}
      <CollapsibleSection title="Export Size" defaultOpen={false}>
        <label className="control-input">
          <span className="control-input__label">Width (px)</span>
          <input type="number" className="control-input__field"
            min={320} max={7680} step={10}
            value={config.exportWidth}
            onChange={e => onChange({ exportWidth: Math.max(320, Number(e.target.value) || 1920) })} />
        </label>
        <label className="control-input">
          <span className="control-input__label">Height (px)</span>
          <input type="number" className="control-input__field"
            min={240} max={4320} step={10}
            value={config.exportHeight}
            onChange={e => onChange({ exportHeight: Math.max(240, Number(e.target.value) || 1080) })} />
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
