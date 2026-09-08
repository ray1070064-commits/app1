import { escapeHtml, formatMoney, formatPercent } from './ui.js';

function disabledAttr(connected) {
  return connected ? '' : 'disabled';
}

function renderWatchlist(items, selectedSymbol) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<div class="empty-state">等待後端提供市場資料。</div>';
  }
  return `<div class="watchlist">${items.map(item => {
    const symbol = String(item.symbol ?? '');
    const change = Number(item.change_pct);
    const className = Number.isFinite(change) ? (change >= 0 ? 'price-up' : 'price-down') : '';
    return `<button class="watch-item ${symbol === selectedSymbol ? 'is-selected' : ''}" data-symbol="${escapeHtml(symbol)}">
      <span class="watch-symbol">${escapeHtml(item.ticker || symbol || '—')}</span>
      <strong>${escapeHtml(formatMoney(item.price))}</strong>
      <span class="watch-name">${escapeHtml(item.name || '')}</span>
      <span class="${className}">${escapeHtml(formatPercent(item.change_pct))}</span>
    </button>`;
  }).join('')}</div>`;
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
    <div class="trade-row-main">
      <strong>${escapeHtml(order.action)} ${escapeHtml(order.side)}</strong>
      <span>數量 ${escapeHtml(order.quantity)}</span>
      <span>限價 ${escapeHtml(formatMoney(order.limit_price))}</span>
      <span>${escapeHtml(order.leverage || 1)}x</span>
    </div>
    <button class="button danger" data-cancel-limit="${escapeHtml(order.id)}" ${disabledAttr(connected)}>取消委託</button>
  </article>`).join('');
}

function renderProtectiveOrders(protective, selected, connected) {
  const rows = Object.values(protective || {}).filter(order => {
    if (!order || String(order.symbol) !== String(selected)) return false;
    return order.stop_loss != null || order.take_profit != null || order.trailing_pct != null;
  });
  if (!rows.length) return '<div class="trade-empty">此標的尚未設定停損／停利。</div>';
  return rows.map(order => `<article class="trade-row compact-row">
    <div class="trade-row-main">
      <strong>${escapeHtml(order.side)}</strong>
      <span>停損 ${escapeHtml(order.stop_loss == null ? '—' : formatMoney(order.stop_loss))}</span>
      <span>停利 ${escapeHtml(order.take_profit == null ? '—' : formatMoney(order.take_profit))}</span>
      <span>移動 ${escapeHtml(order.trailing_pct == null ? '—' : formatPercent(Number(order.trailing_pct) * 100))}</span>
    </div>
    <button class="button danger" data-clear-protective data-symbol="${escapeHtml(order.symbol)}" data-position-side="${escapeHtml(order.side)}" ${disabledAttr(connected)}>停用保護單</button>
  </article>`).join('');
}

function chartTools(state, connected) {
  const ranges = ['1M', '3M', '1Y', '3Y', 'ALL'];
  const indicators = state.ui.indicators || {};
  return `<div class="chart-toolbar">
    <div class="segmented">${ranges.map(range => `<button class="button ${state.ui.chartRange === range ? 'primary' : ''}" data-chart-range="${range}" ${disabledAttr(connected)}>${range}</button>`).join('')}</div>
    <div class="segmented">
      <button class="button ${indicators.ma20 ? 'primary' : ''}" data-chart-indicator="ma20">MA20</button>
      <button class="button ${indicators.ma50 ? 'primary' : ''}" data-chart-indicator="ma50">MA50</button>
      <button class="button ${indicators.ma200 ? 'primary' : ''}" data-chart-indicator="ma200">MA200</button>
    </div>
  </div>`;
}

export function renderAdvancedTrading(state) {
  const server = state.server || {};
  const market = server.market || {};
  const watchlist = Array.isArray(market.watchlist) ? market.watchlist : [];
  const selected = state.ui.selectedSymbol || market.selected_symbol || watchlist[0]?.symbol || null;
  const asset = watchlist.find(item => String(item.symbol) === String(selected)) || market.selected || null;
  const portfolio = server.portfolio || {};
  const positions = (Array.isArray(portfolio.positions) ? portfolio.positions : []).filter(pos => String(pos.symbol) === String(selected));
  const connected = state.connected;
  const ui = state.ui || {};

  const advanceTools = `<button class="button" data-game-action="advance_time" data-days="1" ${disabledAttr(connected)}>+1 天</button>
    <button class="button" data-game-action="advance_time" data-days="7" ${disabledAttr(connected)}>+7 天</button>
    <button class="button" data-game-action="advance_time" data-days="30" ${disabledAttr(connected)}>+30 天</button>`;

  return `<div class="page-header">
      <div><h1 class="page-title">股票交易</h1><div class="page-subtitle">市價／限價、現貨／多空、槓桿、保護單與 K 線全部走原生 Web action。</div></div>
      <div class="toolbar">${advanceTools}</div>
    </div>
    <div class="trading-grid advanced-trading-grid">
      <section class="panel">
        <div class="panel-header">市場清單</div>
        <div class="panel-body market-scroll">${renderWatchlist(watchlist, selected)}</div>
      </section>

      <section class="panel chart-panel">
        <div class="panel-header trade-panel-header"><span>${escapeHtml(asset?.ticker || selected || '尚未選擇')} ${escapeHtml(asset?.name || '')}</span>${chartTools(state, connected)}</div>
        <div class="chart-box"><div class="chart-empty"><strong>圖表載入中</strong><br>OHLC 由私有後端生成。</div></div>
      </section>

      <section class="panel order-panel">
        <div class="panel-header">進階下單</div>
        <div class="panel-body">
          <div class="metric-grid">
            <div class="metric-card"><span>可用現金</span><strong>${escapeHtml(formatMoney(server.player?.cash))}</strong></div>
            <div class="metric-card"><span>目前價格</span><strong>${escapeHtml(formatMoney(asset?.price))}</strong></div>
            <div class="metric-card"><span>持倉筆數</span><strong>${positions.length}</strong></div>
            <div class="metric-card"><span>累計手續費</span><strong>${escapeHtml(formatMoney(portfolio.fees_paid))}</strong></div>
          </div>

          <div class="form-grid two" style="margin-top:14px">
            <div class="field"><label>動作</label><select id="order-action" class="select" data-trading-ui="orderAction"><option value="open" ${ui.orderAction === 'close' ? '' : 'selected'}>建立／加碼</option><option value="close" ${ui.orderAction === 'close' ? 'selected' : ''}>平倉</option></select></div>
            <div class="field"><label>部位</label><select id="position-side" class="select" data-trading-ui="positionSide"><option value="SPOT" ${ui.positionSide === 'SPOT' ? 'selected' : ''}>SPOT 現貨</option><option value="LONG" ${ui.positionSide === 'LONG' ? 'selected' : ''}>LONG 多單</option><option value="SHORT" ${ui.positionSide === 'SHORT' ? 'selected' : ''}>SHORT 空單</option></select></div>
            <div class="field"><label>委託類型</label><select id="order-type" class="select" data-trading-ui="orderType"><option value="market" ${ui.orderType === 'limit' ? '' : 'selected'}>市價</option><option value="limit" ${ui.orderType === 'limit' ? 'selected' : ''}>限價</option></select></div>
            <div class="field"><label>槓桿</label><input id="order-leverage" class="input" type="number" min="1" step="1" value="${escapeHtml(ui.leverage || 1)}" /></div>
          </div>
          <div class="field"><label>數量</label><input id="order-quantity" class="input" type="number" min="0.000001" step="any" value="${escapeHtml(ui.orderQuantity || 1)}" /></div>
          <div class="field"><label>限價（市價單可留空）</label><input id="order-limit-price" class="input" type="number" min="0.000001" step="any" placeholder="${escapeHtml(asset?.price ?? '')}" /></div>
          <button class="button primary full" data-advanced-trade ${disabledAttr(connected || !selected)}>送出委託</button>

          <div class="trade-divider"></div>
          <strong class="section-label">停損／停利／移動停損</strong>
          <div class="field"><label>套用部位</label><select id="protective-side" class="select"><option value="SPOT">SPOT</option><option value="LONG">LONG</option><option value="SHORT">SHORT</option></select></div>
          <div class="form-grid three">
            <div class="field"><label>停損價</label><input id="protective-stop" class="input" type="number" step="any" min="0" /></div>
            <div class="field"><label>停利價</label><input id="protective-take" class="input" type="number" step="any" min="0" /></div>
            <div class="field"><label>移動比例</label><input id="protective-trailing" class="input" type="number" step="0.001" min="0" max="0.99" placeholder="0.05" /></div>
          </div>
          <button class="button full" data-set-protective ${disabledAttr(connected || !selected)}>設定／更新保護單</button>
        </div>
      </section>
    </div>

    <div class="trade-bottom-grid">
      <section class="panel"><div class="panel-header">目前持倉</div><div class="panel-body trade-list">${renderPositions(positions, connected)}</div></section>
      <section class="panel"><div class="panel-header">未成交限價單</div><div class="panel-body trade-list">${renderPendingOrders(portfolio.pending_limit_orders, selected, connected)}</div></section>
      <section class="panel"><div class="panel-header">保護單</div><div class="panel-body trade-list">${renderProtectiveOrders(portfolio.protective_orders, selected, connected)}</div></section>
    </div>`;
}
