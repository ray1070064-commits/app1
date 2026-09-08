import { escapeHtml, formatMoney } from './ui.js';

function metric(label, value) {
  return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function pageHeader(title, subtitle) {
  return `<div class="page-header"><div><h1 class="page-title">${escapeHtml(title)}</h1><div class="page-subtitle">${escapeHtml(subtitle)}</div></div></div>`;
}

function eventCard(title, body, meta = '') {
  return `<article class="content-card"><div class="content-card-head"><strong>${escapeHtml(title)}</strong>${meta ? `<span>${escapeHtml(meta)}</span>` : ''}</div>${body ? `<p>${escapeHtml(body)}</p>` : ''}</article>`;
}

export function renderNativeNews(state) {
  const panel = state.ui.newsPanel;
  if (!panel) return `${pageHeader('市場新聞與事件', '新聞與事件結果由私有後端整理。')}<div class="empty-state panel">正在載入新聞／事件資料…</div>`;

  const macro = panel.macro || {};
  const events = panel.events || {};
  const feed = Array.isArray(panel.feed) ? panel.feed : [];
  const activeMarket = Array.isArray(events.market_active) ? events.market_active : [];
  const activeCompany = Array.isArray(events.company_active) ? events.company_active : [];
  const illnesses = Array.isArray(events.illnesses) ? events.illnesses : [];
  const pending = [events.life_pending, events.company_pending].filter(Boolean);

  return `
    ${pageHeader('市場新聞與事件', '只顯示玩家已知的新聞、待決策事件與目前生效中的事件名稱；實際倍率與隨機規則只存在後端。')}
    <section class="panel"><div class="panel-header">總體環境</div><div class="panel-body"><div class="metric-grid">
      ${metric('VIX', Number(macro.vix || 0).toFixed(1))}
      ${metric('CPI', `${Number(macro.cpi || 0).toFixed(2)}%`)}
      ${metric('利率', `${Number(macro.interest_rate || 0).toFixed(2)}%`)}
      ${metric('失業率', `${Number(macro.unemployment_rate || 0).toFixed(2)}%`)}
      ${metric('市場不確定性', Number(macro.market_uncertainty || 0).toFixed(1))}
    </div></div></section>

    <div class="content-grid two">
      <section class="panel"><div class="panel-header">待決策事件</div><div class="panel-body content-stack">
        ${pending.length ? pending.map(ev => eventCard(ev.title || '待決策事件', ev.description || '', ev.deadline_day ? `截止 Day ${ev.deadline_day}` : '')).join('') : '<div class="empty-state">目前沒有待決策事件。</div>'}
      </div></section>
      <section class="panel"><div class="panel-header">目前生效中</div><div class="panel-body content-stack">
        ${activeMarket.map(ev => eventCard(`${ev.ticker || ev.symbol}｜${ev.title}`, '', `剩 ${Number(ev.remaining_days || 0)} 天`)).join('')}
        ${activeCompany.map(ev => eventCard(`公司｜${ev.title}`, '', `剩 ${Number(ev.remaining_days || 0)} 天`)).join('')}
        ${illnesses.map(ev => eventCard(`健康｜${ev.name}`, '', ev.remaining_days ? `剩 ${Number(ev.remaining_days)} 天` : '')).join('')}
        ${!activeMarket.length && !activeCompany.length && !illnesses.length ? '<div class="empty-state">目前沒有持續事件效果。</div>' : ''}
      </div></section>
    </div>

    <section class="panel"><div class="panel-header">最新消息</div><div class="panel-body news-feed-native">
      ${feed.length ? feed.map(item => eventCard(item.title || '市場消息', item.summary || '', `Day ${Number(item.day || 0)}${item.importance ? `｜${item.importance}` : ''}${item.accuracy ? `｜${item.accuracy}` : ''}`)).join('') : '<div class="empty-state">目前沒有新聞。</div>'}
    </div></section>`;
}

export function renderNativeProgress(state) {
  const panel = state.ui.progressPanel;
  if (!panel) return `${pageHeader('生涯進度', '成就、稱號、挑戰與新手教學。')}<div class="empty-state panel">正在載入生涯進度…</div>`;

  const player = panel.player || {};
  const tutorial = panel.tutorial || {};
  const info = tutorial.content || {};
  const achievements = Array.isArray(panel.achievements) ? panel.achievements : [];
  const titles = Array.isArray(panel.titles) ? panel.titles : [];
  const challenge = panel.challenge;
  const connected = state.connected;

  return `
    ${pageHeader('生涯進度', '角色成長仍由舊 Python 核心判定；前端只呈現已解鎖內容與提交選擇。')}
    <section class="panel"><div class="panel-header">角色</div><div class="panel-body"><div class="metric-grid">
      ${metric('等級', `Lv.${Number(player.level || 1)}`)}
      ${metric('XP', Number(player.xp || 0).toLocaleString())}
      ${metric('目前稱號', player.title_name || '—')}
      ${metric('成就', `${Number(panel.achievement_summary?.unlocked || 0)} / ${Number(panel.achievement_summary?.total || 0)}`)}
    </div></div></section>

    <div class="content-grid two">
      <section class="panel"><div class="panel-header">新手教學</div><div class="panel-body">
        ${tutorial.completed ? '<div class="success-box">新手教學已完成。</div>' : `
          <div class="tutorial-progress"><div style="width:${Math.max(0, Math.min(100, Number(tutorial.progress || 0) * 100))}%"></div></div>
          <h3>${escapeHtml(info.title || '新手教學')}</h3>
          <p>${escapeHtml(info.body || '')}</p>
          <p class="muted">目標：${escapeHtml(info.goal || '')}</p>
          <div class="button-row wrap">
            ${![2,4,6].includes(Number(tutorial.step)) ? `<button class="button primary" data-content-action="tutorial_advance" ${connected ? '' : 'disabled'}>${escapeHtml(info.action || '下一步')}</button>` : ''}
            ${Number(tutorial.step) === 6 ? `<button class="button primary" data-content-action="tutorial_enter_life" ${connected ? '' : 'disabled'}>完成並進入人生中心</button>` : ''}
            <button class="button" data-content-action="tutorial_skip" ${connected ? '' : 'disabled'}>略過教學</button>
          </div>`}
      </div></section>

      <section class="panel"><div class="panel-header">30 天挑戰</div><div class="panel-body">
        ${challenge ? `<h3>${escapeHtml(challenge.name || '30 天挑戰')}</h3><p>${escapeHtml(challenge.description || '')}</p><p class="muted">Day ${Number(challenge.start_day || 0)} → ${Number(challenge.end_day || 0)}</p><p>${escapeHtml(challenge.status || '')}</p><div class="metric-grid">${metric('XP 獎勵', String(Number(challenge.xp || 0)))}${metric('現金獎勵', formatMoney(challenge.cash || 0))}</div>` : `<div class="empty-state">目前沒有進行中的挑戰。</div><button class="button primary full" data-content-action="progress_start_challenge" ${connected ? '' : 'disabled'}>建立 30 天挑戰</button>`}
      </div></section>
    </div>

    <section class="panel"><div class="panel-header">已解鎖稱號</div><div class="panel-body"><div class="content-grid three">
      ${titles.length ? titles.map(t => `<article class="content-card ${t.selected ? 'is-selected' : ''}"><div class="content-card-head"><strong>${escapeHtml(t.name)}</strong>${t.selected ? '<span>使用中</span>' : ''}</div><p>${escapeHtml(t.description || '')}</p><button class="button ${t.selected ? '' : 'primary'}" data-title-key="${escapeHtml(t.key)}" ${t.selected || !connected ? 'disabled' : ''}>${t.selected ? '目前稱號' : '設為稱號'}</button></article>`).join('') : '<div class="empty-state">尚無可選稱號。</div>'}
    </div></div></section>

    <section class="panel"><div class="panel-header">成就</div><div class="panel-body"><div class="content-grid three">
      ${achievements.map(a => `<article class="content-card ${a.unlocked ? 'is-unlocked' : 'is-locked'}"><div class="content-card-head"><strong>${escapeHtml(a.name)}</strong><span>${a.unlocked ? '已解鎖' : '未解鎖'}</span></div><p>${escapeHtml(a.description || '')}</p><div class="muted">XP +${Number(a.xp || 0)}｜${escapeHtml(formatMoney(a.cash || 0))}</div></article>`).join('')}
    </div></div></section>`;
}
