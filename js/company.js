import { escapeHtml, formatMoney, formatPercent } from './ui.js';

function disabled(can) {
  return can ? '' : 'disabled';
}

function metric(label, value) {
  return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function startup(panel, connected) {
  const industries = panel?.startup?.industries || [];
  return `<div class="page-header">
    <div><h1 class="page-title">公司經營</h1><div class="page-subtitle">創業門檻、產業資料與資金配置由私有後端決定；前端只送創業選擇。</div></div>
  </div>
  <section class="panel">
    <div class="panel-header">成立公司</div>
    <div class="panel-body">
      <div class="company-start-grid">
        ${industries.map(row => `<article class="company-start-card ${row.can_create ? '' : 'is-locked'}">
          <div><strong>${escapeHtml(row.name)}</strong><span>${escapeHtml(row.required_skill_name)} Lv.${escapeHtml(row.required_skill_level)}｜目前 Lv.${escapeHtml(row.player_skill_level)}</span></div>
          <div class="company-start-metrics">
            <span>最低資本 ${escapeHtml(formatMoney(row.start_cost))}</span>
            <span>建議資本 ${escapeHtml(formatMoney(row.recommended_capital))}</span>
            <span>基礎毛利率 ${escapeHtml(formatPercent(Number(row.margin || 0) * 100))}</span>
          </div>
          <button class="button ${row.can_create ? 'primary' : ''}" data-company-pick-industry="${escapeHtml(row.key)}" ${disabled(connected && row.can_create)}>選擇此產業</button>
        </article>`).join('')}
      </div>
      <div class="trade-divider"></div>
      <div class="form-grid four">
        <div class="field"><label>產業</label><select id="company-start-industry" class="select">${industries.map(row => `<option value="${escapeHtml(row.key)}">${escapeHtml(row.name)}</option>`).join('')}</select></div>
        <div class="field"><label>公司名稱</label><input id="company-start-name" class="input" maxlength="30" value="玩家控股公司"></div>
        <div class="field"><label>代號</label><input id="company-start-ticker" class="input" maxlength="5" value="PCOR"></div>
        <div class="field"><label>投入資本</label><input id="company-start-capital" class="input" type="number" min="1000" step="5000" value="100000"></div>
      </div>
      <button class="button primary full" data-company-create ${disabled(connected)}>成立公司</button>
    </div>
  </section>`;
}

function eventPanel(panel, connected) {
  const event = panel?.event;
  if (!event) return '';
  return `<section class="panel company-alert-panel">
    <div class="panel-header">待處理公司事件</div>
    <div class="panel-body">
      <h3>${escapeHtml(event.title || '公司事件')}</h3>
      <p>${escapeHtml(event.description || '')}</p>
      <div class="button-row wrap">${(event.choices || []).map(ch => `<button class="button primary" data-company-event-choice="${escapeHtml(ch.index)}" ${disabled(connected)}>${escapeHtml(ch.label)}</button>`).join('')}</div>
    </div>
  </section>`;
}

function financials(panel) {
  const d = panel.daily || {};
  const q = panel.quarter || {};
  const bs = panel.balance_sheet || {};
  return `<section class="panel company-wide-panel">
    <div class="panel-header">營運與財務</div>
    <div class="panel-body">
      <div class="company-finance-grid">
        <div><h3>每日</h3><div class="metric-grid">${metric('營收', formatMoney(d.revenue))}${metric('毛利', formatMoney(d.gross_profit))}${metric('營業現金流', formatMoney(d.operating_cashflow))}${metric('淨利', formatMoney(d.net_profit))}</div></div>
        <div><h3>每日成本</h3><div class="metric-grid">${metric('薪資', formatMoney(d.payroll))}${metric('行政', formatMoney(d.admin))}${metric('研發', formatMoney(d.rd))}${metric('行銷', formatMoney(d.marketing))}</div></div>
        <div><h3>本季</h3><div class="metric-grid">${metric('營收', formatMoney(q.revenue))}${metric('淨利', formatMoney(q.profit))}${metric('營業現金流', formatMoney(q.operating_cashflow))}${metric('投資現金流', formatMoney(q.investing_cashflow))}</div></div>
        <div><h3>資產負債</h3><div class="metric-grid">${metric('總資產', formatMoney(bs.total_assets))}${metric('固定資產', formatMoney(bs.fixed_assets))}${metric('研發資產', formatMoney(bs.rd_asset))}${metric('負債', formatMoney(bs.debt))}</div></div>
      </div>
    </div>
  </section>`;
}

function operations(panel, connected) {
  const c = panel.company || {};
  const op = panel.operations || {};
  const debt = panel.debt || {};
  const bankrupt = c.bankrupt;
  return `<section class="panel company-wide-panel">
    <div class="panel-header">經營操作</div>
    <div class="panel-body company-action-grid">
      <article class="company-action-card">
        <h3>創辦人增資</h3><p>未上市公司可由玩家投入個人資金。</p>
        <input id="company-inject-amount" class="input" type="number" min="1000" step="5000" value="10000">
        <button class="button" data-company-action="inject" ${disabled(connected && !c.public && !bankrupt)}>投入資本</button>
      </article>
      <article class="company-action-card">
        <h3>品牌行銷</h3><p>提升品牌並形成 30 天活動效果。</p>
        <input id="company-marketing-amount" class="input" type="number" min="1000" step="1000" value="5000">
        <button class="button" data-company-action="marketing" ${disabled(connected && !bankrupt)}>啟動行銷</button>
      </article>
      <article class="company-action-card">
        <h3>招募</h3><p>員工 ${escapeHtml(c.employees)} / ${escapeHtml(op.employee_cap)}｜平均日薪 ${escapeHtml(formatMoney(op.average_salary))}</p>
        <input id="company-hire-count" class="input" type="number" min="1" max="${Math.max(1, Number(op.remaining_slots || 0))}" value="1">
        <button class="button" data-company-action="hire" ${disabled(connected && !bankrupt && Number(op.remaining_slots || 0) > 0)}>招募</button>
      </article>
      <article class="company-action-card">
        <h3>裁員</h3><p>每人資遣費為 7 日平均薪資。</p>
        <input id="company-fire-count" class="input" type="number" min="1" max="${Math.max(1, Number(c.employees || 1) - 1)}" value="1">
        <button class="button danger" data-company-action="fire" ${disabled(connected && !bankrupt && Number(c.employees || 0) > 1)}>裁員</button>
      </article>
      <article class="company-action-card">
        <h3>公司借款</h3><p>目前負債 ${escapeHtml(formatMoney(debt.amount))}｜年利率 ${escapeHtml(formatPercent(Number(debt.annual_rate || 0) * 100))}｜額度 ${escapeHtml(formatMoney(debt.capacity))}</p>
        <input id="company-borrow-amount" class="input" type="number" min="1000" step="5000" value="10000">
        <button class="button" data-company-action="borrow" ${disabled(connected && !bankrupt && Number(debt.capacity || 0) >= 1000)}>借款</button>
      </article>
      <article class="company-action-card">
        <h3>償還債務</h3><p>由公司現金直接償還。</p>
        <input id="company-repay-amount" class="input" type="number" min="100" step="1000" value="5000">
        <button class="button" data-company-action="repay" ${disabled(connected && Number(debt.amount || 0) > 0)}>還款</button>
      </article>
      <article class="company-action-card">
        <h3>資本支出</h3><p>增加固定資產與可用產能。</p>
        <input id="company-capex-amount" class="input" type="number" min="1000" step="5000" value="10000">
        <button class="button" data-company-action="capex" ${disabled(connected && !bankrupt)}>執行 CAPEX</button>
      </article>
      <article class="company-action-card">
        <h3>額外研發</h3><p>舊核心會將投入的 80% 資本化為研發資產。</p>
        <input id="company-rd-amount" class="input" type="number" min="1000" step="1000" value="5000">
        <button class="button" data-company-action="rd" ${disabled(connected && !bankrupt)}>投入研發</button>
      </article>
    </div>
  </section>`;
}

function ipo(panel, connected) {
  const c = panel.company || {};
  const ipo = panel.ipo || {};
  const est = ipo.estimate || {};
  if (c.public) return publicCapital(panel, connected);
  return `<section class="panel company-wide-panel">
    <div class="panel-header">IPO 上市準備</div>
    <div class="panel-body">
      <div class="company-ipo-progress"><strong>${escapeHtml(ipo.completed || 0)} / ${escapeHtml(ipo.total || 0)}</strong><span>上市條件完成</span></div>
      <div class="company-requirement-grid">${(ipo.requirements || []).map(r => `<div class="company-requirement ${r.ok ? 'is-ok' : ''}">${r.ok ? '✅' : '⬜'} ${escapeHtml(r.label)}</div>`).join('')}</div>
      <div class="metric-grid company-ipo-metrics">
        ${metric('目標本益比', `${Number(est.target_pe || 0).toFixed(1)}x`)}
        ${metric('年化獲利', formatMoney(est.annualized_profit))}
        ${metric('估算公司價值', formatMoney(est.company_total_valuation))}
        ${metric('IPO 價格', formatMoney(est.ipo_price))}
        ${metric('預估募資', formatMoney(est.raise_amount))}
        ${metric('創辦人持股', formatPercent(Number(est.founder_pct || 0) * 100))}
      </div>
      <div class="form-grid two">
        <div class="field"><label>IPO 釋股比例</label><input id="company-ipo-release" class="input" type="number" min="0" max="95" step="5" value="${Number(ipo.release_ratio || 0.25) * 100}"></div>
        <button class="button primary" data-company-action="ipo" ${disabled(connected && ipo.ready)}>正式上市</button>
      </div>
    </div>
  </section>`;
}

function publicCapital(panel, connected) {
  const shares = panel.public_shares || {};
  const div = panel.dividend || {};
  return `<section class="panel company-wide-panel">
    <div class="panel-header">上市公司資本市場</div>
    <div class="panel-body">
      <div class="metric-grid">
        ${metric('總股數', Number(shares.total_shares || 0).toLocaleString())}
        ${metric('玩家持股', Number(shares.player_shares || 0).toLocaleString())}
        ${metric('持股比例', formatPercent(Number(shares.player_pct || 0) * 100))}
        ${metric('MYCO 現價', formatMoney(shares.price))}
      </div>
      <div class="company-action-grid" style="margin-top:12px">
        <article class="company-action-card"><h3>股利政策</h3><p>目前目標 ${escapeHtml(formatPercent(Number(div.target_yield || 0) * 100))}｜預估玩家季股利 ${escapeHtml(formatMoney(div.projected_player_income))}</p><input id="company-dividend-yield" class="input" type="number" min="0" max="10" step="0.1" value="${Number(div.target_yield || 0) * 100}"><button class="button" data-company-action="dividend" ${disabled(connected)}>儲存殖利率</button></article>
        <article class="company-action-card"><h3>增發新股</h3><p>依 MYCO 現價募資；每季受原本增發上限限制。</p><input id="company-issue-shares" class="input" type="number" min="100" step="500" value="5000"><button class="button" data-company-action="issue" ${disabled(connected)}>增發</button></article>
        <article class="company-action-card"><h3>公司回購</h3><p>使用公司現金回購公開流通股；每季受原本回購上限限制。</p><input id="company-buyback-shares" class="input" type="number" min="100" step="100" value="1000"><button class="button" data-company-action="buyback" ${disabled(connected)}>回購</button></article>
      </div>
    </div>
  </section>`;
}

function bankruptcy(panel, connected) {
  const c = panel.company || {};
  if (!c.bankrupt) return '';
  return `<section class="panel company-alert-panel danger-panel"><div class="panel-header">公司破產處理</div><div class="panel-body"><p>公司已進入破產狀態。可選創辦人救援、債權人重整或清算。</p><div class="button-row wrap"><button class="button" data-company-bankruptcy="founder_rescue" ${disabled(connected)}>創辦人救援</button><button class="button" data-company-bankruptcy="creditor_restructure" ${disabled(connected)}>債權人重整</button><button class="button danger" data-company-bankruptcy="liquidate" ${disabled(connected)}>清算公司</button></div></div></section>`;
}

export function renderNativeCompany(state) {
  const panel = state.ui.companyPanel;
  const connected = state.connected;
  if (!panel) return '<div class="empty-state panel">公司資料載入中。</div>';
  if (!panel.exists) return startup(panel, connected);
  const c = panel.company || {};
  const op = panel.operations || {};

  return `<div class="page-header"><div><h1 class="page-title">公司經營</h1><div class="page-subtitle">營運、財報、公司事件、融資、研發與 IPO 已改走 semantic API；真正的估值、董事會、營收與事件運算仍只在私有 Python 核心。</div></div></div>
    ${bankruptcy(panel, connected)}
    <div class="company-summary-grid">
      ${metric('公司', `${c.name || '—'} (${c.ticker || '—'})`)}
      ${metric('產業／階段', `${c.industry_name || '—'}｜${c.stage || '—'}`)}
      ${metric('估值', formatMoney(c.valuation))}
      ${metric('公司現金', formatMoney(c.cash))}
      ${metric('員工', `${Number(c.employees || 0)} / ${Number(op.employee_cap || 0)}`)}
      ${metric('品牌', `${Number(c.brand || 0).toFixed(1)}/100`)}
      ${metric('淨利率', formatPercent(Number(c.net_margin || 0) * 100))}
      ${metric('現金跑道', `${Number(c.runway_days || 0).toFixed(0)} 天`)}
      ${metric('董事會支持', `${Number(c.board_support || 0).toFixed(0)}/100`)}
      ${metric('創辦人持股', formatPercent(Number(c.founder_ownership || 0) * 100))}
      ${metric('控制權', c.control_label || '—')}
      ${metric('產能利用率', formatPercent(Number(op.capacity_utilization || 0) * 100))}
    </div>
    <section class="panel"><div class="panel-header">公司識別</div><div class="panel-body form-grid four"><input id="company-rename" class="input" maxlength="30" value="${escapeHtml(c.name || '')}"><button class="button" data-company-action="rename" ${disabled(connected)}>更改名稱</button><input id="company-ticker" class="input" maxlength="5" value="${escapeHtml(c.ticker || '')}"><button class="button" data-company-action="ticker" ${disabled(connected)}>更改代號</button></div></section>
    ${eventPanel(panel, connected)}
    ${financials(panel)}
    ${operations(panel, connected)}
    ${(panel.active_effects || []).length ? `<section class="panel"><div class="panel-header">公司事件效果</div><div class="panel-body company-effect-list">${panel.active_effects.map(e => `<span>${escapeHtml(e.title)}｜${escapeHtml(e.remaining_days)} 天｜營收 ${Number(e.revenue_pct || 0) >= 0 ? '+' : ''}${Number(e.revenue_pct || 0).toFixed(1)}%｜毛利 ${Number(e.margin_pp || 0) >= 0 ? '+' : ''}${Number(e.margin_pp || 0).toFixed(1)}pp</span>`).join('')}</div></section>` : ''}
    ${ipo(panel, connected)}`;
}
