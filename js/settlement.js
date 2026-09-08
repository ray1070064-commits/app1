import { escapeHtml, formatMoney } from './ui.js';

function metric(label, value, extraClass = '') {
  return `<div class="metric-card ${extraClass}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function scoreCard(name, score) {
  const value = Number(score || 0);
  return `<article class="settlement-score-card"><span>${escapeHtml(name)}</span><strong>${value.toFixed(1)}</strong><div class="settlement-score-bar"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div></article>`;
}

export function renderNativeSettlement(state) {
  const panel = state.ui.settlementPanel;
  if (!panel?.available) {
    return `<div class="page-header"><div><h1 class="page-title">人生結算</h1><div class="page-subtitle">正在由私有後端計算最終評級…</div></div></div><div class="empty-state panel">結算資料載入中。</div>`;
  }

  const scores = panel.scores || {};
  const top = Array.isArray(panel.top_dimensions) ? panel.top_dimensions : [];
  const weak = Array.isArray(panel.weak_dimensions) ? panel.weak_dimensions : [];
  const reason = String(panel.reason || '');

  return `
    <div class="settlement-hero">
      <div>
        <div class="settlement-kicker">CAPITAL LIFE · FINAL REPORT</div>
        <h1>${escapeHtml(panel.final_title || '人生結算')}</h1>
        <p>${reason ? escapeHtml(reason) : '這段人生已完成，以下為最終結算。'}</p>
      </div>
      <div class="settlement-grade">
        <span>最終評級</span>
        <strong>${escapeHtml(panel.grade || '—')}</strong>
        <em>${Number(panel.total_score || 0).toFixed(1)} / 100</em>
      </div>
    </div>

    <section class="panel settlement-summary">
      <div class="panel-header">人生總覽</div>
      <div class="panel-body">
        <div class="metric-grid settlement-metrics">
          ${metric('起始資金', formatMoney(panel.initial_balance))}
          ${metric('最終總資產', formatMoney(panel.total_equity), Number(panel.net_pnl || 0) >= 0 ? 'is-positive' : 'is-negative')}
          ${metric('淨損益', formatMoney(panel.net_pnl), Number(panel.net_pnl || 0) >= 0 ? 'is-positive' : 'is-negative')}
          ${metric('ROI', `${Number(panel.roi || 0) >= 0 ? '+' : ''}${Number(panel.roi || 0).toFixed(2)}%`, Number(panel.roi || 0) >= 0 ? 'is-positive' : 'is-negative')}
          ${metric('最大回撤 MDD', `${Number(panel.mdd || 0).toFixed(2)}%`)}
          ${metric('房車資產估值', formatMoney(panel.property_value))}
          ${metric('遊戲日', `Day ${Number(panel.day || 0).toLocaleString()}`)}
          ${metric('人生年齡', `${Number(panel.start_age || 0).toFixed(0)} → ${Number(panel.final_age || 0).toFixed(1)} 歲`)}
        </div>
      </div>
    </section>

    <div class="content-grid two settlement-route-grid">
      <section class="panel">
        <div class="panel-header">主導人生路線</div>
        <div class="panel-body settlement-route">
          <strong>${escapeHtml(panel.dominant_route || '—')}</strong>
          <p>最終路線由舊 Python 多維評級核心依實際人生結果決定。</p>
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">強項／弱項</div>
        <div class="panel-body">
          <div class="settlement-dim-list"><span>前三強項</span><strong>${escapeHtml(top.map(x => `${x.name} ${Number(x.score || 0).toFixed(0)}`).join('、') || '—')}</strong></div>
          <div class="settlement-dim-list"><span>待改善</span><strong>${escapeHtml(weak.map(x => `${x.name} ${Number(x.score || 0).toFixed(0)}`).join('、') || '—')}</strong></div>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-header">13 維人生評分</div>
      <div class="panel-body settlement-score-grid">
        ${Object.entries(scores).map(([name, score]) => scoreCard(name, score)).join('')}
      </div>
    </section>

    <section class="settlement-footer-actions">
      <div>
        <strong>這局已完成</strong>
        <span>重新開始會回到新遊戲設定頁；舊局仍可由瀏覽器加密存檔保留。</span>
      </div>
      <button class="button primary settlement-restart" data-settlement-restart ${state.connected ? '' : 'disabled'}>重新開始新人生</button>
    </section>`;
}
