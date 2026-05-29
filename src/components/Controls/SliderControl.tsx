interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}

export function SliderControl({
  label, value, min, max, step = 1,
  onChange, formatValue,
}: SliderControlProps) {
  return (
    <div className="slider-control">
      <label className="slider-control__label">{label}</label>
      <div className="slider-control__row">
        <input
          type="range"
          className="slider-control__input"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
        <output className="slider-control__value">
          {formatValue ? formatValue(value) : value}
        </output>
      </div>
    </div>
  )
}
