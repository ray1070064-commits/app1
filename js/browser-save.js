import { exportEncryptedBrowserSave, importEncryptedBrowserSave } from './api.js';

const SAVE_KEY = 'capital-life-encrypted-save-v1';
const SAVE_META_KEY = 'capital-life-encrypted-save-meta-v1';
let autosaveTimer = null;
let autosaveInFlight = null;
let autosaveEnabled = true;

export function hasEncryptedBrowserSave() {
  return Boolean(localStorage.getItem(SAVE_KEY));
}

export function getEncryptedBrowserSaveMeta() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_META_KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearEncryptedBrowserSave() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(SAVE_META_KEY);
}

export function setEncryptedAutosaveEnabled(value) {
  autosaveEnabled = Boolean(value);
  if (!autosaveEnabled && autosaveTimer) {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
}

export function isEncryptedAutosaveEnabled() {
  return autosaveEnabled;
}

function storeEncryptedSave(saveCode) {
  const code = String(saveCode || '');
  if (!code) throw new Error('後端沒有回傳加密存檔。');
  localStorage.setItem(SAVE_KEY, code);
  localStorage.setItem(SAVE_META_KEY, JSON.stringify({
    saved_at: new Date().toISOString(),
    chars: code.length,
    format: 'fernet-v1',
  }));
}

export async function persistEncryptedBrowserSave() {
  if (autosaveInFlight) return autosaveInFlight;
  autosaveInFlight = (async () => {
    const payload = await exportEncryptedBrowserSave();
    storeEncryptedSave(payload?.save_code);
    return payload;
  })();
  try {
    return await autosaveInFlight;
  } finally {
    autosaveInFlight = null;
  }
}

export async function restoreEncryptedBrowserSave() {
  const code = localStorage.getItem(SAVE_KEY);
  if (!code) return null;
  try {
    return await importEncryptedBrowserSave(code);
  } catch (error) {
    if (Number(error?.status) === 400) clearEncryptedBrowserSave();
    throw error;
  }
}

export function scheduleEncryptedAutosave(delayMs = 900) {
  if (!autosaveEnabled) return;
  if (autosaveTimer) window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(async () => {
    autosaveTimer = null;
    if (!autosaveEnabled) return;
    try {
      await persistEncryptedBrowserSave();
    } catch (error) {
      console.warn('Capital Life autosave failed:', error);
    }
  }, Math.max(250, Number(delayMs) || 900));
}
