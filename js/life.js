import { escapeHtml, formatMoney, formatPercent } from './ui.js';

function disabled(can) {
  return can ? '' : 'disabled';
}

function metric(label, value) {
  return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderEvent(event, connected) {
  if (!event) return '<div class="trade-empty">目前沒有待處理人生事件。</div>';
  const choices = Array.isArray(event.choices) ? event.choices : [];
  return `<article class="life-event-card">
    <h3>${escapeHtml(event.title || event.name || '人生事件')}</h3>
    <p>${escapeHtml(event.desc || event.description || '')}</p>
    <div class="button-row wrap">${choices.map((choice, index) => `
      <button class="button primary" data-life-event-choice="${index}" ${disabled(connected)}>${escapeHtml(choice.label || choice.title || `選項 ${index + 1}`)}</button>
    `).join('')}</div>
  </article>`;
}

function renderSkills(panel, connected) {
  const skills = panel?.career?.skills || [];
  const training = panel?.career?.training;
  return `<section class="panel">
    <div class="panel-header">技能學習</div>
    <div class="panel-body life-list">
      ${training ? `<div class="life-callout">訓練中：${escapeHtml(training.skill)} → Lv.${escapeHtml(training.target_level)}｜剩餘 ${escapeHtml(training.remaining_days)} 天</div>` : ''}
      ${skills.map(skill => {
        const course = skill.next_course;
        return `<article class="life-row">
          <div><strong>${escapeHtml(skill.name)}</strong><span>目前 Lv.${escapeHtml(skill.level)}</span></div>
          ${course ? `<div class="life-row-actions"><span>${escapeHtml(formatMoney(course.cost))}｜${escapeHtml(course.days)} 天</span><button class="button" data-life-skill="${escapeHtml(skill.key)}" ${disabled(connected && !training)}>升到 Lv.${escapeHtml(course.target_level)}</button></div>` : '<span class="muted">已達最高等級</span>'}
        </article>`;
      }).join('')}
    </div>
  </section>`;
}

function renderJobs(panel, connected) {
  const career = panel?.career || {};
  const jobs = Array.isArray(career.jobs) ? career.jobs : [];
  return `<section class="panel life-wide-panel">
    <div class="panel-header">求職／跳槽</div>
    <div class="panel-body life-job-grid">
      ${jobs.map(job => {
        const employers = Array.isArray(job.employers) ? job.employers : [];
        const employerRows = employers.map(emp => `<div class="job-employer-row">
          <div><strong>${escapeHtml(emp.name)}</strong><span>預估日薪 ${escapeHtml(formatMoney(emp.estimated_daily_pay))}${emp.cooldown_days > 0 ? `｜冷卻 ${escapeHtml(emp.cooldown_days)} 天` : ''}</span></div>
          <button class="button ${emp.can_apply ? 'primary' : ''}" data-life-apply-job data-job-key="${escapeHtml(job.key)}" data-employer="${escapeHtml(emp.symbol)}" ${disabled(connected && emp.can_apply)}>應徵</button>
        </div>`).join('');
        return `<article class="career-card ${job.eligible ? '' : 'is-locked'}">
          <h3>${escapeHtml(job.name)}</h3>
          <p>技能 ${escapeHtml(job.skill)} Lv.${escapeHtml(job.required_level)}｜總工作日 ${escapeHtml(job.required_work_days)}｜目前技能 Lv.${escapeHtml(job.have_level)}</p>
          <div class="employer-list">${employerRows || '<span class="muted">目前沒有可用雇主</span>'}</div>
        </article>`;
      }).join('')}
    </div>
  </section>`;
}

function renderPromotion(panel, connected) {
  const career = panel?.career || {};
  const promotion = career.promotion;
  return `<section class="panel">
    <div class="panel-header">升遷／離職</div>
    <div class="panel-body">
      ${promotion ? `<div class="life-callout">
        <strong>下一階：${escapeHtml(promotion.name)}</strong><br>
        技能 Lv.${escapeHtml(promotion.have_level)} / ${escapeHtml(promotion.required_level)}｜年資 ${escapeHtml(promotion.experience_days)} / ${escapeHtml(promotion.required_experience_days)} 天${promotion.cooldown_days ? `｜冷卻 ${escapeHtml(promotion.cooldown_days)} 天` : ''}
      </div>
      <button class="button primary full" data-life-promotion ${disabled(connected && promotion.can_apply)}>申請升遷</button>` : '<div class="trade-empty">目前職位已無下一階升遷。</div>'}
      ${career.can_resign ? '<button class="button danger full" style="margin-top:8px" data-life-resign>辭職</button>' : ''}
    </div>
  </section>`;
}

function renderHealth(panel, state, connected) {
  const health = panel?.health_controls || {};
  return `<section class="panel">
    <div class="panel-header">健康／壓力</div>
    <div class="panel-body">
      <div class="metric-grid">
        ${metric('健康', `${Number(state.server?.player?.health || 0).toFixed(0)}/100`)}
        ${metric('壓力', `${Number(state.server?.player?.stress || 0).toFixed(0)}/100`)}
      </div>
      <div class="button-row" style="margin-top:10px">
        <button class="button" data-life-health="mental_care" ${disabled(connected)}>心理照護 ${escapeHtml(formatMoney(health.mental_care_cost))}</button>
        <button class="button" data-life-health="checkup" ${disabled(connected)}>健康檢查 ${escapeHtml(formatMoney(health.checkup_cost))}</button>
      </div>
      <div class="trade-divider"></div>
      <label class="field life-check"><input id="life-auto-medical" type="checkbox" ${health.auto_medical ? 'checked' : ''}><span>長時間推進自動就醫</span></label>
      <div class="form-grid three">
        <div class="field"><label>健康門檻</label><input id="life-health-threshold" class="input" type="number" min="10" max="50" value="${escapeHtml(health.auto_health_threshold ?? 28)}"></div>
        <div class="field"><label>壓力門檻</label><input id="life-stress-threshold" class="input" type="number" min="70" max="98" value="${escapeHtml(health.auto_stress_threshold ?? 88)}"></div>
        <div class="field"><label>每日生活費</label><input id="life-living-cost" class="input" type="number" min="${escapeHtml(health.min_living_cost ?? 30)}" value="${escapeHtml(health.daily_living_cost ?? 50)}"></div>
      </div>
      <button class="button full" data-life-settings ${disabled(connected)}>儲存健康／生活設定</button>
    </div>
  </section>`;
}

function renderRetirement(panel, connected) {
  const r = panel?.retirement || {};
  if (!Object.keys(r).length) return '';
  const routes = Array.isArray(r.routes) ? r.routes : [];
  return `<section class="panel life-wide-panel">
    <div class="panel-header">退休／傳承</div>
    <div class="panel-body">
      <div class="metric-grid retirement-metrics">
        ${metric('年齡', `${Number(r.age || 0).toFixed(1)} 歲`)}
        ${metric('總權益', formatMoney(r.equity))}
        ${metric('年被動收入', formatMoney(r.passive))}
        ${metric('年生活支出', formatMoney(r.living))}
        ${metric('被動覆蓋率', formatPercent(Number(r.passive_coverage || 0) * 100))}
        ${metric('提領率', formatPercent(Number(r.withdrawal_rate || 0) * 100))}
      </div>
      <div class="life-goals">
        <span>${r.base_retire ? '✅' : '⬜'} 基本退休</span>
        <span>${r.fire ? '✅' : '⬜'} FIRE</span>
        <span>${r.wealth ? '✅' : '⬜'} 千萬資產</span>
        <span>${r.enterprise_legacy ? '✅' : '⬜'} 企業傳承</span>
        <span>${r.family_legacy ? '✅' : '⬜'} 家族傳承</span>
      </div>
      <div class="form-grid two" style="margin-top:12px">
        <select id="life-retirement-route" class="select">${routes.map(route => `<option value="${escapeHtml(route)}">${escapeHtml(route)}</option>`).join('')}</select>
        <button class="button danger" data-life-retire ${disabled(connected && r.can_retire)}>正式退休並結束遊戲</button>
      </div>
    </div>
  </section>`;
}

export function renderNativeLife(state) {
  const panel = state.ui.lifePanel;
  const connected = state.connected;
  if (!panel) return '<div class="empty-state panel">人生中心資料載入中。</div>';
  const career = panel.career || {};
  const job = career.current_job || {};
  const employer = career.employer;

  return `<div class="page-header">
      <div><h1 class="page-title">人生中心</h1><div class="page-subtitle">職涯、技能、健康、人生事件與退休都改用原生 Web action；隨機結果仍只在私有後端計算。</div></div>
    </div>
    <div class="life-summary-grid">
      ${metric('目前工作', job.name || '待業中')}
      ${metric('雇主', employer?.name || '—')}
      ${metric('實際日薪', formatMoney(job.daily_pay))}
      ${metric('工作滿意度', `${Number(career.job_satisfaction || 0).toFixed(0)}/100`)}
      ${metric('職涯穩定度', `${Number(career.stability || 0).toFixed(0)}/100`)}
      ${metric('職涯聲望', `${Number(career.career_reputation || 0).toFixed(0)}/100`)}
    </div>
    <div class="life-main-grid">
      <section class="panel life-wide-panel"><div class="panel-header">待處理人生事件</div><div class="panel-body">${renderEvent(state.server?.life?.pending_event, connected)}</div></section>
      ${renderSkills(panel, connected)}
      ${renderPromotion(panel, connected)}
      ${renderHealth(panel, state, connected)}
      ${renderJobs(panel, connected)}
      ${renderRetirement(panel, connected)}
    </div>`;
}
