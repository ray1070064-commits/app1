import { escapeHtml, formatMoney, formatPercent } from './ui.js';

function disabled(can) { return can ? '' : 'disabled'; }
function metric(label, value) { return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`; }

function renderSingle(panel, connected) {
  const single = panel.single || {};
  const methods = Array.isArray(single.meeting_methods) ? single.meeting_methods : [];
  const candidate = single.candidate;
  if (candidate) {
    return `<section class="panel family-wide">
      <div class="panel-header">認識新對象</div>
      <div class="panel-body">
        <div class="family-candidate">
          <div><h3>${escapeHtml(candidate.name)}</h3><p>${escapeHtml(candidate.personality?.name || '')}｜${escapeHtml(candidate.career?.name || '')}｜${Number(candidate.age || 0).toFixed(0)} 歲</p><p class="muted">${escapeHtml(candidate.personality?.description || '')}</p><p class="muted">相遇：${escapeHtml(candidate.meeting_method?.name || '')}</p></div>
          <div class="button-row"><button class="button primary" data-family-start-dating ${disabled(connected)}>開始交往</button><button class="button" data-family-skip-candidate ${disabled(connected)}>換一位</button></div>
        </div>
      </div>
    </section>`;
  }
  return `<section class="panel family-wide">
    <div class="panel-header">認識新對象</div>
    <div class="panel-body">
      <div class="form-grid two">
        <select id="family-meeting-method" class="select">${methods.map(m => `<option value="${escapeHtml(m.key)}">${escapeHtml(m.name)}</option>`).join('')}</select>
        <button class="button primary" data-family-find ${disabled(connected && methods.length)}>尋找對象</button>
      </div>
      <div class="family-method-desc">${methods.map(m => `<div><strong>${escapeHtml(m.name)}</strong><span>${escapeHtml(m.description || '')}</span></div>`).join('')}</div>
    </div>
  </section>`;
}

function renderDating(panel, connected) {
  const d = panel.dating || {};
  const cd = d.cooldowns || {};
  const costs = panel.costs || {};
  const actionButton = (kind, label, cost, cooldown) => `<button class="button" data-family-dating-action="${kind}" ${disabled(connected && Number(cooldown || 0) <= 0)}>${escapeHtml(label)} ${escapeHtml(formatMoney(cost))}${Number(cooldown || 0) > 0 ? `｜${escapeHtml(cooldown)} 天` : ''}</button>`;
  return `<section class="panel family-wide">
    <div class="panel-header">交往中｜${escapeHtml(d.partner_name || '伴侶')}</div>
    <div class="panel-body">
      <div class="metric-grid family-status-metrics">
        ${metric('親密度', `${Number(d.closeness || 0).toFixed(0)}/100`)}
        ${metric('關係', `${Number(d.relationship || 0).toFixed(0)}/100`)}
        ${metric('交往天數', `${Number(d.dating_days || 0)} 天`)}
        ${metric('職業', d.career?.name || '—')}
      </div>
      <p class="muted">${escapeHtml(d.personality?.name || '')}｜${escapeHtml(d.meeting_method?.name || '')}</p>
      <div class="button-row wrap family-action-row">
        ${actionButton('talk', '聊天', costs.dating_talk, cd.talk)}
        ${actionButton('date', '約會', costs.dating_date, cd.date)}
        ${actionButton('trip', '旅行', costs.dating_trip, cd.trip)}
      </div>
      <div class="button-row family-danger-row">
        <button class="button primary" data-family-marry ${disabled(connected && d.can_propose)}>求婚／結婚 ${escapeHtml(formatMoney(d.proposal_cost))}</button>
        <button class="button danger" data-family-end-dating ${disabled(connected)}>結束交往</button>
      </div>
      ${d.can_propose ? '' : `<p class="muted">親密度需達 60 才能結婚，目前還差 ${Math.max(0, 60 - Number(d.closeness || 0)).toFixed(0)}。</p>`}
    </div>
  </section>`;
}

function renderMarriage(panel, connected) {
  const m = panel.marriage || {};
  const partner = m.partner || {};
  const budget = m.budget || {};
  const buffs = m.buffs || {};
  return `<section class="panel family-wide">
    <div class="panel-header">家庭狀態</div>
    <div class="panel-body">
      <div class="metric-grid family-status-metrics">
        ${metric('伴侶', partner.name || '—')}
        ${metric('幸福', `${Number(m.happiness || 0).toFixed(0)}/100`)}
        ${metric('關係', `${Number(m.relationship || 0).toFixed(0)}/100`)}
        ${metric('婚姻年數', `${(Number(m.marriage_days || 0) / 365).toFixed(1)} 年`)}
        ${metric('伴侶職涯', `${partner.career?.name || '—'} Lv.${partner.level || 1}`)}
        ${metric('伴侶日收入', formatMoney(partner.retired ? partner.pension_income : partner.daily_income))}
        ${metric('家庭日收入', formatMoney(budget.income))}
        ${metric('家庭日支出', formatMoney(budget.expense))}
        ${metric('家庭日淨額', formatMoney(budget.net))}
        ${metric('長照累計', formatMoney(m.long_term_care_total))}
        ${metric('家人回饋', formatMoney(m.family_support_total))}
        ${metric('傳承分數', Number(m.legacy_score || 0).toFixed(1))}
      </div>
      ${buffs ? `<div class="family-buffs"><span>壓力緩解 ${Number(buffs.stress_relief || 0).toFixed(2)}</span><span>升遷加成 ${escapeHtml(formatPercent(Number(buffs.promotion_bonus || 0) * 100))}</span><span>家庭可支配比例 ${escapeHtml(formatPercent(Number(buffs.partner_contribution_rate || 0) * 100))}</span>${buffs.stable_support ? '<span>穩定家庭支持已解鎖</span>' : ''}</div>` : ''}
      <div class="form-grid two family-child-create">
        <input id="family-child-name" class="input" type="text" maxlength="12" placeholder="孩子姓名，可留空隨機" />
        <button class="button primary" data-family-add-child ${disabled(connected && (panel.children || []).length < 4)}>新增子女 ${escapeHtml(formatMoney(panel.costs?.new_child))}</button>
      </div>
      <div class="button-row"><button class="button" data-family-activity="family_day" ${disabled(connected)}>家庭日 ${escapeHtml(formatMoney(panel.costs?.family_day))}</button><button class="button" data-family-activity="trip" ${disabled(connected)}>家庭旅行 ${escapeHtml(formatMoney(panel.costs?.family_trip))}</button></div>
      ${(m.milestones || []).length ? `<p class="muted">家庭里程碑：${escapeHtml(m.milestones.join('、'))}</p>` : ''}
    </div>
  </section>`;
}

function renderChildren(panel, connected) {
  const children = Array.isArray(panel.children) ? panel.children : [];
  if (!children.length) return '<section class="panel family-wide"><div class="panel-header">子女／教育</div><div class="panel-body"><div class="trade-empty">目前沒有子女。</div></div></section>';
  const paths = Array.isArray(panel.education_paths) ? panel.education_paths : [];
  const costs = panel.costs?.parenting || {};
  return `<section class="panel family-wide"><div class="panel-header">子女／教育</div><div class="panel-body family-child-list">${children.map(child => {
    const adult = child.stage === '成年';
    const pathOptions = paths.map(p => `<option value="${escapeHtml(p.key)}" ${p.key === child.education_path?.key ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
    return `<article class="family-child-card">
      <div class="family-child-head"><div><h3>${escapeHtml(child.name)}</h3><span>${escapeHtml(child.stage)}｜${Number(child.age_years || 0).toFixed(1)} 歲｜教育 Lv.${escapeHtml(child.education_level)}</span></div><span>基金 ${escapeHtml(formatMoney(child.education_fund))}</span></div>
      <div class="metric-grid family-child-metrics">${metric('學習', `${Number(child.learning || 0).toFixed(0)}/100`)}${metric('自信', `${Number(child.confidence || 0).toFixed(0)}/100`)}${metric('親子', `${Number(child.parent_bond || 0).toFixed(0)}/100`)}${metric('興趣', `${Number(child.interest || 0).toFixed(0)}/100`)}</div>
      ${adult ? `<p class="muted">成年職涯：${escapeHtml(child.adult_career?.name || '尚未確定')}｜收入 ${escapeHtml(formatMoney(child.adult_income))}｜${child.supporting_family ? '固定回饋家庭' : '目前獨立生活'}</p>` : `<div class="family-child-controls">
        <div class="form-grid two"><select class="select" data-family-child-path data-child-index="${child.index}">${pathOptions}</select><span class="muted">${escapeHtml(child.education_path?.description || '')}</span></div>
        <div class="button-row wrap family-parenting-buttons">
          <button class="button" data-family-parenting="study" data-child-index="${child.index}" ${disabled(connected && !child.parenting_used_today)}>陪讀 ${escapeHtml(formatMoney(costs.study))}</button>
          <button class="button" data-family-parenting="creative" data-child-index="${child.index}" ${disabled(connected && !child.parenting_used_today)}>才藝 ${escapeHtml(formatMoney(costs.creative))}</button>
          <button class="button" data-family-parenting="sports" data-child-index="${child.index}" ${disabled(connected && !child.parenting_used_today)}>運動 ${escapeHtml(formatMoney(costs.sports))}</button>
          <button class="button" data-family-parenting="talk" data-child-index="${child.index}" ${disabled(connected && !child.parenting_used_today)}>談心 ${escapeHtml(formatMoney(costs.talk))}</button>
        </div>
        <div class="form-grid two"><input id="family-edu-${child.index}" class="input" type="number" min="${escapeHtml(panel.costs?.education_fund_min || 500)}" step="500" value="2000"><button class="button" data-family-education data-child-index="${child.index}" data-input="family-edu-${child.index}" ${disabled(connected)}>投入教育基金</button></div>
      </div>`}
    </article>`;
  }).join('')}</div></section>`;
}

function renderAutomation(panel, connected) {
  const a = panel.automation || {};
  return `<section class="panel"><div class="panel-header">家庭自動照顧</div><div class="panel-body">
    <label class="field life-check"><input id="family-auto-enabled" type="checkbox" ${a.enabled ? 'checked' : ''}><span>啟用家庭自動照顧</span></label>
    <div class="field"><label>保留現金</label><input id="family-auto-reserve" class="input" type="number" min="0" step="1000" value="${escapeHtml(a.cash_reserve || 0)}"></div>
    <div class="form-grid three">
      <div class="field"><label>關係照顧門檻</label><input id="family-auto-relation" class="input" type="number" min="50" max="90" value="${escapeHtml(a.relationship_threshold || 70)}"></div>
      <div class="field"><label>交往照顧週期</label><select id="family-auto-dating" class="select">${[7,14,30].map(v => `<option value="${v}" ${Number(a.dating_interval_days) === v ? 'selected' : ''}>${v} 天</option>`).join('')}</select></div>
      <div class="field"><label>親子照顧週期</label><select id="family-auto-parenting" class="select">${[7,14,30,60,90].map(v => `<option value="${v}" ${Number(a.parenting_interval_days) === v ? 'selected' : ''}>${v} 天</option>`).join('')}</select></div>
    </div>
    <button class="button full" data-family-save-automation ${disabled(connected)}>儲存家庭設定</button>
    <p class="muted">累計自動支出 ${escapeHtml(formatMoney(a.spent))}</p>
  </div></section>`;
}

function assetCard(row, type, connected) {
  return `<article class="family-asset-card"><div><h3>${escapeHtml(row.name)}</h3><p>${escapeHtml(row.level)}｜${escapeHtml(row.description || '')}</p><span>${escapeHtml(formatMoney(row.price))}｜持有 ${escapeHtml(row.owned)}</span></div><div class="button-row"><button class="button primary" data-family-asset data-asset-type="${type}" data-asset-key="${escapeHtml(row.key)}" data-side="buy" ${disabled(connected)}>買入</button><button class="button" data-family-asset data-asset-type="${type}" data-asset-key="${escapeHtml(row.key)}" data-side="sell" ${disabled(connected && Number(row.owned || 0) > 0)}>賣出</button></div></article>`;
}

function renderAssets(panel, connected) {
  const assets = panel.assets || {};
  return `<section class="panel family-wide"><div class="panel-header">房產／車輛</div><div class="panel-body"><div class="family-assets-grid"><div><h3>房產</h3>${(assets.properties || []).map(row => assetCard(row, 'property', connected)).join('')}</div><div><h3>車輛</h3>${(assets.vehicles || []).map(row => assetCard(row, 'vehicle', connected)).join('')}</div></div></div></section>`;
}

export function renderFamilySections(state) {
  const panel = state.ui.familyPanel;
  if (!panel) return '<div class="empty-state panel family-panel-loading">家庭與人生資產資料載入中。</div>';
  const connected = state.connected;
  const relation = panel.status === 'single' ? renderSingle(panel, connected) : panel.status === 'dating' ? renderDating(panel, connected) : renderMarriage(panel, connected);
  return `<div class="family-section-title"><h2>家庭／人生資產</h2><p>戀愛、婚姻、子女與房車操作由私有後端依舊版規則執行。</p></div><div class="family-grid">${relation}${panel.status === 'married' ? renderChildren(panel, connected) : ''}${renderAutomation(panel, connected)}${renderAssets(panel, connected)}</div>`;
}
