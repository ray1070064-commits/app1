import { hasBackendConfig } from './config.js';
import {
  ensureSession,
  healthCheck,
  loadChart,
  loadGameState,
  loadLegacyUi,
  loadLifePanel,
  loadStartupConfig,
  sendGameAction,
} from './api.js';
import {
  persistEncryptedBrowserSave,
  restoreEncryptedBrowserSave,
  scheduleEncryptedAutosave,
} from './browser-save.js';
import {
  getState,
  patchUI,
  setChart,
  setConnected,
  setLegacyUi,
  setLifePanel,
  setServerState,
  setStartup,
  subscribe,
} from './state.js';
import { renderView } from './views-v2.js';
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

function chartLimitForRange(range) {
  return ({ '1M': 40, '3M': 110, '1Y': 380, '3Y': 1120, ALL: 2000 })[range] || 380;
}

function optionalPositiveNumber(id) {
  const raw = String(document.getElementById(id)?.value ?? '').trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : NaN;
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
    if (state.ui.activeView === 'trading') drawMarketChart(state.ui.chart, state.ui);
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

async function refreshLife() {
  if (!getState().connected || !getState().server?.world?.game_started) return;
  try {
    const payload = await loadLifePanel();
    setLifePanel(payload?.life_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入人生中心資料', 'error');
  }
}

async function refreshChart(symbol) {
  if (!getState().connected || !symbol) return;
  try {
    const limit = chartLimitForRange(getState().ui.chartRange);
    setChart(await loadChart(symbol, limit));
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
    if (nextState?.world?.game_started) scheduleEncryptedAutosave();
    if (!options.silent) toast(response?.message || '操作完成', 'success');
    return response;
  } catch (error) {
    toast(error?.message || '操作失敗', 'error');
    return null;
  }
}

async function executeLife(action, payload = {}) {
  const response = await execute(action, payload);
  if (response) await refreshLife();
  return response;
}

async function executeSave(load = false) {
  if (!getState().connected) {
    toast('後端尚未連線。', 'error');
    return;
  }

  try {
    if (load) {
      const response = await restoreEncryptedBrowserSave();
      if (!response) {
        toast('瀏覽器中沒有可載入的加密存檔。', 'error');
        return;
      }
      const nextState = stateFromResponse(response);
      if (nextState) setServerState(nextState);
      const symbol = nextState?.market?.selected_symbol || nextState?.market?.watchlist?.[0]?.symbol;
      if (symbol) {
        patchUI({ selectedSymbol: symbol, activeView: 'trading' });
        await refreshChart(symbol);
      }
      toast('本機加密存檔已載入', 'success');
    } else {
      if (!getState().server?.world?.game_started) {
        toast('尚未開始遊戲，沒有進度可儲存。', 'error');
        return;
      }
      await persistEncryptedBrowserSave();
      toast('進度已加密儲存在這台瀏覽器', 'success');
    }
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

document.addEventListener('change', event => {
  const trading = event.target.closest('[data-trading-ui]');
  if (!trading) return;
  const key = trading.dataset.tradingUi;
  let value = trading.value;
  if (key === 'leverage') value = Math.max(1, Number(value) || 1);
  patchUI({ [key]: value });
});

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view]');
  if (nav) {
    patchUI({ activeView: nav.dataset.view });
    if (nav.dataset.view === 'full') await refreshLegacy();
    if (nav.dataset.view === 'life') await refreshLife();
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

  const watchItem = event.target.closest('.watch-item[data-symbol]');
  if (watchItem) {
    await selectSymbol(watchItem.dataset.symbol);
    return;
  }

  const chartRange = event.target.closest('[data-chart-range]');
  if (chartRange) {
    patchUI({ chartRange: chartRange.dataset.chartRange || '1Y' });
    const symbol = getState().ui.selectedSymbol || getState().server?.market?.selected_symbol;
    if (symbol) await refreshChart(symbol);
    return;
  }

  const indicatorButton = event.target.closest('[data-chart-indicator]');
  if (indicatorButton) {
    const key = indicatorButton.dataset.chartIndicator;
    const indicators = { ...(getState().ui.indicators || {}) };
    indicators[key] = !indicators[key];
    patchUI({ indicators });
    return;
  }

  const lifeSkill = event.target.closest('[data-life-skill]');
  if (lifeSkill) {
    await executeLife('life_start_skill_training', { skill: lifeSkill.dataset.lifeSkill });
    return;
  }

  const lifeApply = event.target.closest('[data-life-apply-job]');
  if (lifeApply) {
    await executeLife('life_apply_job', { job_key: lifeApply.dataset.jobKey, employer: lifeApply.dataset.employer });
    return;
  }

  if (event.target.closest('[data-life-promotion]')) {
    await executeLife('life_apply_promotion');
    return;
  }

  if (event.target.closest('[data-life-resign]')) {
    await executeLife('life_resign_job');
    return;
  }

  const lifeHealth = event.target.closest('[data-life-health]');
  if (lifeHealth) {
    await executeLife('life_health_action', { kind: lifeHealth.dataset.lifeHealth });
    return;
  }

  if (event.target.closest('[data-life-settings]')) {
    await executeLife('life_update_settings', {
      auto_medical: Boolean(document.getElementById('life-auto-medical')?.checked),
      auto_health_threshold: Number(document.getElementById('life-health-threshold')?.value || 28),
      auto_stress_threshold: Number(document.getElementById('life-stress-threshold')?.value || 88),
      daily_living_cost: Number(document.getElementById('life-living-cost')?.value || 50),
    });
    return;
  }

  const lifeChoice = event.target.closest('[data-life-event-choice]');
  if (lifeChoice) {
    await executeLife('resolve_life_event', { choice: Number(lifeChoice.dataset.lifeEventChoice) });
    return;
  }

  if (event.target.closest('[data-life-retire]')) {
    const route = String(document.getElementById('life-retirement-route')?.value || '');
    await executeLife('life_retire', { route });
    return;
  }

  const advancedTrade = event.target.closest('[data-advanced-trade]');
  if (advancedTrade) {
    const symbol = getState().ui.selectedSymbol || getState().server?.market?.selected_symbol;
    const side = document.getElementById('order-action')?.value || 'open';
    const positionSide = document.getElementById('position-side')?.value || 'SPOT';
    const orderType = document.getElementById('order-type')?.value || 'market';
    const quantity = Number(document.getElementById('order-quantity')?.value || 0);
    const leverage = Math.max(1, Math.floor(Number(document.getElementById('order-leverage')?.value || 1)));
    const limitPrice = optionalPositiveNumber('order-limit-price');

    if (!symbol || !Number.isFinite(quantity) || quantity <= 0) {
      toast('請選擇標的並輸入有效數量。', 'error');
      return;
    }
    if (orderType === 'limit' && !Number.isFinite(limitPrice)) {
      toast('限價單必須輸入有效限價。', 'error');
      return;
    }

    const payload = { symbol, side, position_side: positionSide, order_type: orderType, quantity, leverage };
    if (orderType === 'limit') payload.limit_price = limitPrice;
    await execute('trade', payload);
    return;
  }

  const closePosition = event.target.closest('[data-close-position]');
  if (closePosition) {
    const input = document.getElementById(closePosition.dataset.closeInput || '');
    const quantity = Number(input?.value || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast('請輸入有效的平倉數量。', 'error');
      return;
    }
    await execute('trade', { symbol: closePosition.dataset.symbol, side: 'close', position_side: closePosition.dataset.positionSide, order_type: 'market', quantity });
    return;
  }

  const closeAll = event.target.closest('[data-close-all]');
  if (closeAll) {
    const quantity = Number(closeAll.dataset.quantity || 0);
    await execute('trade', { symbol: closeAll.dataset.symbol, side: 'close', position_side: closeAll.dataset.positionSide, order_type: 'market', quantity });
    return;
  }

  const cancelLimit = event.target.closest('[data-cancel-limit]');
  if (cancelLimit) {
    await execute('cancel_limit_order', { order_id: cancelLimit.dataset.cancelLimit });
    return;
  }

  const setProtective = event.target.closest('[data-set-protective]');
  if (setProtective) {
    const symbol = getState().ui.selectedSymbol || getState().server?.market?.selected_symbol;
    const positionSide = document.getElementById('protective-side')?.value || 'SPOT';
    const stopLoss = optionalPositiveNumber('protective-stop');
    const takeProfit = optionalPositiveNumber('protective-take');
    const trailingPct = optionalPositiveNumber('protective-trailing');
    if ([stopLoss, takeProfit, trailingPct].some(Number.isNaN)) {
      toast('保護單欄位必須是正數。', 'error');
      return;
    }
    if (stopLoss == null && takeProfit == null && trailingPct == null) {
      toast('至少輸入停損、停利或移動停損其中一項。', 'error');
      return;
    }
    if (trailingPct != null && trailingPct >= 1) {
      toast('移動停損比例必須小於 1，例如 0.05 代表 5%。', 'error');
      return;
    }
    await execute('set_protective_order', { symbol, position_side: positionSide, stop_loss: stopLoss, take_profit: takeProfit, trailing_pct: trailingPct });
    return;
  }

  const clearProtective = event.target.closest('[data-clear-protective]');
  if (clearProtective) {
    await execute('set_protective_order', { symbol: clearProtective.dataset.symbol, position_side: clearProtective.dataset.positionSide, stop_loss: null, take_profit: null, trailing_pct: null });
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

  if (action === 'new_game') {
    const initBalance = Number(document.getElementById('start-balance')?.value || 0);
    const jobKey = String(document.getElementById('start-job')?.value || '');
    const startAge = Number(document.getElementById('start-age')?.value || 0);
    const worldSeed = String(document.getElementById('start-seed')?.value || '').trim();
    const tutorialEnabled = Boolean(document.getElementById('start-tutorial')?.checked);
    const config = getState().ui.startup || {};
    const validJob = (config.jobs || []).some(job => String(job.key) === jobKey);

    if (!Number.isFinite(initBalance) || initBalance < Number(config.balance?.min ?? 10000) || initBalance > Number(config.balance?.max ?? 5000000)) {
      toast('起始資金超出允許範圍。', 'error');
      return;
    }
    if (!Number.isInteger(startAge) || startAge < Number(config.age?.min ?? 18) || startAge > Number(config.age?.max ?? 60)) {
      toast('起始年齡超出允許範圍。', 'error');
      return;
    }
    if (!validJob) {
      toast('請選擇有效的開局工作。', 'error');
      return;
    }

    const response = await execute('new_game', { init_balance: initBalance, job_key: jobKey, start_age: startAge, world_seed: worldSeed, tutorial_enabled: tutorialEnabled });
    if (response) {
      const nextState = stateFromResponse(response);
      const symbol = nextState?.market?.selected_symbol || nextState?.market?.watchlist?.[0]?.symbol;
      patchUI({ activeView: 'trading', selectedSymbol: symbol || null });
      if (symbol) await refreshChart(symbol);
    }
    return;
  }

  if (action === 'advance_time') {
    await execute('advance_time', { days: Number(actionButton.dataset.days || 1), life_policy: 'safe' });
    const symbol = getState().ui.selectedSymbol || getState().server?.market?.selected_symbol;
    if (symbol) await refreshChart(symbol);
    if (getState().ui.activeView === 'life') await refreshLife();
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

    let payload = null;
    try {
      payload = await restoreEncryptedBrowserSave();
      if (payload) toast('已恢復這台瀏覽器的加密存檔', 'success');
    } catch (restoreError) {
      toast(restoreError?.message || '本機存檔無法恢復，將使用新的 Session。', 'error');
    }

    if (!payload) payload = await loadGameState(false);
    const serverState = stateFromResponse(payload);
    if (serverState) {
      setServerState(serverState);
      const symbol = serverState.market?.selected_symbol || serverState.market?.watchlist?.[0]?.symbol;
      if (symbol) {
        patchUI({ selectedSymbol: symbol });
        await refreshChart(symbol);
      }
      if (!serverState.world?.game_started) {
        const startupPayload = await loadStartupConfig();
        setStartup(startupPayload?.startup || null);
        patchUI({ activeView: 'start' });
      }
    }
  } catch (error) {
    setConnected(false);
    toast(error?.message || '無法讀取遊戲狀態', 'error');
  }
}

boot();
