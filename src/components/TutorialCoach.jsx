import { useCallback, useEffect, useMemo, useState } from 'react'
import { featureAction, getFeatureState } from '../api/client.js'

const ACTION_GATED = new Set([2, 4, 6])

export default function TutorialCoach({ mode, onGoLife }) {
  const [tutorial, setTutorial] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const result = await getFeatureState()
      setTutorial(result?.tutorial || null)
    } catch (cause) {
      setError(cause.message || '教學狀態載入失敗')
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    let alive = true
    const timer = window.setInterval(() => { if (alive) load() }, 1400)
    return () => { alive = false; window.clearInterval(timer) }
  }, [load])

  useEffect(() => {
    if (!tutorial?.active || busy) return
    featureAction('tutorial_sync', { mode }).then((result) => {
      if (result?.features?.tutorial) setTutorial(result.features.tutorial)
    }).catch(() => {})
  }, [mode])

  async function run(action, payload = {}) {
    setBusy(true); setError('')
    try {
      const result = await featureAction(action, payload)
      if (result?.ok === false) throw new Error(result.message || '教學操作失敗')
      setTutorial(result?.features?.tutorial || null)
    } catch (cause) {
      setError(cause.message || '教學操作失敗')
    } finally {
      setBusy(false)
    }
  }

  const step = Number(tutorial?.step || 0)
  const content = tutorial?.content || {}
  const percent = useMemo(() => Math.max(0, Math.min(100, Number(tutorial?.progress || 0) * 100)), [tutorial?.progress])

  if (!tutorial?.active || tutorial?.completed) return null

  function primaryAction() {
    if (step === 6) {
      onGoLife?.()
      window.setTimeout(() => run('tutorial_sync', { mode: 'life' }), 0)
      return
    }
    if (ACTION_GATED.has(step)) {
      load()
      return
    }
    run('tutorial_advance')
  }

  const actionLabel = step === 2
    ? '已完成交易，重新檢查'
    : step === 4
      ? '已推進 1 日，重新檢查'
      : content.action || '下一步'

  return <aside className="tutorial-coach" aria-live="polite">
    <div className="tutorial-head">
      <div><span>NEW PLAYER · {Math.min(step + 1, 7)}/7</span><strong>{content.title || '新手教學'}</strong></div>
      <button type="button" disabled={busy} onClick={() => run('tutorial_skip')}>略過</button>
    </div>
    <div className="tutorial-progress"><i style={{ width: `${percent}%` }} /></div>
    <p>{content.body}</p>
    <div className="tutorial-goal"><span>目前目標</span><strong>{content.goal || '熟悉資本人生'}</strong></div>
    {error && <div className="tutorial-error">{error}</div>}
    <div className="tutorial-actions">
      <button type="button" className="tutorial-secondary" disabled={busy} onClick={load}>重新檢查</button>
      <button type="button" className="tutorial-primary" disabled={busy} onClick={primaryAction}>{actionLabel}</button>
    </div>
  </aside>
}
