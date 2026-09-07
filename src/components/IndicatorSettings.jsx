function clampNumber(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

export default function IndicatorSettings({ config, onChange }) {
  function patch(key, value, min, max) {
    onChange({ ...config, [key]: clampNumber(value, min, max, config[key]) })
  }

  return (
    <details className="indicator-settings">
      <summary>指標參數</summary>
      <div className="indicator-settings-grid">
        <label><span>MA 1</span><input type="number" min="2" max="400" value={config.ma1} onChange={(e) => patch('ma1', e.target.value, 2, 400)} /></label>
        <label><span>MA 2</span><input type="number" min="2" max="400" value={config.ma2} onChange={(e) => patch('ma2', e.target.value, 2, 400)} /></label>
        <label><span>MA 3</span><input type="number" min="2" max="400" value={config.ma3} onChange={(e) => patch('ma3', e.target.value, 2, 400)} /></label>
        <label><span>RSI</span><input type="number" min="2" max="100" value={config.rsiPeriod} onChange={(e) => patch('rsiPeriod', e.target.value, 2, 100)} /></label>
        <label><span>MACD Fast</span><input type="number" min="2" max="100" value={config.macdFast} onChange={(e) => patch('macdFast', e.target.value, 2, 100)} /></label>
        <label><span>MACD Slow</span><input type="number" min={config.macdFast + 1} max="200" value={config.macdSlow} onChange={(e) => patch('macdSlow', Math.max(Number(e.target.value), config.macdFast + 1), config.macdFast + 1, 200)} /></label>
        <label><span>Signal</span><input type="number" min="2" max="100" value={config.macdSignal} onChange={(e) => patch('macdSignal', e.target.value, 2, 100)} /></label>
      </div>
    </details>
  )
}
