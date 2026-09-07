import { useEffect, useState } from 'react'
import { getMarketSnapshot } from '../api/client.js'

export default function MarketMacroStatus({ active }) {
  const [macro, setMacro] = useState(null)
  useEffect(() => {
    if (!active) return undefined
    let alive = true
    async function load() {
      try { const result = await getMarketSnapshot(); if (alive) setMacro(result?.macro || null) } catch { /* main market will surface API errors */ }
    }
    load()
    const timer = window.setInterval(load, 5000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [active])
  if (!active || !macro) return null
  return <div className="p2-macro-extra" aria-label="額外總經資訊">
    <span><small>失業率</small><strong>{Number(macro.unemployment || 0).toFixed(2)}%</strong></span>
    <span><small>市場不確定性</small><strong>{Number(macro.uncertainty || 0).toFixed(1)}</strong></span>
  </div>
}
