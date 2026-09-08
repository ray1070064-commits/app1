import { escapeHtml, formatMoney, formatPercent } from './ui.js';

function disabledAttr(connected) {
  return connected ? '' : 'disabled';
}

function quoteMap(server) {
  const rows = Array.isArray(server?.market?.watchlist) ? server.market.watchlist : [];
  return new Map(rows.map(row => [String(row.symbol), row]));
}

function marketRow(item, quote, selectedSymbol, inWatchlist, connected) {
  const symbol = String(item.symbol || '');
  const price = Number(quote?.price);
  const change = Number(quote?.change_pct);
  const className = Number.isFinite(change) ? (change >= 0 ? 'price-up' : 'price-down') : '';
  return `<div class="watch-line ${symbol === selectedSymbol ? 'is-selected' : ''}">
    <button class="watch-item" data-symbol="${escapeHtml(symbol)}">
      <span class="watch-symbol">${escapeHtml(item.ticker || symbol || '—')}</span>
      <strong>${escapeHtml(Number.isFinite(price) ? formatMoney(price) : '—')}</strong>
      <span class="watch-name">${escapeHtml(item.name || '')}</span>
      <span class="${className}">${escapeHtml(Number.isFinite(change) ? formatPercent(change) : '—')}</span>
    </button>
    <button class="button compact ${inWatchlist ? 'danger' : ''}" data-watchlist-${inWatchlist ? 'remove' : 'add'}="${escapeHtml(symbol)}" ${disabledAttr(connected)}>${inWatchlist ? '−' : '+'}</button>
  </div>`;
}

function renderMarketExplorer(state, selected) {
  const panel = state.ui.marketPanel || {};
  const server = state.server || {};
  const quotes = quoteMap(server);
  const watchlist = Array.isArray(panel.watchlist) ? panel.watchlist : [];
  const assets = Array.isArray(panel.assets) ? panel.assets : [];
  const watched = new Set(watchlist.map(row => String(row.symbol)));
  const search = String(state.ui.marketSearch || '').trim().toLowerCase();
  const category = String(state.ui.marketCategory || '全部');
  const heldOnly = Boolean(state.ui.marketHeldOnly);

  const filtered = assets.filter(item => {
    if (heldOnly && !item.held) return false;
    if (category !== '全部' && String(item.category) !== category) return false;
    if (!search) return true;
    return [item.symbol, item.ticker, item.name, item.category, item.sector].some(v => String(v || '').toLowerCase().includes(search));
  }).slice(0, 40);

  const categories = ['全部', ...(Array.isArray(panel.categories) ? panel.categories : [])];
  return `<div class="market-explorer">
    <div class="market-tools-inline">
      <input id="market-search" class="input compact" value="${escapeHtml(state.ui.marketSearch || '')}" placeholder="搜尋代號／名稱／產業" />
      <select id="market-category" class="select compact">${categories.map(c => `<option value="${escapeHtml(c)}" ${c === category ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select>
      <label class="inline-check"><input id="market-held-only" type="checkbox" ${heldOnly ? 'checked' : ''}>只看持倉</label>
      <button class="button" data-market-filter-apply>套用</button>
    </div>
    <div class="market-section-label">Watchlist ${watchlist.length}/20</div>
    <div class="watchlist">${watchlist.length ? watchlist.map(item => marketRow(item, quotes.get(String(item.symbol)), selected, true, state.connected)).join('') : '<div class="trade-empty">Watchlist 目前是空的。</div>'}</div>
    <details class="market-browser"><summary>市場探索｜${filtered.length} 筆</summary>
      <div class="watchlist market-search-results">${filtered.length ? filtered.map(item => marketRow(item, quotes.get(String(item.symbol)), selected, watched.has(String(item.symbol)), state.connected)).join('') : '<div class="trade-empty">沒有符合條件的標的。</div>'}</div>
    </details>
  </div>`;
}

function renderPositions(positions, connected) {
  if (!positions.length) return '<div class="trade-empty">目前此標的沒有持倉。</div>';
  return positions.map((pos, index) => {
    const key = `${String(pos.symbol)}-${String(pos.side)}-${index}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const pnl = Number(pos.unrealized_pnl || 0);
    return `<article class="trade-row">
      <div class="trade-row-main">
        <strong>${escapeHtml(pos.side)}</strong>
        <span>數量 ${escapeHtml(pos.size)}</span>
        <span>均價 ${escapeHtml(formatMoney(pos.entry_price))}</span>
        <span>現價 ${escapeHtml(formatMoney(pos.current_price))}</span>
        <span class="${pnl >= 0 ? 'price-up' : 'price-down'}">損益 ${escapeHtml(formatMoney(pnl))}</span>
        <span>${escapeHtml(pos.leverage || 1)}x</span>
      </div>
      <div class="trade-row-actions">
        <input id="close-qty-${key}" class="input compact" type="number" min="0.000001" step="any" value="${escapeHtml(pos.size)}" />
        <button class="button" data-close-position data-close-input="close-qty-${key}" data-symbol="${escapeHtml(pos.symbol)}" data-position-side="${escapeHtml(pos.side)}" ${disabledAttr(connected)}>部分平倉</button>
        <button class="button danger" data-close-all data-symbol="${escapeHtml(pos.symbol)}" data-position-side="${escapeHtml(pos.side)}" data-quantity="${escapeHtml(pos.size)}" ${disabledAttr(connected)}>全部平倉</button>
      </div>
    </article>`;
  }).join('');
}

function renderPendingOrders(orders, selected, connected) {
  const rows = (Array.isArray(orders) ? orders : []).filter(order => String(order.symbol) === String(selected));
  if (!rows.length) return '<div class="trade-empty">此標的沒有未成交限價單。</div>';
  return rows.map(order => `<article class="trade-row compact-row">
    <div class="trade-row-main"><strong>${escapeHtml(order.action)} ${escapeHtml(order.side)}</strong><span>數量 ${escapeHtml(order.quantity)}</span><span>限價 ${escapeHtml(formatMoney(order.limit_price))}</span><span>${escapeHtml(order.leverage || 1)}x</span></div>
    <button class="button danger" data-cancel-limit="${escapeHtml(order.id)}" ${disabledAttr(connected)}>取消委託</button>
  </article>`).join('');
}

function renderProtectiveOrders(protective, selected, connected) {
  const rows = Object.values(protective || {}).filter(order => order && String(order.symbol) === String(selected) && (order.stop_loss != null || order.take_profit != null || order.trailing_pct != null));
  if (!rows.length) return '<div class="trade-empty">此標的尚未設定停損／停利。</div>';
  return rows.map(order => `<article class="trade-row compact-row">
    <div class="trade-row-main"><strong>${escapeHtml(order.side)}</strong><span>停損 ${escapeHtml(order.stop_loss == null ? '—' : formatMoney(order.stop_loss))}</span><span>停利 ${escapeHtml(order.take_profit == null ? '—' : formatMoney(order.take_profit))}</span><span>移動 ${escapeHtml(order.trailing_pct == null ? '—' : formatPercent(Number(order.trailing_pct) * 100))}</span></div>
    <button class="button danger" data-clear-protective data-symbol="${escapeHtml(order.symbol)}" data-position-side="${escapeHtml(order.side)}" ${disabledAttr(connected)}>停用保護單</button>
  </article>`).join('');
}

function indicatorTools(state) {
  const cfg = state.ui.marketPanel?.indicators || { mode: 'volume', ma1: 20, ma2: 50, ma3: 200, rsi_period: 14, macd_fast: 12, macd_slow: 26, macd_signal: 9 };
  const ranges = ['1M', '3M', '1Y', '3Y', 'ALL'];
  return `<div class="chart-toolbar">
    <div class="segmented">${ranges.map(range => `<button class="button ${state.ui.chartRange === range ? 'primary' : ''}" data-chart-range="${range}">${range}</button>`).join('')}</div>
    <details class="indicator-settings"><summary>技術指標</summary>
      <div class="indicator-form">
        <select id="indicator-mode" class="select compact"><option value="volume" ${cfg.mode === 'volume' ? 'selected' : ''}>成交量</option><option value="rsi" ${cfg.mode === 'rsi' ? 'selected' : ''}>RSI</option><option value="macd" ${cfg.mode === 'macd' ? 'selected' : ''}>MACD</option></select>
        <input id="indicator-ma1" class="input compact" type="number" min="2" max="500" value="${escapeHtml(cfg.ma1)}" title="MA1" />
        <input id="indicator-ma2" class="input compact" type="number" min="2" max="500" value="${escapeHtml(cfg.ma2)}" title="MA2" />
        <input id="indicator-ma3" class="input compact" type="number" min="2" max="800" value="${escapeHtml(cfg.ma3)}" title="MA3" />
        <input id="indicator-rsi" class="input compact" type="number" min="2" max="100" value="${escapeHtml(cfg.rsi_period)}" title="RSI period" />
        <input id="indicator-fast" class="input compact" type="number" min="2" max="100" value="${escapeHtml(cfg.macd_fast)}" title="MACD fast" />
        <input id="indicator-slow" class="input compact" type="number" min="3" max="200" value="${escapeHtml(cfg.macd_slow)}" title="MACD slow" />
        <input id="indicator-signal" class="input compact" type="number" min="2" max="100" value="${escapeHtml(cfg.macd_signal)}" title="MACD signal" />
        <button class="button primary" data-indicator-settings-save>套用</button>
      </div>
    </details>
  </div>`;
}

function advanceTools(state) {
  const cfg = state.ui.marketPanel?.advance || { policy: 'pause', reserve: 0, policies: [] };
  const policies = Array.isArray(cfg.policies) && cfg.policies.length ? cfg.policies : [
    { key: 'pause', label: '遇事件暫停' }, { key: 'safe', label: '保守自動處理' }, { key: 'ignore', label: '自動忽略' },
  ];
  return `<div class="advance-native-tools">
    <select id="advance-policy" class="select compact">${policies.map(p => `<option value="${escapeHtml(p.key)}" ${p.key === cfg.policy ? 'selected' : ''}>${escapeHtml(p.label)}</option>`).join('')}</select>
    <input id="advance-reserve" class="input compact" type="number" min="0" step="1000" value="${escapeHtml(cfg.reserve || 0)}" title="保留現金" />
    <button class="button" data-advance-policy-save>儲存策略</button>
    <button class="button" data-game-action="advance_time" data-days="1">+1 天</button>
    <button class="button" data-game-action="advance_time" data-days="7">+7 天</button>
    <button class="button" data-game-action="advance_time" data-days="30">+30 天</button>
    <button class="button" data-game-action="advance_time" data-days="180">+半年</button>
    <button class="button" data-game-action="advance_time" data-days="365">+1 年</button>
  </div>`;
}

function dcaPanel(state, selected) {
  const dca = state.ui.marketPanel?.dca || {};
  const plans = Array.isArray(dca.plans) ? dca.plans : [];
  const plan = plans.find(row => String(row.symbol) === String(selected));
  const frequencies = Array.isArray(dca.frequencies) ? dca.frequencies : [7, 14, 30, 90];
  const amount = plan?.amount ?? 500;
  const frequency = plan?.frequency ?? 30;
  return `<section class="panel"><div class="panel-header">定期定額 DCA</div><div class="panel-body">
    <div class="form-grid two"><div class="field"><label>每次投入</label><input id="dca-amount" class="input" type="number" min="10" step="50" value="${escapeHtml(amount)}"></div><div class="field"><label>週期</label><select id="dca-frequency" class="select">${frequencies.map(v => `<option value="${v}" ${Number(v) === Number(frequency) ? 'selected' : ''}>每 ${v} 天</option>`).join('')}</select></div></div>
    <div class="button-row"><button class="button primary" data-dca-save data-symbol="${escapeHtml(selected || '')}">儲存／啟用</button><button class="button danger" data-dca-stop data-symbol="${escapeHtml(selected || '')}" ${plan ? '' : 'disabled'}>停止</button></div>
    <div class="muted">${plan ? `${plan.enabled ? '執行中' : '已停止'}｜下次 Day ${Number(plan.next_day || 0)}` : '目前沒有此標的的 DCA 計畫。'}</div>
    <div class="metric-grid compact-metrics"><div class="metric-card"><span>累計現金收益</span><strong>${escapeHtml(formatMoney(dca.income_received || 0))}</strong></div><div class="metric-card"><span>交易手續費</span><strong>${escapeHtml(formatMoney(dca.fees_paid || 0))}</strong></div></div>
  </div></section>`;
}

export function renderAdvancedTrading(state) {
  const server = state.server || {};
  const market = server.market || {};
  const panel = state.ui.marketPanel || {};
  const quoteRows = Array.isArray(market.watchlist) ? market.watchlist : [];
  const selected = state.ui.selectedSymbol || panel.selected_symbol || market.selected_symbol || quoteRows[0]?.symbol || null;
  const asset = quoteRows.find(item => String(item.symbol) === String(selected)) || market.selected || null;
  const portfolio = server.portfolio || {};
  const positions = (Array.isArray(portfolio.positions) ? portfolio.positions : []).filter(pos => String(pos.symbol) === String(selected));
  const connected = state.connected;
  const ui = state.ui || {};

  return `<div class="page-header">
      <div><h1 class="page-title">股票交易</h1><div class="page-subtitle">Watchlist／DCA／RSI-MACD／推進策略皆已原生化；市場核心仍由私有 Python 執行。</div></div>
      <div class="toolbar">${advanceTools(state)}</div>
    </div>
    <div class="trading-grid advanced-trading-grid">
      <section class="panel"><div class="panel-header">Watchlist／市場探索</div><div class="panel-body market-scroll">${renderMarketExplorer(state, selected)}</div></section>
      <section class="panel chart-panel"><div class="panel-header trade-panel-header"><span>${escapeHtml(asset?.ticker || selected || '尚未選擇')} ${escapeHtml(asset?.name || '')}</span>${indicatorTools(state)}</div><div class="chart-box"><div class="chart-empty"><strong>圖表載入中</strong><br>OHLC 由私有後端生成。</div></div></section>
      <section class="panel order-panel"><div class="panel-header">進階下單</div><div class="panel-body">
        <div class="metric-grid"><div class="metric-card"><span>可用現金</span><strong>${escapeHtml(formatMoney(server.player?.cash))}</strong></div><div class="metric-card"><span>目前價格</span><strong>${escapeHtml(formatMoney(asset?.price))}</strong></div><div class="metric-card"><span>持倉筆數</span><strong>${positions.length}</strong></div><div class="metric-card"><span>累計手續費</span><strong>${escapeHtml(formatMoney(portfolio.fees_paid))}</strong></div></div>
        <div class="form-grid two" style="margin-top:14px">
          <div class="field"><label>動作</label><select id="order-action" class="select" data-trading-ui="orderAction"><option value="open" ${ui.orderAction === 'close' ? '' : 'selected'}>建立／加碼</option><option value="close" ${ui.orderAction === 'close' ? 'selected' : ''}>平倉</option></select></div>
          <div class="field"><label>部位</label><select id="position-side" class="select" data-trading-ui="positionSide"><option value="SPOT" ${ui.positionSide === 'SPOT' ? 'selected' : ''}>SPOT 現貨</option><option value="LONG" ${ui.positionSide === 'LONG' ? 'selected' : ''}>LONG 多單</option><option value="SHORT" ${ui.positionSide === 'SHORT' ? 'selected' : ''}>SHORT 空單</option></select></div>
          <div class="field"><label>委託類型</label><select id="order-type" class="select" data-trading-ui="orderType"><option value="market" ${ui.orderType === 'limit' ? '' : 'selected'}>市價</option><option value="limit" ${ui.orderType === 'limit' ? 'selected' : ''}>限價</option></select></div>
          <div class="field"><label>槓桿</label><input id="order-leverage" class="input" type="number" min="1" step="1" value="${escapeHtml(ui.leverage || 1)}" /></div>
        </div>
        <div class="field"><label>數量</label><input id="order-quantity" class="input" type="number" min="0.000001" step="any" value="${escapeHtml(ui.orderQuantity || 1)}" /></div>
        <div class="field"><label>限價（市價單可留空）</label><input id="order-limit-price" class="input" type="number" min="0.000001" step="any" placeholder="${escapeHtml(asset?.price ?? '')}" /></div>
        <button class="button primary full" data-advanced-trade ${disabledAttr(connected || !selected)}>送出委託</button>
        <div class="trade-divider"></div><strong class="section-label">停損／停利／移動停損</strong>
        <div class="field"><label>套用部位</label><select id="protective-side" class="select"><option value="SPOT">SPOT</option><option value="LONG">LONG</option><option value="SHORT">SHORT</option></select></div>
        <div class="form-grid three"><div class="field"><label>停損價</label><input id="protective-stop" class="input" type="number" step="any" min="0" /></div><div class="field"><label>停利價</label><input id="protective-take" class="input" type="number" step="any" min="0" /></div><div class="field"><label>移動比例</label><input id="protective-trailing" class="input" type="number" step="0.001" min="0" max="0.99" placeholder="0.05" /></div></div>
        <button class="button full" data-set-protective ${disabledAttr(connected || !selected)}>設定／更新保護單</button>
      </div></section>
    </div>
    <div class="trade-bottom-grid">
      ${dcaPanel(state, selected)}
      <section class="panel"><div class="panel-header">目前持倉</div><div class="panel-body trade-list">${renderPositions(positions, connected)}</div></section>
      <section class="panel"><div class="panel-header">未成交限價單</div><div class="panel-body trade-list">${renderPendingOrders(portfolio.pending_limit_orders, selected, connected)}</div></section>
      <section class="panel"><div class="panel-header">保護單</div><div class="panel-body trade-list">${renderProtectiveOrders(portfolio.protective_orders, selected, connected)}</div></section>
    </div>`;
}
