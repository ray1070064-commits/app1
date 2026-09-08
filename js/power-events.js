import { loadPowerPanel, sendGameAction } from './api.js';
import { scheduleEncryptedAutosave } from './browser-save.js';
import { getState, setPowerPanel, setServerState } from './state.js';
import { toast } from './ui.js';

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

async function refreshPower() {
  if (!getState().connected || !getState().server?.world?.game_started) return;
  try {
    const payload = await loadPowerPanel();
    setPowerPanel(payload?.power_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入政治／法律資料', 'error');
  }
}

async function executePower(action, payload = {}) {
  if (!getState().connected) {
    toast('後端尚未連線。', 'error');
    return null;
  }
  try {
    const response = await sendGameAction(action, payload);
    const next = stateFromResponse(response);
    if (next) setServerState(next);
    if (next?.world?.game_started) scheduleEncryptedAutosave();
    await refreshPower();
    toast(response?.message || '操作完成', 'success');
    return response;
  } catch (error) {
    toast(error?.message || '操作失敗', 'error');
    return null;
  }
}

function positiveNumber(id, fallback = 0) {
  const value = Number(document.getElementById(id)?.value ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : NaN;
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view="politics"]');
  if (nav) {
    await refreshPower();
    return;
  }

  const inside = event.target.closest('[data-insider-source-index]');
  if (inside) {
    const index = Number(inside.dataset.insiderSourceIndex);
    const source = getState().ui.powerPanel?.insider?.sources?.[index];
    if (!source) return;
    const symbol = String(document.getElementById(`inside-symbol-${index}`)?.value || '');
    await executePower('insider_purchase', {
      source: source.source,
      skill_key: source.skill_key,
      symbol,
    });
    return;
  }

  const button = event.target.closest('[data-power-action]');
  if (!button) return;
  const action = button.dataset.powerAction;

  if (action === 'politics_start_training' || action === 'underworld_start_training') {
    await executePower(action);
    return;
  }

  if (action === 'politics_campaign') {
    const amount = positiveNumber('politics-campaign-amount');
    if (!Number.isFinite(amount) || amount < 1000) {
      toast('公開倡議投入至少 1,000。', 'error');
      return;
    }
    await executePower(action, {
      direction: String(document.getElementById('politics-direction')?.value || 'neutral'),
      amount,
    });
    return;
  }

  if (action === 'politics_lobby') {
    await executePower(action, { symbol: String(document.getElementById('politics-lobby-symbol')?.value || '') });
    return;
  }

  if (action === 'underworld_set_paused') {
    await executePower(action, { paused: Boolean(document.getElementById('underworld-paused')?.checked) });
    return;
  }

  if (action === 'underworld_smear') {
    await executePower(action, { symbol: String(document.getElementById('underworld-smear-symbol')?.value || '') });
    return;
  }

  if (action === 'underworld_black_politics') {
    const amount = positiveNumber('underworld-black-amount');
    if (!Number.isFinite(amount) || amount < 5000) {
      toast('地下政治介入至少投入 5,000 地下資金。', 'error');
      return;
    }
    await executePower(action, {
      direction: String(document.getElementById('underworld-black-direction')?.value || 'neutral'),
      amount,
    });
    return;
  }

  if (action === 'underworld_convert_dirty_money') {
    const amount = positiveNumber('underworld-convert-amount');
    if (!Number.isFinite(amount) || amount < 500) {
      toast('單次至少處理 500 地下資金。', 'error');
      return;
    }
    await executePower(action, { amount });
    return;
  }

  if (action === 'insider_open_position') {
    const stake = positiveNumber('inside-stake');
    if (!Number.isFinite(stake) || stake < 1000) {
      toast('投入金額至少 1,000。', 'error');
      return;
    }
    await executePower(action, { stake });
  }
});

queueMicrotask(() => {
  if (getState().ui.activeView === 'politics' && getState().server?.world?.game_started) refreshPower();
});
