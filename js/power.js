import { escapeHtml, formatMoney, formatPercent } from './ui.js';

function disabled(can) {
  return can ? '' : 'disabled';
}

function metric(label, value) {
  return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function optionRows(rows = []) {
  return rows.map(row => `<option value="${escapeHtml(row.key)}">${escapeHtml(row.name)}</option>`).join('');
}

function symbolOptions(rows = []) {
  return rows.map(row => `<option value="${escapeHtml(row.symbol)}">${escapeHtml(row.name)} (${escapeHtml(row.symbol)})</option>`).join('');
}

function politics(panel, connected) {
  const p = panel.politics || {};
  const training = p.training;
  const next = p.next_training;
  const lobby = p.lobby || {};
  const campaign = p.campaign || {};
  return `<section class="panel power-card">
    <div class="panel-header">政治影響力</div>
    <div class="panel-body">
      <div class="metric-grid power-metrics">
        ${metric('政治等級', p.level_name || `Lv.${p.level || 0}`)}
        ${metric('影響力', `${Number(p.influence || 0).toFixed(0)}/100`)}
        ${metric('政治信任', `${Number(p.trust || 0).toFixed(0)}/100`)}
        ${metric('累計公開投入', formatMoney(p.donations_total))}
      </div>
      <div class="power-callout"><strong>${escapeHtml(p.government?.name || '中立')}</strong><span>${escapeHtml(p.government?.description || '')}</span></div>

      <div class="power-subgrid">
        <article class="power-action-block">
          <h3>政治訓練</h3>
          ${training ? `<p>訓練中｜目標 Lv.${escapeHtml(training.target_level)}｜剩餘 ${escapeHtml(training.remaining_days)} 天</p>` : next ? `<p>${escapeHtml(next.course_name)}｜${escapeHtml(formatMoney(next.cost))}｜${escapeHtml(next.days)} 天</p><button class="button primary full" data-power-action="politics_start_training" ${disabled(connected && next.can_start)}>開始訓練</button>` : '<p class="muted">已達最高等級。</p>'}
        </article>

        <article class="power-action-block">
          <h3>公開政策倡議</h3>
          <p>90 天累計投入 ${escapeHtml(formatMoney(p.recent_90d_donations))}｜冷卻 ${escapeHtml(campaign.cooldown_days || 0)} 天</p>
          <div class="form-grid two">
            <select id="politics-direction" class="select">${optionRows(p.directions || [])}</select>
            <input id="politics-campaign-amount" class="input" type="number" min="1000" step="5000" value="10000">
          </div>
          <button class="button primary full" data-power-action="politics_campaign" ${disabled(connected && campaign.enabled && Number(campaign.cooldown_days || 0) === 0)}>送出倡議</button>
        </article>

        <article class="power-action-block">
          <h3>市場關說</h3>
          <p>成本 ${escapeHtml(formatMoney(lobby.cash_cost))}｜影響力 ${escapeHtml(lobby.influence_cost || 0)}｜冷卻 ${escapeHtml(lobby.cooldown_days || 0)} 天</p>
          <select id="politics-lobby-symbol" class="select">${symbolOptions(lobby.symbols || [])}</select>
          <button class="button danger full" data-power-action="politics_lobby" ${disabled(connected && Number(p.level || 0) > 0 && Number(lobby.cooldown_days || 0) === 0 && (lobby.symbols || []).length > 0)}>執行</button>
        </article>
      </div>
    </div>
  </section>`;
}

function underworld(panel, connected) {
  const u = panel.underworld || {};
  const training = u.training;
  const next = u.next_training;
  const smear = u.smear || {};
  const black = u.black_politics || {};
  const range = Array.isArray(u.income_range) ? `${formatMoney(u.income_range[0])}～${formatMoney(u.income_range[1])}` : '—';
  return `<section class="panel power-card">
    <div class="panel-header">地下勢力</div>
    <div class="panel-body">
      <div class="metric-grid power-metrics">
        ${metric('地下等級', u.rank_name || `Lv.${u.rank || 0}`)}
        ${metric('地下資金', formatMoney(u.dirty_money))}
        ${metric('累計取得', formatMoney(u.total_earned))}
        ${metric('累計轉出', formatMoney(u.total_converted))}
        ${metric('累計沒收', formatMoney(u.total_seized))}
        ${metric('下次結算', `${Number(u.next_income_days || 0)} 天`)}
      </div>
      <div class="power-callout"><strong>週期結算</strong><span>${escapeHtml(range)}｜基礎管理成本 ${escapeHtml(formatPercent(Number(u.base_overhead_rate || 0) * 100))}</span></div>
      <div class="power-subgrid">
        <article class="power-action-block"><h3>勢力訓練</h3>${training ? `<p>訓練中｜目標 Lv.${escapeHtml(training.target_level)}｜剩餘 ${escapeHtml(training.remaining_days)} 天</p>` : next ? `<p>${escapeHtml(next.course_name)}｜${escapeHtml(formatMoney(next.cost))}｜${escapeHtml(next.days)} 天</p><button class="button full" data-power-action="underworld_start_training" ${disabled(connected && next.can_start)}>開始訓練</button>` : '<p class="muted">已達最高等級。</p>'}</article>
        <article class="power-action-block"><h3>自動營運</h3><label class="field power-toggle"><input id="underworld-paused" type="checkbox" ${u.paused ? 'checked' : ''}><span>暫停地下週期收入</span></label><button class="button full" data-power-action="underworld_set_paused" ${disabled(connected)}>儲存</button></article>
        <article class="power-action-block"><h3>市場黑函</h3><p>成本 ${escapeHtml(formatMoney(smear.cost))}｜冷卻 ${escapeHtml(smear.cooldown_days || 0)} 天</p><select id="underworld-smear-symbol" class="select">${symbolOptions(smear.symbols || [])}</select><button class="button danger full" data-power-action="underworld_smear" ${disabled(connected && Number(u.rank || 0) > 0 && Number(smear.cooldown_days || 0) === 0 && (smear.symbols || []).length > 0)}>執行</button></article>
        <article class="power-action-block"><h3>地下政治介入</h3><p>Lv.2 解鎖｜冷卻 ${escapeHtml(black.cooldown_days || 0)} 天</p><div class="form-grid two"><select id="underworld-black-direction" class="select">${optionRows(panel.politics?.directions || [])}</select><input id="underworld-black-amount" class="input" type="number" min="5000" step="5000" value="15000"></div><button class="button danger full" data-power-action="underworld_black_politics" ${disabled(connected && black.enabled && Number(black.cooldown_days || 0) === 0)}>執行</button></article>
        <article class="power-action-block"><h3>地下資金轉出</h3><p>實際費用與是否遭查獲由後端當次判定。</p><input id="underworld-convert-amount" class="input" type="number" min="500" step="500" value="5000"><button class="button danger full" data-power-action="underworld_convert_dirty_money" ${disabled(connected && Number(u.dirty_money || 0) >= 500)}>執行</button></article>
      </div>
      ${(u.ledger || []).length ? `<div class="power-ledger">${(u.ledger || []).slice().reverse().map(row => `<div><strong>Day ${escapeHtml(row.day)}</strong><span>${escapeHtml(row.type)}｜${escapeHtml(formatMoney(row.net))}</span></div>`).join('')}</div>` : ''}
    </div>
  </section>`;
}

function insider(panel, connected) {
  const i = panel.insider || {};
  const sources = i.sources || [];
  const tip = i.tip;
  const position = i.position;
  return `<section class="panel power-card">
    <div class="panel-header">非公開消息</div>
    <div class="panel-body">
      ${sources.length ? `<div class="power-source-grid">${sources.map((row, index) => `<article class="power-action-block"><h3>${escapeHtml(row.label)}</h3><p>成本 ${escapeHtml(formatMoney(row.cost))}｜品質 ${escapeHtml(formatPercent(Number(row.accuracy || 0) * 100))}｜冷卻 ${escapeHtml(row.remaining_days || 0)}/${escapeHtml(row.cooldown_days || 0)} 天</p><select id="inside-symbol-${index}" class="select">${symbolOptions(row.symbols || [])}</select><button class="button danger full" data-insider-source-index="${index}" ${disabled(connected && Number(row.remaining_days || 0) === 0 && (row.symbols || []).length > 0)}>取得消息</button></article>`).join('')}</div>` : '<div class="trade-empty">目前沒有已解鎖的消息管道。</div>'}
      ${tip ? `<div class="power-callout danger"><strong>${escapeHtml(tip.symbol)}｜${escapeHtml(tip.direction)}</strong><span>${escapeHtml(tip.event_title || '')}｜品質 ${escapeHtml(formatPercent(Number(tip.accuracy || 0) * 100))}｜Day ${escapeHtml(tip.expires)} 前有效</span></div><div class="form-grid two"><input id="inside-stake" class="input" type="number" min="1000" step="1000" value="5000"><button class="button danger" data-power-action="insider_open_position" ${disabled(connected && !position)}>建立內線部位</button></div>` : '<div class="trade-empty">目前沒有可使用的非公開消息。</div>'}
      ${position ? `<div class="power-callout"><strong>未結算部位｜${escapeHtml(position.symbol)}</strong><span>${escapeHtml(position.direction)}｜投入 ${escapeHtml(formatMoney(position.stake))}｜Day ${escapeHtml(position.resolve_day)} 結算</span></div>` : ''}
    </div>
  </section>`;
}

function legal(panel) {
  const l = panel.legal || {};
  const c = l.case || {};
  const offenses = l.offenses || [];
  const history = l.history || [];
  return `<section class="panel power-card">
    <div class="panel-header">法律風險</div>
    <div class="panel-body">
      <div class="metric-grid power-metrics">${metric('法律熱度', `${Number(l.heat || 0).toFixed(1)}/100`)}${metric('服刑狀態', Number(l.prison_days || 0) > 0 ? `剩 ${l.prison_days} 天` : '自由')}${metric('前科', l.criminal_record ? '有' : '無')}${metric('案件階段', c.stage || '無案件')}</div>
      <div class="power-callout"><strong>${escapeHtml(l.environment?.label || '')}</strong><span>${escapeHtml(l.environment?.description || '')}</span></div>
      ${c.stage && c.stage !== '無案件' ? `<div class="legal-case"><div><strong>${escapeHtml(c.stage)}</strong><span>證據 ${Number(c.evidence || 0).toFixed(0)}/100｜本階段 ${escapeHtml(c.days_in_stage || 0)} 天</span></div><p>${escapeHtml(c.source || '')}</p></div>` : '<div class="trade-empty">目前沒有進行中的案件。</div>'}
      <div class="power-subgrid">
        <article class="power-action-block"><h3>未結案件違規</h3>${offenses.length ? offenses.map(row => `<div class="legal-row"><strong>${escapeHtml(row.name)} × ${escapeHtml(row.count)}</strong><span>基準刑期 ${escapeHtml(row.sentence_days_min)}～${escapeHtml(row.sentence_days_max)} 天</span></div>`).join('') : '<p class="muted">目前沒有違規紀錄。</p>'}</article>
        <article class="power-action-block"><h3>判決紀錄</h3>${history.length ? history.slice().reverse().map(row => `<div class="legal-row"><strong>Day ${escapeHtml(row.day)}｜${escapeHtml(row.days)} 天</strong><span>罰金 ${escapeHtml(formatMoney(row.fine))}｜${escapeHtml((row.offenses || []).join('、'))}</span></div>`).join('') : '<p class="muted">尚無判決紀錄。</p>'}</article>
      </div>
    </div>
  </section>`;
}

export function renderNativePower(state) {
  const panel = state.ui.powerPanel;
  if (!panel) return '<div class="empty-state panel">權力與法律資料載入中。</div>';
  return `<div class="page-header"><div><h1 class="page-title">政治／法律</h1><div class="page-subtitle">所有結果由 Private Backend 執行；公開前端不包含成功率、曝光率、定罪機率或量刑抽籤公式。</div></div></div><div class="power-page">${politics(panel, state.connected)}${underworld(panel, state.connected)}${insider(panel, state.connected)}${legal(panel)}</div>`;
}
