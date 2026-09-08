import { loadChart, loadMarketPanel, sendGameAction } from './api.js';
import { scheduleEncryptedAutosave } from './browser-save.js';
import { getState, patchUI, setChart, setMarketPanel, setServerState } from './state.js';
import { toast } from './ui.js';

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

function chartLimitForRange(range) {
  return ({ '1M': 40, '3M': 110, '1Y': 380, '3Y': 1120, ALL: 2000 })[range] || 380;
}

async function refreshMarketPanel() {
  if (!getState().connected || !getState().server?.world?.game_started) return null;
  try {
    const payload = await loadMarketPanel();
    setMarketPanel(payload?.market_panel || null);
    return payload?.market_panel || null;
  } catch (error) {
    toast(error?.message || '無法載入市場工具資料', 'error');
    return null;
  }
}

async function refreshChart() {
  const state = getState();
  const symbol = state.ui.selectedSymbol || state.server?.market?.selected_symbol;
  if (!state.connected || !symbol) return;
  try {
    setChart(await loadChart(symbol, chartLimitForRange(state.ui.chartRange)));
  } catch (error) {
    toast(error?.message || '無法更新圖表資料', 'error');
  }
}

async function executeMarket(action, payload = {}, { silent = false } = {}) {
  if (!getState().connected) {
    toast('後端尚未連線。', 'error');
    return null;
  }
  try {
    const response = await sendGameAction(action, payload);
    const nextState = stateFromResponse(response);
    if (nextState) setServerState(nextState);
    if (nextState?.world?.game_started) scheduleEncryptedAutosave();
    await refreshMarketPanel();
    if (!silent) toast(response?.message || '操作完成', 'success');
    return response;
  } catch (error) {
    toast(error?.message || '市場操作失敗', 'error');
    return null;
  }
}

function numberValue(id, fallback = 0) {
  const value = Number(document.getElementById(id)?.value ?? fallback);
  return Number.isFinite(value) ? value : NaN;
}

// Capture advance buttons before the legacy generic app handler so the saved
// pause/safe/ignore policy is always respected instead of hard-coding one mode.
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-game-action="advance_time"]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const state = getState();
  const advance = state.ui.marketPanel?.advance || {};
  const days = Math.max(1, Math.min(365, Number(button.dataset.days || 1)));
  const policy = String(advance.policy || 'pause');
  const reserve = Math.max(0, Number(advance.reserve || 0));

  const response = await executeMarket('advance_time', { days, life_policy: policy, reserve });
  if (response) await refreshChart();
}, true);

document.addEventListener('click', async event => {
  const filter = event.target.closest('[data-market-filter-apply]');
  if (filter) {
    patchUI({
      marketSearch: String(document.getElementById('market-search')?.value || ''),
      marketCategory: String(document.getElementById('market-category')?.value || '全部'),
      marketHeldOnly: Boolean(document.getElementById('market-held-only')?.checked),
    });
    return;
  }

  const add = event.target.closest('[data-watchlist-add]');
  if (add) {
    await executeMarket('market_watchlist_add', { symbol: add.dataset.watchlistAdd });
    return;
  }

  const remove = event.target.closest('[data-watchlist-remove]');
  if (remove) {
    await executeMarket('market_watchlist_remove', { symbol: remove.dataset.watchlistRemove });
    return;
  }

  const dcaSave = event.target.closest('[data-dca-save]');
  if (dcaSave) {
    const amount = numberValue('dca-amount');
    const frequency = Math.floor(numberValue('dca-frequency'));
    if (!Number.isFinite(amount) || amount < 10 || ![7, 14, 30, 90].includes(frequency)) {
      toast('DCA 金額或週期格式錯誤。', 'error');
      return;
    }
    await executeMarket('market_set_dca', { symbol: dcaSave.dataset.symbol, amount, frequency });
    return;
  }

  const dcaStop = event.target.closest('[data-dca-stop]');
  if (dcaStop) {
    await executeMarket('market_stop_dca', { symbol: dcaStop.dataset.symbol });
    return;
  }

  if (event.target.closest('[data-indicator-settings-save]')) {
    const payload = {
      mode: String(document.getElementById('indicator-mode')?.value || 'volume'),
      ma1: Math.floor(numberValue('indicator-ma1')),
      ma2: Math.floor(numberValue('indicator-ma2')),
      ma3: Math.floor(numberValue('indicator-ma3')),
      rsi_period: Math.floor(numberValue('indicator-rsi')),
      macd_fast: Math.floor(numberValue('indicator-fast')),
      macd_slow: Math.floor(numberValue('indicator-slow')),
      macd_signal: Math.floor(numberValue('indicator-signal')),
    };
    if (Object.values(payload).some(v => typeof v === 'number' && !Number.isFinite(v))) {
      toast('技術指標參數格式錯誤。', 'error');
      return;
    }
    await executeMarket('market_set_indicator_settings', payload);
    return;
  }

  if (event.target.closest('[data-advance-policy-save]')) {
    const policy = String(document.getElementById('advance-policy')?.value || 'pause');
    const reserve = numberValue('advance-reserve', 0);
    if (!['pause', 'safe', 'ignore'].includes(policy) || !Number.isFinite(reserve) || reserve < 0) {
      toast('推進策略設定格式錯誤。', 'error');
      return;
    }
    await executeMarket('market_set_advance_policy', { policy, reserve });
  }
});

// The main boot sequence owns session restoration. Wait until it has loaded a
// playable server state, then hydrate the market tools panel. New-game clicks
// are also re-checked so no app.js rewrite is required.
let hydrateAttempts = 0;
const hydrateTimer = setInterval(async () => {
  hydrateAttempts += 1;
  const state = getState();
  if (state.connected && state.server?.world?.game_started && !state.ui.marketPanel) {
    await refreshMarketPanel();
  }
  if (hydrateAttempts > 120 || state.ui.marketPanel) clearInterval(hydrateTimer);
}, 500);

document.addEventListener('click', event => {
  if (!event.target.closest('[data-game-action="new_game"]')) return;
  setTimeout(() => refreshMarketPanel(), 900);
});
