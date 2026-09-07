import { useState } from 'react'
import {
  clearBrowserSave,
  exportSave,
  getBrowserSaveMeta,
  lifeAction,
  restoreSaveCode,
  saveCurrentGameToBrowser,
} from '../../api/client.js'
import { ActionButton, Section, money } from './P1Ui.jsx'

const POLICY_LABELS = { pause: '遇到決策就暫停', safe: '保守自動處理', ignore: '自動忽略' }

export function LifeStoryPanel({ life, busy, run }) {
  const pending = life.pendingEvent
  return <div className="life-stack">
    {pending ? <Section title={pending.title || '人生抉擇'}>
      <p className="life-copy">{pending.desc}</p>
      <div className="deep-chip-row"><span>產生 Day {pending.generated_day || pending.generatedDay || '—'}</span><span>期限 Day {pending.deadline_day || pending.deadlineDay || '—'}</span>{pending.followup && <span>後續事件</span>}{pending.named_chain && <span>故事鏈 {pending.named_chain}</span>}</div>
      <div className="choice-grid">{(pending.choices || []).map((choice, index) => <button type="button" className="choice-card" disabled={busy} key={`${choice.label}-${index}`} onClick={() => run(lifeAction, 'resolve', { choiceIndex: index })}><strong>{choice.label}</strong><span>{choice.result || ''}</span><small>現金 {money(choice.cash || 0)}｜健康 {Number(choice.health || 0) >= 0 ? '+' : ''}{choice.health || 0}｜壓力 {Number(choice.stress || 0) >= 0 ? '+' : ''}{choice.stress || 0}｜XP {choice.xp || 0}</small></button>)}</div>
    </Section> : <Section title="人生事件"><div className="empty-state">目前沒有待處理事件；市場與人生仍會隨時間累積故事。</div></Section>}

    <Section title="事件處理方式">
      <div className="deep-note">目前一般人生事件：<strong>{POLICY_LABELS[life.autoPolicy] || life.autoPolicy || '遇到決策就暫停'}</strong>｜保留現金 {money(life.cashReserve)}。為避免攸關時間推進的設定散落各頁，修改方式已統一移到畫面上方的「⚙ 安全／自動化」。</div>
    </Section>

    <Section title="長期人生記憶"><div className="record-list">{life.memories?.length ? life.memories.map((memory) => <div className="record-row" key={memory.key}><div><strong>{memory.label}</strong><span>{memory.status === 'active' ? '延續中' : '已完成'}・Stage {memory.stage}</span></div><p>{memory.summary}</p><small>開始 Day {memory.startedDay}・最近 Day {memory.lastDay}</small></div>) : <div className="empty-state">故事還在累積</div>}</div></Section>
    <Section title="人生選擇時間線"><div className="record-list">{(life.history || []).slice().reverse().map((row, index) => <div className="record-row" key={`${row.day}-${index}`}><div><strong>Day {row.day}・{row.title}</strong><span>{row.choice}</span></div><p>{row.result}</p></div>)}{!life.history?.length && <div className="empty-state">尚無重大人生選擇</div>}</div></Section>
  </div>
}

export function SavePanel({ onRestored, busy, setBusy, setNotice }) {
  const [meta, setMeta] = useState(() => getBrowserSaveMeta())
  const [code, setCode] = useState('')
  const [exported, setExported] = useState('')

  async function saveNow() {
    setBusy(true)
    try { const result = await saveCurrentGameToBrowser(); setMeta(result?.preview || getBrowserSaveMeta()); setExported(result?.code || ''); setNotice('已保存到這個瀏覽器') }
    catch (error) { setNotice(error.message || '存檔失敗') }
    finally { setBusy(false) }
  }
  async function exportNow() {
    setBusy(true)
    try { const result = await exportSave(); setExported(result.code || ''); setNotice('已產生可攜式存檔碼') }
    catch (error) { setNotice(error.message || '匯出失敗') }
    finally { setBusy(false) }
  }
  async function restore() {
    setBusy(true)
    try { const result = await restoreSaveCode(code.trim()); onRestored(result); setMeta(getBrowserSaveMeta()); setNotice('存檔已恢復') }
    catch (error) { setNotice(error.message || '恢復失敗') }
    finally { setBusy(false) }
  }

  return <div className="life-stack">
    <Section title="瀏覽器存檔" actions={<div className="life-action-row"><ActionButton disabled={busy} onClick={saveNow}>立即保存</ActionButton><ActionButton disabled={busy} onClick={exportNow}>匯出</ActionButton></div>}>
      {meta ? <div className="save-preview"><strong>Day {meta.day}</strong><span>{Number(meta.age || 0).toFixed(1)} 歲</span><span>{meta.jobId}</span><span>{money(meta.cash)}</span></div> : <div className="empty-state">尚未在這個瀏覽器保存</div>}
      <button type="button" className="text-danger" onClick={() => { clearBrowserSave(); setMeta(null) }}>清除瀏覽器存檔</button>
    </Section>
    {exported && <Section title="可攜式存檔碼"><textarea className="save-code" readOnly value={exported} /></Section>}
    <Section title="匯入存檔碼"><textarea className="save-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="貼上 CL181... 或舊 LCMG:... 存檔碼" /><ActionButton disabled={busy || !code.trim()} onClick={restore}>恢復這段人生</ActionButton></Section>
  </div>
}
