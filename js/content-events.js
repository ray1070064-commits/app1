import { loadLifePanel, loadNewsPanel, loadProgressPanel, sendGameAction } from './api.js';
import { scheduleEncryptedAutosave } from './browser-save.js';
import { getState, patchUI, setLifePanel, setNewsPanel, setProgressPanel, setServerState } from './state.js';
import { toast } from './ui.js';

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

async function refreshNews() {
  if (!getState().connected || !getState().server?.world?.game_started) return;
  try {
    const payload = await loadNewsPanel();
    setNewsPanel(payload?.news_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入新聞／事件資料', 'error');
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

async function executeContent(action, payload = {}) {
  if (!getState().connected) {
    toast('後端尚未連線。', 'error');
    return null;
  }
  try {
    const response = await sendGameAction(action, payload);
    const state = stateFromResponse(response);
    if (state) setServerState(state);
    if (state?.world?.game_started) scheduleEncryptedAutosave();
    await refreshProgress();
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
  } catch {
    // The tutorial completion is still valid if the secondary panel refresh fails.
  }
  patchUI({ activeView: 'life' });
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view]');
  if (nav?.dataset.view === 'news') {
    await refreshNews();
    return;
  }
  if (nav?.dataset.view === 'progress') {
    await refreshProgress();
    return;
  }
  if (nav?.dataset.view === 'life') {
    const tutorial = getState().ui.progressPanel?.tutorial;
    if (tutorial?.active && Number(tutorial.step) === 6) await executeContent('tutorial_enter_life');
    return;
  }

  const contentAction = event.target.closest('[data-content-action]');
  if (contentAction) {
    const action = String(contentAction.dataset.contentAction || '');
    if (action === 'tutorial_enter_life') {
      await openLifeAfterTutorial();
      return;
    }
    await executeContent(action);
    return;
  }

  const title = event.target.closest('[data-title-key]');
  if (title) {
    await executeContent('progress_select_title', { key: String(title.dataset.titleKey || '') });
  }
});

queueMicrotask(() => {
  const view = getState().ui.activeView;
  if (view === 'news') refreshNews();
  if (view === 'progress') refreshProgress();
});
