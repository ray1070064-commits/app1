import { hasBackendConfig } from './config.js';
import {
  ensureSession,
  healthCheck,
  loadChart,
  loadGameState,
  loadLegacyUi,
  loadSave,
  saveGame,
  sendGameAction,
} from './api.js';
import {
  getState,
  patchUI,
  setChart,
  setConnected,
  setLegacyUi,
  setServerState,
  subscribe,
} from './state.js';
import { renderView } from './views.js';
import { collectLegacyInputs, renderLegacyCompatibility } from './legacy.js';
import { drawMarketChart } from './chart.js';
import { formatMoney, toast } from './ui.js';

const viewRoot = document.getElementById('view-root');
const backendBanner = document.getElementById('backend-banner');
const connectionDot = document.getElementById('connection-dot');
const connectionLabel = document.getElementById('connection-label');

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

function renderChrome(state) {
  const server = state.server || {};
  const world = server.world || {};
  const day = Number(world.day);
  document.getElementById('summary-date').textContent = Number.isFinite(day) && day > 0 ? `Day ${day}` : '—';
  document.getElementById('summary-cash').textContent = formatMoney(server.player?.cash);
  document.getElementById('summary-networth').textContent = formatMoney(server.player?.net_worth ?? server.player?.networth);

  connectionDot.classList.toggle('is-online', state.connected);
  connectionDot.classList.toggle('is-offline', !state.connected);
  connectionLabel.textContent = state.connected ? '後端已連線' : '後端未連線';
  backendBanner.classList.toggle('is-visible', !state.connected);

  for (const button of document.querySelectorAll('.nav-button')) {
    button.classList.toggle('is-active', button.dataset.view === state.ui.activeView);
  }
}

function render() {
  const state = getState();
  renderChrome(state);
  if (state.ui.activeView === 'full') {
    viewRoot.innerHTML = renderLegacyCompatibility(state.ui.legacy, state.connected);
  } else {
    viewRoot.innerHTML = renderView(state);
    if (state.ui.activeView === 'trading') drawMarketChart(state.ui.chart);
  }
}

subscribe(render);

async function refreshLegacy() {
  if (!getState().connected) return;
  try {
    const payload = await loadLegacyUi();
    const serverState = stateFromResponse(payload);
    if (serverState) setServerState(serverState);
    setLegacyUi(payload?.ui || null);
  } catch (error) {
    toast(error?.message || '無法載入完整功能控制項', 'error');
  }
}

async function refreshChart(symbol) {
  if (!getState().connected || !symbol) return;
  try {
    setChart(await loadChart(symbol, 365));
  } catch (error) {
    setChart(null);
    toast(error?.message || '無法讀取圖表資料', 'error');
  }
}

async function execute(action, payload = {}, options = {}) {
  if (!getState().connected) {
    toast('後端尚未連線，這個操作不會送出。', 'error');
    return null;
  }

  try {
    const response = await sendGameAction(action, payload, options);
    const nextState = stateFromResponse(response);
    if (nextState) setServerState(nextState);
    if (response?.ui) setLegacyUi(response.ui);
    if (!options.silent) toast(response?.message || '操作完成', 'success');
    return response;
  } catch (error) {
    toast(error?.message || '操作失敗', 'error');
    return null;
  }
}

async function executeSave(load = false) {
  if (!getState().connected) {
    toast('後端尚未連線。', 'error');
    return;
  }

  try {
    const response = load ? await loadSave('default') : await saveGame('default');
    const nextState = stateFromResponse(response);
    if (nextState) setServerState(nextState);
    toast(load ? '存檔已載入' : '進度已儲存', 'success');
  } catch (error) {
    toast(error?.message || '存檔操作失敗', 'error');
  }
}

async function selectSymbol(symbol) {
  if (!symbol) return;
  patchUI({ selectedSymbol: symbol });
  const response = await execute('select_symbol', { symbol }, { silent: true });
  if (response) await refreshChart(symbol);
}

document.addEventListener('input', event => {
  const slider = event.target.closest('[data-legacy-input][data-legacy-kind="slider"]');
  if (!slider) return;
  const output = document.querySelector(`[data-legacy-value-for="${CSS.escape(slider.dataset.legacyInput || '')}"]`);
  if (output) output.textContent = slider.value;
});

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view]');
  if (nav) {
    patchUI({ activeView: nav.dataset.view });
    if (nav.dataset.view === 'full') await refreshLegacy();
    return;
  }

  const legacyRefresh = event.target.closest('[data-legacy-refresh]');
  if (legacyRefresh) {
    await refreshLegacy();
    return;
  }

  const legacyButton = event.target.closest('[data-legacy-button]');
  if (legacyButton) {
    const inputs = collectLegacyInputs(document);
    await execute('legacy_widget', {
      control_id: legacyButton.dataset.legacyButton,
      inputs,
    }, { silent: true });
    return;
  }

  const watchItem = event.target.closest('[data-symbol]');
  if (watchItem) {
    await selectSymbol(watchItem.dataset.symbol);
    return;
  }

  const domainButton = event.target.closest('[data-domain][data-command]');
  if (domainButton) {
    const domain = domainButton.dataset.domain;
    const command = domainButton.dataset.command;
    await execute(`${domain}_decision`, { command });
    return;
  }

  const actionButton = event.target.closest('[data-game-action]');
  if (!actionButton) return;

  const action = actionButton.dataset.gameAction;

  if (action === 'advance_time') {
    await execute('advance_time', { days: Number(actionButton.dataset.days || 1), life_policy: 'safe' });
    const symbol = getState().ui.selectedSymbol || getState().server?.market?.selected_symbol;
    if (symbol) await refreshChart(symbol);
    return;
  }

  if (action === 'trade') {
    const server = getState().server || {};
    const firstSymbol = server.market?.watchlist?.[0]?.symbol || server.market?.selected_symbol || null;
    const symbol = getState().ui.selectedSymbol || firstSymbol;
    const side = document.getElementById('order-side')?.value || 'buy';
    const quantity = Number(document.getElementById('order-quantity')?.value || 0);

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0) {
      toast('請選擇標的並輸入有效數量。', 'error');
      return;
    }

    await execute('trade', { symbol, side, position_side: 'SPOT', quantity });
    return;
  }

  if (action === 'save') {
    await executeSave(false);
    return;
  }

  if (action === 'load_save') {
    await executeSave(true);
  }
});

async function boot() {
  render();

  if (!hasBackendConfig()) {
    setConnected(false);
    return;
  }

  const online = await healthCheck();
  setConnected(online);
  if (!online) return;

  try {
    await ensureSession(false);
    const payload = await loadGameState(false);
    const serverState = stateFromResponse(payload);
    if (serverState) {
      setServerState(serverState);
      const symbol = serverState.market?.selected_symbol || serverState.market?.watchlist?.[0]?.symbol;
      if (symbol) {
        patchUI({ selectedSymbol: symbol });
        await refreshChart(symbol);
      }
      if (!serverState.world?.game_started) {
        patchUI({ activeView: 'full' });
        await refreshLegacy();
      }
    }
  } catch (error) {
    setConnected(false);
    toast(error?.message || '無法讀取遊戲狀態', 'error');
  }
}

boot();
