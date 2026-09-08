import { loadSettlementPanel, loadStartupConfig, sendGameAction } from './api.js';
import { clearEncryptedBrowserSave, persistEncryptedBrowserSave } from './browser-save.js';
import { getState, patchUI, setServerState, setSettlementPanel, setStartup, subscribe } from './state.js';
import { toast } from './ui.js';

let loadingSettlement = false;

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

function ensureHeaderControls() {
  const host = document.querySelector('.connection-block');
  if (!host) return null;
  let controls = document.getElementById('end-game-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'end-game-controls';
    controls.className = 'end-game-controls';
    host.appendChild(controls);
  }
  return controls;
}

function renderHeaderControls(state) {
  const host = ensureHeaderControls();
  if (!host) return;
  const world = state.server?.world || {};
  const show = state.connected && Boolean(world.game_started) && !Boolean(world.game_over);
  if (!show) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }
  host.hidden = false;
  if (state.ui.endGameConfirm) {
    host.innerHTML = `
      <span class="end-game-warning">確定結束這局？</span>
      <button class="topbar-action danger" data-settlement-end-confirm>確認</button>
      <button class="topbar-action" data-settlement-end-cancel>取消</button>`;
  } else {
    host.innerHTML = '<button class="topbar-action" data-settlement-end-first>結束遊戲</button>';
  }
}

async function refreshSettlement() {
  const state = getState();
  if (!state.connected || !state.server?.world?.game_over || loadingSettlement) return;
  if (state.ui.settlementPanel?.available && Number(state.ui.settlementPanel?.day) === Number(state.server?.world?.day)) return;
  loadingSettlement = true;
  try {
    const payload = await loadSettlementPanel();
    setSettlementPanel(payload?.settlement_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入人生結算資料', 'error');
  } finally {
    loadingSettlement = false;
  }
}

subscribe(state => {
  renderHeaderControls(state);
  if (state.server?.world?.game_over) void refreshSettlement();
});

renderHeaderControls(getState());

document.addEventListener('click', async event => {
  if (event.target.closest('[data-settlement-end-first]')) {
    patchUI({ endGameConfirm: true });
    return;
  }
  if (event.target.closest('[data-settlement-end-cancel]')) {
    patchUI({ endGameConfirm: false });
    return;
  }
  if (event.target.closest('[data-settlement-end-confirm]')) {
    try {
      const response = await sendGameAction('settlement_end_game');
      const nextState = stateFromResponse(response);
      if (nextState) setServerState(nextState);
      try {
        await persistEncryptedBrowserSave();
      } catch (saveError) {
        console.warn('Unable to preserve final encrypted save:', saveError);
      }
      await refreshSettlement();
      toast('這局已結束，正在顯示最終結算。', 'success');
    } catch (error) {
      toast(error?.message || '無法結束遊戲', 'error');
    }
    return;
  }

  if (event.target.closest('[data-settlement-restart]')) {
    try {
      // A finished local save would otherwise auto-restore on the next page load.
      // Clear it only when the player explicitly chooses to start a new life.
      clearEncryptedBrowserSave();
      const response = await sendGameAction('settlement_restart');
      const nextState = stateFromResponse(response);
      if (nextState) setServerState(nextState);
      setSettlementPanel(null);
      const startup = await loadStartupConfig();
      setStartup(startup?.startup || null);
      patchUI({ activeView: 'start', endGameConfirm: false, selectedSymbol: null });
      toast('已回到新遊戲設定。', 'success');
    } catch (error) {
      toast(error?.message || '無法重新開始', 'error');
    }
  }
});
