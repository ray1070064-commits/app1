import { escapeHtml, formatMoney, formatPercent } from './ui.js';

function pageHeader(title, subtitle, tools = '') {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <div class="page-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="toolbar">${tools}</div>
    </div>
  `;
}

function disabledAttr(connected) {
  return connected ? '' : 'disabled';
}

function renderWatchlist(items, selectedSymbol) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<div class="empty-state">等待後端提供 watchlist 資料。</div>';
  }

  return `
    <div class="watchlist">
      ${items.map(item => {
        const symbol = String(item.symbol ?? '');
        const change = Number(item.change_pct);
        const className = Number.isFinite(change) ? (change >= 0 ? 'price-up' : 'price-down') : '';
        return `
          <button class="watch-item ${symbol === selectedSymbol ? 'is-selected' : ''}" data-symbol="${escapeHtml(symbol)}">
            <span class="watch-symbol">${escapeHtml(symbol || '—')}</span>
            <strong>${escapeHtml(formatMoney(item.price))}</strong>
            <span class="watch-name">${escapeHtml(item.name || '')}</span>
            <span class="${className}">${escapeHtml(formatPercent(item.change_pct))}</span>
          </button>
        `;
      }).join('')}
    </div>
  `;
}

export function renderTrading(state) {
  const server = state.server || {};
  const market = server.market || {};
  const watchlist = Array.isArray(market.watchlist) ? market.watchlist : [];
  const selected = state.ui.selectedSymbol || watchlist[0]?.symbol || null;
  const asset = watchlist.find(item => String(item.symbol) === String(selected)) || null;
  const portfolio = server.portfolio || {};
  const position = Array.isArray(portfolio.positions)
    ? portfolio.positions.find(item => String(item.symbol) === String(selected))
    : null;
  const connected = state.connected;

  const tools = `
    <button class="button" data-game-action="advance_time" data-days="1" ${disabledAttr(connected)}>+1 天</button>
    <button class="button" data-game-action="advance_time" data-days="7" ${disabledAttr(connected)}>+7 天</button>
    <button class="button" data-game-action="advance_time" data-days="30" ${disabledAttr(connected)}>+30 天</button>
  `;

  return `
    ${pageHeader('股票交易', 'Watchlist／市場圖表／下單持倉三欄終端', tools)}
    <div class="trading-grid">
      <section class="panel">
        <div class="panel-header">市場清單</div>
        <div class="panel-body">${renderWatchlist(watchlist, selected)}</div>
      </section>

      <section class="panel">
        <div class="panel-header">${escapeHtml(asset?.symbol || '尚未選擇標的')} ${escapeHtml(asset?.name || '')}</div>
        <div class="chart-box">
          <div class="chart-empty">
            <strong>圖表載入中</strong><br />
            OHLC 價格資料由私有後端生成，公開前端只負責繪圖。
          </div>
        </div>
      </section>

      <section class="panel order-panel">
        <div class="panel-header">下單與持倉</div>
        <div class="panel-body">
          <div class="metric-grid">
            <div class="metric-card"><span>可用現金</span><strong>${escapeHtml(formatMoney(server.player?.cash))}</strong></div>
            <div class="metric-card"><span>目前價格</span><strong>${escapeHtml(formatMoney(asset?.price))}</strong></div>
            <div class="metric-card"><span>持有數量</span><strong>${escapeHtml(position?.size ?? '—')}</strong></div>
            <div class="metric-card"><span>未實現損益</span><strong>${escapeHtml(formatMoney(position?.unrealized_pnl))}</strong></div>
          </div>

          <div class="field" style="margin-top:14px">
            <label for="order-symbol">標的</label>
            <input id="order-symbol" class="input" value="${escapeHtml(selected || '')}" readonly />
          </div>
          <div class="field">
            <label for="order-side">方向</label>
            <select id="order-side" class="select">
              <option value="buy">買入</option>
              <option value="sell">賣出</option>
            </select>
          </div>
          <div class="field">
            <label for="order-quantity">數量</label>
            <input id="order-quantity" class="input" type="number" min="0.000001" step="any" value="${escapeHtml(state.ui.orderQuantity)}" />
          </div>
          <button class="button primary full" data-game-action="trade" ${disabledAttr(connected)}>送出委託</button>
        </div>
      </section>
    </div>
  `;
}

function renderActionCards(domain, title, subtitle, state) {
  const connected = state.connected;
  const data = state.server?.[domain] || {};
  const actions = Array.isArray(data.actions) ? data.actions : [];

  const cards = actions.length
    ? actions.map(action => `
        <article class="feature-card">
          <h3>${escapeHtml(action.label || action.id || '行動')}</h3>
          <p>${escapeHtml(action.description || '')}</p>
          <button class="button primary" data-domain="${escapeHtml(domain)}" data-command="${escapeHtml(action.id || '')}" ${disabledAttr(connected)}>
            執行
          </button>
        </article>
      `).join('')
    : '<div class="empty-state panel">這個區域仍在由完整功能相容層逐步轉成原生 Web UI；目前可先使用左側「完整功能」。</div>';

  return `
    ${pageHeader(title, subtitle)}
    <div class="cards-grid">${cards}</div>
  `;
}

export function renderLife(state) {
  return renderActionCards('life', '人生中心', '工作、技能、家庭與人生事件由後端決定可用選項。', state);
}

export function renderCompany(state) {
  return renderActionCards('company', '公司經營', '公司狀態與決策條件完全由伺服器遊戲核心掌控。', state);
}

export function renderPolitics(state) {
  return renderActionCards('politics', '政治法律', '前端只呈現目前可以操作的政治與法律選項。', state);
}

export function renderNews(state) {
  const items = Array.isArray(state.server?.news?.items) ? state.server.news.items : [];
  return `
    ${pageHeader('市場新聞', '新聞內容由後端產生或整理，前端只負責顯示。')}
    <section class="panel">
      <div class="panel-header">最新消息</div>
      <div class="panel-body">
        ${items.length ? items.map(item => `
          <article class="feature-card" style="margin-bottom:10px;min-height:0">
            <h3>${escapeHtml(item.title || item.headline || '新聞')}</h3>
            <p>${escapeHtml(item.summary || item.body || item.text || '')}</p>
          </article>
        `).join('') : '<div class="empty-state">目前沒有新聞。</div>'}
      </div>
    </section>
  `;
}

export function renderSave(state) {
  return `
    ${pageHeader('存檔管理', '完整 GameState 由私有後端封裝成不可讀、可驗證的加密存檔，再保存在這台瀏覽器。')}
    <section class="panel">
      <div class="panel-body">
        <p class="muted">每次成功操作都會防抖自動存檔。LocalStorage 只保存後端產生的加密字串，不保存可直接修改的現金、Seed 或事件規則。</p>
        <div class="button-row">
          <button class="button primary" data-game-action="save" ${disabledAttr(state.connected)}>立即加密儲存</button>
          <button class="button" data-game-action="load_save" ${disabledAttr(state.connected)}>載入本機加密存檔</button>
        </div>
      </div>
    </section>
  `;
}

export function renderSettings() {
  return `
    ${pageHeader('設定', '公開前端只保存可公開的顯示設定與後端簽發的加密存檔。')}
    <section class="panel">
      <div class="panel-body">
        <div class="empty-state">
          API 網址可公開，但 API Secret、私鑰、存檔加密金鑰、世界 Seed 演算法與任何核心規則都不得放入 GitHub Pages。
        </div>
      </div>
    </section>
  `;
}

export function renderView(state) {
  switch (state.ui.activeView) {
    case 'life': return renderLife(state);
    case 'company': return renderCompany(state);
    case 'politics': return renderPolitics(state);
    case 'news': return renderNews(state);
    case 'save': return renderSave(state);
    case 'settings': return renderSettings(state);
    case 'trading':
    default:
      return renderTrading(state);
  }
}
