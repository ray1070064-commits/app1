import { loadLifePanel, loadNewsPanel, loadPttPanel, loadProgressPanel, sendGameAction } from './api.js';
import { scheduleEncryptedAutosave } from './browser-save.js';
import { getState, patchUI, setLifePanel, setNewsPanel, setProgressPanel, setPttPanel, setServerState } from './state.js';
import { toast } from './ui.js';

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

async function refreshNews() {
  if (!getState().connected || !getState().server?.world?.game_started) return;
  try {
    const [news, ptt] = await Promise.all([loadNewsPanel(), loadPttPanel()]);
    setNewsPanel(news?.news_panel || null);
    setPttPanel(ptt?.ptt_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入新聞／事件資料', 'error');
  }
}

async function refreshPtt() {
  if (!getState().connected || !getState().server?.world?.game_started) return;
  try {
    const payload = await loadPttPanel();
    setPttPanel(payload?.ptt_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入 PTT 鄉民牆', 'error');
  }
}

async function refreshProgress() {
  if (!getState().connected || !getState().server?.world?.game_started) return;
  try {
    const payload = await loadProgressPanel();
    setProgressPanel(payload?.progress_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入生涯進度', 'error');
  }
}

async function executeContent(action, payload = {}, { refresh = true } = {}) {
  if (!getState().connected) {
    toast('後端尚未連線。', 'error');
    return null;
  }
  try {
    const response = await sendGameAction(action, payload);
    const state = stateFromResponse(response);
    if (state) setServerState(state);
    if (state?.world?.game_started) scheduleEncryptedAutosave();
    if (refresh) await refreshProgress();
    toast(response?.message || '操作完成', 'success');
    return response;
  } catch (error) {
    toast(error?.message || '操作失敗', 'error');
    return null;
  }
}

async function openLifeAfterTutorial() {
  const response = await executeContent('tutorial_enter_life');
  if (!response) return;
  try {
    const payload = await loadLifePanel();
    setLifePanel(payload?.life_panel || null);
  } catch {}
  patchUI({ activeView: 'life' });
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view]');
  if (nav?.dataset.view === 'news') { await refreshNews(); return; }
  if (nav?.dataset.view === 'progress') { await refreshProgress(); return; }
  if (nav?.dataset.view === 'life') {
    const tutorial = getState().ui.progressPanel?.tutorial;
    if (tutorial?.active && Number(tutorial.step) === 6) await executeContent('tutorial_enter_life');
    return;
  }

  if (event.target.closest('[data-ptt-refresh]')) {
    const response = await executeContent('ptt_refresh', {}, { refresh: false });
    if (response) await refreshPtt();
    return;
  }

  const contentAction = event.target.closest('[data-content-action]');
  if (contentAction) {
    const action = String(contentAction.dataset.contentAction || '');
    if (action === 'tutorial_enter_life') { await openLifeAfterTutorial(); return; }
    await executeContent(action);
    return;
  }

  const title = event.target.closest('[data-title-key]');
  if (title) await executeContent('progress_select_title', { key: String(title.dataset.titleKey || '') });
});

document.addEventListener('change', event => {
  const filter = event.target.closest('[data-title-category]');
  if (filter) patchUI({ titleCategory: String(filter.value || '全部') });
});

queueMicrotask(() => {
  const view = getState().ui.activeView;
  if (view === 'news') refreshNews();
  if (view === 'progress') refreshProgress();
});
