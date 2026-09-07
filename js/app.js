import { hasBackendConfig } from './config.js';
import { healthCheck, loadGameState, sendGameAction, saveGame, loadSave } from './api.js';
import { getState, patchUI, setConnected, setServerState, subscribe } from './state.js';
import { renderView } from './views.js';
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
  document.getElementById('summary-date').textContent = server.world?.date || server.date || '—';
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
  viewRoot.innerHTML = renderView(state);
}

subscribe(render);

async function execute(action, payload = {}) {
  if (!getState().connected) {
    toast('後端尚未連線，這個操作不會送出。', 'error');
    return;
  }

  try {
    const response = await sendGameAction(action, payload);
    const nextState = stateFromResponse(response);
    if (nextState) setServerState(nextState);
    toast(response?.message || '操作完成', 'success');
  } catch (error) {
    toast(error?.message || '操作失敗', 'error');
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

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view]');
  if (nav) {
    patchUI({ activeView: nav.dataset.view });
    return;
  }

  const watchItem = event.target.closest('[data-symbol]');
  if (watchItem) {
    patchUI({ selectedSymbol: watchItem.dataset.symbol });
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
    await execute('advance_time', { days: Number(actionButton.dataset.days || 1) });
    return;
  }

  if (action === 'trade') {
    const server = getState().server || {};
    const firstSymbol = server.market?.watchlist?.[0]?.symbol || null;
    const symbol = getState().ui.selectedSymbol || firstSymbol;
    const side = document.getElementById('order-side')?.value || 'buy';
    const quantity = Number(document.getElementById('order-quantity')?.value || 0);

    if (!symbol || !Number.isInteger(quantity) || quantity <= 0) {
      toast('請選擇標的並輸入有效數量。', 'error');
      return;
    }

    await execute('trade', { symbol, side, quantity });
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
    const payload = await loadGameState();
    const serverState = stateFromResponse(payload);
    if (serverState) setServerState(serverState);
  } catch (error) {
    setConnected(false);
    toast(error?.message || '無法讀取遊戲狀態', 'error');
  }
}

boot();
