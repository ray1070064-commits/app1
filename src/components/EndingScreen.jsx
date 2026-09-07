function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0))
}

export default function EndingScreen({ features, onExit }) {
  const ending = features?.ending || features?.progress?.retirement || {}
  const components = Object.entries(ending.components || {})
  const death = ending.endType === 'death'

  return <main className={`ending-screen ${death ? 'death' : 'retirement'}`}>
    <section className="ending-card">
      <div className="ending-kicker">{death ? 'LIFE ENDED' : 'LIFE COMPLETE'}</div>
      <div className="ending-hero">
        <div className="ending-grade">{ending.grade || '—'}</div>
        <div><h1>{ending.finalTitle || (death ? '這段人生結束了' : '人生結算')}</h1><p>{ending.endReason || '這段人生已經走到終點。'}</p><span>{Number(ending.score || 0).toFixed(2)} 分・主導路線「{ending.dominantRoute || '人生'}」</span></div>
      </div>

      <div className="ending-metrics">
        <div><span>最終權益</span><strong>{money(ending.equity)}</strong></div>
        <div><span>ROI</span><strong>{Number(ending.roi || 0).toFixed(2)}%</strong></div>
        <div><span>最大回撤</span><strong>{Number(ending.maxDrawdown || 0).toFixed(2)}%</strong></div>
        <div><span>人生時間</span><strong>Day {ending.day || 1}・{Number(ending.age || 0).toFixed(1)} 歲</strong></div>
      </div>

      {ending.retirementRoute && <div className="ending-route">退休路線：<strong>{ending.retirementRoute}</strong>{ending.successorName ? `・接班人 ${ending.successorName}` : ''}</div>}

      <section className="ending-dimensions">
        <div className="ending-section-title"><h2>13 維人生評分</h2><span>完整結算，不論退休或死亡都會留下紀錄</span></div>
        <div className="ending-score-grid">{components.map(([key, value]) => <div key={key}><div><span>{key}</span><strong>{Number(value || 0).toFixed(1)}</strong></div><div><i style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }} /></div></div>)}</div>
      </section>

      <div className="ending-rank-row">
        <div><span>最強三項</span><strong>{(ending.topDimensions || []).map((x) => x[0]).join('・') || '—'}</strong></div>
        <div><span>最弱三項</span><strong>{(ending.weakDimensions || []).map((x) => x[0]).join('・') || '—'}</strong></div>
      </div>

      <footer><button type="button" className="primary-button" onClick={onExit}>返回主選單</button></footer>
    </section>
  </main>
}
