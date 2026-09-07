import { useMemo, useState } from 'react'
import { latestValue, macd, rsi, sliceByTimeframe, sma } from '../utils/indicators.js'

const TIMEFRAMES = ['1W', '1M', '3M', '6M', '1Y', 'ALL']

function linePath(values, xFor, yFor) {
  let path = ''
  let drawing = false
  values.forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) {
      drawing = false
      return
    }
    const command = drawing ? 'L' : 'M'
    path += `${command}${xFor(index).toFixed(2)} ${yFor(value).toFixed(2)} `
    drawing = true
  })
  return path.trim()
}

function PriceChart({ candles, showVolume, showMa20, showMa60 }) {
  const width = 920
  const priceHeight = 330
  const volumeHeight = showVolume ? 82 : 0
  const totalHeight = priceHeight + volumeHeight
  const [hoverIndex, setHoverIndex] = useState(null)

  const computed = useMemo(() => {
    const closes = candles.map((candle) => candle.close)
    const ma20 = sma(closes, 20)
    const ma60 = sma(closes, 60)
    const lows = candles.map((candle) => candle.low)
    const highs = candles.map((candle) => candle.high)
    const low = Math.min(...lows)
    const high = Math.max(...highs)
    const padding = Math.max((high - low) * 0.08, Math.abs(high) * 0.005, 0.01)
    const minPrice = low - padding
    const maxPrice = high + padding
    const maxVolume = Math.max(...candles.map((candle) => candle.volume), 1)
    return { ma20, ma60, minPrice, maxPrice, maxVolume }
  }, [candles])

  const step = width / Math.max(candles.length, 1)
  const bodyWidth = Math.max(2, Math.min(10, step * 0.62))
  const xFor = (index) => step * index + step / 2
  const yFor = (price) => {
    const range = Math.max(computed.maxPrice - computed.minPrice, 0.0001)
    return 12 + ((computed.maxPrice - price) / range) * (priceHeight - 28)
  }
  const volumeY = (volume) => priceHeight + volumeHeight - (volume / computed.maxVolume) * Math.max(volumeHeight - 8, 0)

  function handleMouseMove(event) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(bounds.width, 1)))
    setHoverIndex(Math.min(candles.length - 1, Math.floor(ratio * candles.length)))
  }

  const hovered = hoverIndex == null ? candles[candles.length - 1] : candles[hoverIndex]
  const hoverX = hoverIndex == null ? null : xFor(hoverIndex)

  return (
    <div className="chart-wrap">
      <div className="ohlc-strip">
        <span>{hovered?.date}</span>
        <span>O <strong>{hovered?.open.toFixed(2)}</strong></span>
        <span>H <strong>{hovered?.high.toFixed(2)}</strong></span>
        <span>L <strong>{hovered?.low.toFixed(2)}</strong></span>
        <span>C <strong>{hovered?.close.toFixed(2)}</strong></span>
        <span>Vol <strong>{Math.round(hovered?.volume || 0).toLocaleString()}</strong></span>
      </div>

      <svg
        className="kline-chart"
        viewBox={`0 0 ${width} ${totalHeight}`}
        role="img"
        aria-label="K線圖"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {[0.2, 0.4, 0.6, 0.8].map((ratio) => (
          <line key={ratio} x1="0" y1={priceHeight * ratio} x2={width} y2={priceHeight * ratio} className="chart-grid" />
        ))}

        {showVolume && candles.map((candle, index) => {
          const up = candle.close >= candle.open
          const y = volumeY(candle.volume)
          return (
            <rect
              key={`vol-${candle.date}`}
              x={xFor(index) - bodyWidth / 2}
              y={y}
              width={bodyWidth}
              height={Math.max(1, totalHeight - y)}
              className={up ? 'volume-up' : 'volume-down'}
            />
          )
        })}

        {candles.map((candle, index) => {
          const up = candle.close >= candle.open
          const x = xFor(index)
          const openY = yFor(candle.open)
          const closeY = yFor(candle.close)
          const highY = yFor(candle.high)
          const lowY = yFor(candle.low)
          const top = Math.min(openY, closeY)
          const height = Math.max(1.5, Math.abs(closeY - openY))
          return (
            <g key={candle.date} className={up ? 'candle-up' : 'candle-down'}>
              <line x1={x} y1={highY} x2={x} y2={lowY} className="candle-wick" />
              <rect x={x - bodyWidth / 2} y={top} width={bodyWidth} height={height} rx="1" className="candle-body" />
            </g>
          )
        })}

        {showMa20 && (
          <path d={linePath(computed.ma20, xFor, yFor)} className="ma-line ma20-line" />
        )}
        {showMa60 && (
          <path d={linePath(computed.ma60, xFor, yFor)} className="ma-line ma60-line" />
        )}

        {hoverX != null && <line x1={hoverX} y1="0" x2={hoverX} y2={totalHeight} className="crosshair" />}
      </svg>
    </div>
  )
}

function RsiChart({ candles }) {
  const width = 920
  const height = 130
  const values = useMemo(() => rsi(candles.map((candle) => candle.close), 14), [candles])
  const step = width / Math.max(values.length, 1)
  const xFor = (index) => step * index + step / 2
  const yFor = (value) => 10 + ((100 - value) / 100) * (height - 20)
  const current = latestValue(values)

  return (
    <div className="indicator-card">
      <div className="indicator-title"><span>RSI 14</span><strong>{current == null ? '—' : current.toFixed(1)}</strong></div>
      <svg className="indicator-chart" viewBox={`0 0 ${width} ${height}`} aria-label="RSI 指標">
        <line x1="0" y1={yFor(70)} x2={width} y2={yFor(70)} className="threshold-line" />
        <line x1="0" y1={yFor(30)} x2={width} y2={yFor(30)} className="threshold-line" />
        <path d={linePath(values, xFor, yFor)} className="rsi-line" />
      </svg>
    </div>
  )
}

function MacdChart({ candles }) {
  const width = 920
  const height = 150
  const result = useMemo(() => macd(candles.map((candle) => candle.close)), [candles])
  const allValues = [...result.line, ...result.signal, ...result.histogram].filter((value) => value != null && Number.isFinite(value))
  const maxAbs = Math.max(...allValues.map((value) => Math.abs(value)), 0.001)
  const step = width / Math.max(candles.length, 1)
  const xFor = (index) => step * index + step / 2
  const yFor = (value) => height / 2 - (value / maxAbs) * (height * 0.4)
  const zeroY = yFor(0)
  const current = latestValue(result.line)
  const signal = latestValue(result.signal)

  return (
    <div className="indicator-card">
      <div className="indicator-title"><span>MACD 12 / 26 / 9</span><strong>{current == null ? '—' : current.toFixed(2)} / {signal == null ? '—' : signal.toFixed(2)}</strong></div>
      <svg className="indicator-chart" viewBox={`0 0 ${width} ${height}`} aria-label="MACD 指標">
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} className="chart-grid" />
        {result.histogram.map((value, index) => {
          if (value == null) return null
          const y = yFor(value)
          return (
            <rect
              key={`macd-h-${index}`}
              x={xFor(index) - Math.max(1, step * 0.28)}
              y={Math.min(y, zeroY)}
              width={Math.max(2, step * 0.56)}
              height={Math.max(1, Math.abs(zeroY - y))}
              className={value >= 0 ? 'macd-up' : 'macd-down'}
            />
          )
        })}
        <path d={linePath(result.line, xFor, yFor)} className="macd-line" />
        <path d={linePath(result.signal, xFor, yFor)} className="signal-line" />
      </svg>
    </div>
  )
}

export default function MarketChart({ asset, timeframe, onTimeframeChange, indicatorState, onToggleIndicator }) {
  const candles = useMemo(() => sliceByTimeframe(asset.candles, timeframe), [asset, timeframe])

  return (
    <>
      <div className="chart-command-row">
        <div className="timeframe-tabs">
          {TIMEFRAMES.map((item) => (
            <button type="button" key={item} className={timeframe === item ? 'active' : ''} onClick={() => onTimeframeChange(item)}>{item}</button>
          ))}
        </div>
        <div className="indicator-toggles">
          {[
            ['ma20', 'MA20'],
            ['ma60', 'MA60'],
            ['volume', 'VOL'],
            ['rsi', 'RSI'],
            ['macd', 'MACD'],
          ].map(([key, label]) => (
            <button type="button" key={key} className={indicatorState[key] ? 'active' : ''} onClick={() => onToggleIndicator(key)}>{label}</button>
          ))}
        </div>
      </div>

      <PriceChart
        candles={candles}
        showVolume={indicatorState.volume}
        showMa20={indicatorState.ma20}
        showMa60={indicatorState.ma60}
      />
      {indicatorState.rsi && <RsiChart candles={candles} />}
      {indicatorState.macd && <MacdChart candles={candles} />}
    </>
  )
}
