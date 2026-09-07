import { useEffect, useMemo, useState } from 'react'
import { featureAction, getFeatureState } from '../api/client.js'

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0))
}

const POLICY_LABELS = {
  pause: '遇到決策就暫停，等我處理',
  safe: '保守自動處理後繼續',
  ignore: '自動忽略後繼續',
}

export default function SafetyAutomationCenter({ open, onClose }) {
  const [data, setData] = useState(null)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  async function load() {
    try {
      const result = await getFeatureState()
      setData(result)
      const s = result?.safety || {}
      setDraft({
        emergencyMedical: Boolean(s.emergencyMedical ?? true),
        autoMedical: Boolean(s.autoMedical),
        healthThreshold: Number(s.autoHealthThreshold ?? 45),
        stressThreshold: Number(s.autoStressThreshold ?? 82),
        normalDecisionPolicy: s.normalDecisionPolicy || 'pause',
        longAdvancePolicy: s.longAdvancePolicy || 'safe',
        cashReserve: Number(s.cashReserve || 0),
      })
    } catch (error) {
      setNotice(error.message || '安全設定載入失敗')
    }
  }

  useEffect(() => { if (open) load() }, [open])

  const activePlans = useMemo(() => Object.entries(data?.marketTools?.dcaPlans || {})
    .filter(([, plan]) => plan?.enabled !== false), [data])

  async function save(nextDraft = draft) {
    if (!nextDraft) return
    setBusy(true); setNotice('')
    try {
      const result = await featureAction('set_safety_settings', nextDraft)
      if (!result?.ok) throw new Error(result?.message || '儲存失敗')
      setData(result.features || data)
      const s = result.features?.safety || {}
      setDraft({
        emergencyMedical: Boolean(s.emergencyMedical), autoMedical: Boolean(s.autoMedical),
        healthThreshold: Number(s.autoHealthThreshold), stressThreshold: Number(s.autoStressThreshold),
        normalDecisionPolicy: s.normalDecisionPolicy || 'pause', longAdvancePolicy: s.longAdvancePolicy || 'safe',
        cashReserve: Number(s.cashReserve || 0),
      })
      setNotice('安全／自動化設定已儲存')
    } catch (error) { setNotice(error.message || '儲存失敗') }
    finally { setBusy(false) }
  }

  async function stopDca(symbol) {
    setBusy(true); setNotice('')
    try {
      const result = await featureAction('stop_dca', { symbol })
      if (!result?.ok) throw new Error(result?.message || '停止失敗')
      setData(result.features || data)
      setNotice(`${symbol} DCA 已停止`)
    } catch (error) { setNotice(error.message || '停止失敗') }
    finally { setBusy(false) }
  }

  function applyPreset(type) {
    const presets = {
      recommended: { emergencyMedical: true, autoMedical: true, healthThreshold: 45, stressThreshold: 82, normalDecisionPolicy: 'pause', longAdvancePolicy: 'safe', cashReserve: 10000 },
      manual: { emergencyMedical: true, autoMedical: false, healthThreshold: 45, stressThreshold: 82, normalDecisionPolicy: 'pause', longAdvancePolicy: 'pause', cashReserve: 0 },
      auto: { emergencyMedical: true, autoMedical: true, healthThreshold: 55, stressThreshold: 75, normalDecisionPolicy: 'safe', longAdvancePolicy: 'safe', cashReserve: 25000 },
    }
    const next = presets[type]
    setDraft(next)
    save(next)
  }

  if (!open) return null
  const safety = data?.safety || {}

  return <div className="safety-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <section className="safety-modal" role="dialog" aria-modal="true" aria-label="安全與自動化中心">
      <header><div><span>SAFETY & AUTOMATION</span><h2>安全／自動化中心</h2><p>會影響生死與時間推進的選項集中在這裡，不必再到不同頁面找。</p></div><button type="button" className="ghost-button" onClick={onClose}>關閉</button></header>

      <div className="safety-presets">
        <button type="button" disabled={busy} onClick={() => applyPreset('recommended')}><strong>推薦</strong><span>生命保護＋自動就醫；一般決策手動，半年／一年保守自動</span></button>
        <button type="button" disabled={busy} onClick={() => applyPreset('manual')}><strong>手動優先</strong><span>生命保護保留；事件與長快轉遇決策都暫停</span></button>
        <button type="button" disabled={busy} onClick={() => applyPreset('auto')}><strong>自動保守</strong><span>較早就醫，事件與快轉都採保守自動處理</span></button>
      </div>

      {!draft ? <div className="empty-state">載入安全設定…</div> : <div className="safety-grid">
        <section className="safety-card critical">
          <div className="safety-card-title"><div><strong>生命保護</strong><span>最高優先級</span></div><b>{draft.emergencyMedical ? 'ON' : 'OFF'}</b></div>
          <label className="toggle-row"><span>危急時自動緊急治療／休養</span><input type="checkbox" checked={draft.emergencyMedical} onChange={(e) => setDraft({ ...draft, emergencyMedical: e.target.checked })} /></label>
          <p>健康 ≤10 或壓力 ≥95 時，只要現金足夠就會自動救命。即使一般自動就醫關閉，生命保護仍可獨立運作。</p>
          <div className="safety-status-row"><span>目前健康 <strong>{Number(safety.health ?? data?.health?.health ?? 0).toFixed(0)}</strong></span><span>壓力 <strong>{Number(safety.stress ?? data?.health?.stress ?? 0).toFixed(0)}</strong></span><span>現金 <strong>{money(safety.cash ?? data?.account?.cash)}</strong></span></div>
          <small>緊急介入 {Number(safety.emergencyMedicalCount || 0)} 次・累計 {money(safety.emergencyMedicalSpent || 0)}</small>
        </section>

        <section className="safety-card">
          <div className="safety-card-title"><div><strong>一般自動就醫</strong><span>提前介入，避免走到危急值</span></div><b>{draft.autoMedical ? 'ON' : 'OFF'}</b></div>
          <label className="toggle-row"><span>啟用自動就醫／自動休養</span><input type="checkbox" checked={draft.autoMedical} onChange={(e) => setDraft({ ...draft, autoMedical: e.target.checked })} /></label>
          <div className="form-grid two"><label><span>健康低於</span><input type="number" min="10" max="90" value={draft.healthThreshold} onChange={(e) => setDraft({ ...draft, healthThreshold: Number(e.target.value) })} /></label><label><span>壓力高於</span><input type="number" min="40" max="99" value={draft.stressThreshold} onChange={(e) => setDraft({ ...draft, stressThreshold: Number(e.target.value) })} /></label></div>
          <p>自動健康治療 $3,000；自動休養 $2,000。現金不足時不會憑空治療。</p>
        </section>

        <section className="safety-card wide">
          <div className="safety-card-title"><div><strong>時間推進／決策處理</strong><span>明確決定「停」還是「繼續」</span></div></div>
          <div className="form-grid two">
            <label><span>一般人生事件</span><select value={draft.normalDecisionPolicy} onChange={(e) => setDraft({ ...draft, normalDecisionPolicy: e.target.value })}>{Object.entries(POLICY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label><span>+半年／+1 年遇到人生／公司決策</span><select value={draft.longAdvancePolicy} onChange={(e) => setDraft({ ...draft, longAdvancePolicy: e.target.value })}>{Object.entries(POLICY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          </div>
          <label><span>保守自動處理時最低現金保留</span><input type="number" min="0" step="1000" value={draft.cashReserve} onChange={(e) => setDraft({ ...draft, cashReserve: Number(e.target.value) })} /></label>
          <div className="safety-explain"><span><b>暫停</b>：保留事件，時間停在決策點。</span><span><b>保守自動</b>：系統選風險較低方案後繼續。</span><span><b>忽略</b>：優先選「忽略」並繼續。</span></div>
        </section>

        <section className="safety-card wide">
          <div className="safety-card-title"><div><strong>DCA 自動投資總表</strong><span>不必切換每個標的逐一尋找</span></div><b>{activePlans.length} 個</b></div>
          {activePlans.length ? <div className="safety-dca-list">{activePlans.map(([symbol, plan]) => <div key={symbol}><div><strong>{symbol}</strong><span>{money(plan.amount)}／每 {Number(plan.frequency || 30)} 天・下次 Day {Number(plan.next_day ?? plan.nextDay ?? 0)}</span></div><button type="button" disabled={busy} onClick={() => stopDca(symbol)}>停止</button></div>)}</div> : <div className="tool-empty">目前沒有啟用中的 DCA 計畫。</div>}
        </section>
      </div>}

      {(safety.warnings || []).length > 0 && <div className="safety-warnings">{safety.warnings.map((row, index) => <span key={index}>⚠ {row}</span>)}</div>}
      {notice && <div className="life-notice">{notice}</div>}
      <footer><button type="button" className="primary-button" disabled={busy || !draft} onClick={() => save()}>儲存全部安全設定</button></footer>
    </section>
  </div>
}
