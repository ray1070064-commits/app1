import { loadFamilyPanel, loadLifePanel, sendGameAction } from './api.js';
import { scheduleEncryptedAutosave } from './browser-save.js';
import { getState, setFamilyPanel, setLifePanel, setServerState } from './state.js';
import { toast } from './ui.js';

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

async function refreshFamily() {
  if (!getState().connected || !getState().server?.world?.game_started) return;
  try {
    const payload = await loadFamilyPanel();
    setFamilyPanel(payload?.family_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入家庭資料', 'error');
  }
}

async function refreshLifeAfterFamily() {
  try {
    const payload = await loadLifePanel();
    setLifePanel(payload?.life_panel || null);
  } catch {
    // Family actions are still valid even if the secondary retirement/career refresh fails.
  }
}

async function executeFamily(action, payload = {}) {
  if (!getState().connected) {
    toast('後端尚未連線。', 'error');
    return null;
  }
  try {
    const response = await sendGameAction(action, payload);
    const state = stateFromResponse(response);
    if (state) setServerState(state);
    if (state?.world?.game_started) scheduleEncryptedAutosave();
    await Promise.all([refreshFamily(), refreshLifeAfterFamily()]);
    toast(response?.message || '家庭操作完成', 'success');
    return response;
  } catch (error) {
    toast(error?.message || '家庭操作失敗', 'error');
    return null;
  }
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view="life"]');
  if (nav) {
    await refreshFamily();
    return;
  }

  if (event.target.closest('[data-family-find]')) {
    const meeting = String(document.getElementById('family-meeting-method')?.value || '');
    await executeFamily('family_find_partner', { meeting_method: meeting });
    return;
  }
  if (event.target.closest('[data-family-start-dating]')) {
    await executeFamily('family_start_dating');
    return;
  }
  if (event.target.closest('[data-family-skip-candidate]')) {
    await executeFamily('family_skip_candidate');
    return;
  }

  const dating = event.target.closest('[data-family-dating-action]');
  if (dating) {
    await executeFamily('family_dating_action', { kind: dating.dataset.familyDatingAction });
    return;
  }
  if (event.target.closest('[data-family-marry]')) {
    await executeFamily('family_marry');
    return;
  }
  if (event.target.closest('[data-family-end-dating]')) {
    await executeFamily('family_end_dating');
    return;
  }
  if (event.target.closest('[data-family-add-child]')) {
    const name = String(document.getElementById('family-child-name')?.value || '').trim();
    await executeFamily('family_add_child', { name });
    return;
  }

  const parenting = event.target.closest('[data-family-parenting]');
  if (parenting) {
    await executeFamily('family_parenting_action', {
      child_index: Number(parenting.dataset.childIndex),
      kind: parenting.dataset.familyParenting,
    });
    return;
  }

  const education = event.target.closest('[data-family-education]');
  if (education) {
    const input = document.getElementById(education.dataset.input || '');
    const amount = Number(input?.value || 0);
    if (!Number.isFinite(amount) || amount < 500) {
      toast('教育基金單次至少投入 500。', 'error');
      return;
    }
    await executeFamily('family_contribute_education', {
      child_index: Number(education.dataset.childIndex),
      amount,
    });
    return;
  }

  const activity = event.target.closest('[data-family-activity]');
  if (activity) {
    await executeFamily('family_activity', { kind: activity.dataset.familyActivity });
    return;
  }

  if (event.target.closest('[data-family-save-automation]')) {
    await executeFamily('family_update_automation', {
      enabled: Boolean(document.getElementById('family-auto-enabled')?.checked),
      cash_reserve: Number(document.getElementById('family-auto-reserve')?.value || 0),
      relationship_threshold: Number(document.getElementById('family-auto-relation')?.value || 70),
      dating_interval_days: Number(document.getElementById('family-auto-dating')?.value || 7),
      parenting_interval_days: Number(document.getElementById('family-auto-parenting')?.value || 30),
    });
    return;
  }

  const asset = event.target.closest('[data-family-asset]');
  if (asset) {
    await executeFamily('family_trade_asset', {
      asset_type: asset.dataset.assetType,
      key: asset.dataset.assetKey,
      side: asset.dataset.side,
    });
  }
});

document.addEventListener('change', async event => {
  const path = event.target.closest('[data-family-child-path]');
  if (!path) return;
  await executeFamily('family_set_child_path', {
    child_index: Number(path.dataset.childIndex),
    path: path.value,
  });
});

// app.js handles boot and primary state. If the life view is already active after a future
// navigation restore, this makes the family panel self-healing without a full page reload.
queueMicrotask(() => {
  if (getState().ui.activeView === 'life' && getState().server?.world?.game_started) refreshFamily();
});
