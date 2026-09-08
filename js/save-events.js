import { exportLegacySave, importLegacySave, loadSaveTools, sendGameAction } from './api.js';
import {
  clearEncryptedBrowserSave,
  persistEncryptedBrowserSave,
  restoreEncryptedBrowserSave,
  setEncryptedAutosaveEnabled,
} from './browser-save.js';
import { getState, setLegacySaveExport, setSaveTools, setServerState } from './state.js';
import { toast } from './ui.js';

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

async function refreshSaveTools() {
  if (!getState().connected) return;
  try {
    const payload = await loadSaveTools();
    const tools = payload?.save_tools || null;
    setSaveTools(tools);
    setEncryptedAutosaveEnabled(tools?.autosave_enabled !== false);
  } catch (error) {
    toast(error?.message || '無法讀取存檔設定', 'error');
  }
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('無法讀取檔案。'));
    reader.onload = () => {
      const text = String(reader.result || '');
      const comma = text.indexOf(',');
      resolve(comma >= 0 ? text.slice(comma + 1) : text);
    };
    reader.readAsDataURL(file);
  });
}

function downloadBase64(base64Text, filename) {
  const binary = atob(String(base64Text || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/gzip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = String(filename || 'capital-life-save.json.gz');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function finishLegacyImport(payload) {
  const nextState = stateFromResponse(payload);
  if (nextState) setServerState(nextState);
  await persistEncryptedBrowserSave();
  setLegacySaveExport(null);
  await refreshSaveTools();
  toast('舊版存檔已匯入，並轉存為新版加密存檔。', 'success');
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view="save"]');
  if (nav) {
    window.setTimeout(() => void refreshSaveTools(), 0);
    return;
  }

  if (event.target.closest('[data-save-now]')) {
    try {
      if (!getState().server?.world?.game_started) throw new Error('尚未開始遊戲，沒有進度可儲存。');
      await persistEncryptedBrowserSave();
      toast('進度已加密儲存在這台瀏覽器。', 'success');
      await refreshSaveTools();
    } catch (error) {
      toast(error?.message || '儲存失敗', 'error');
    }
    return;
  }

  if (event.target.closest('[data-save-load]')) {
    try {
      const payload = await restoreEncryptedBrowserSave();
      if (!payload) throw new Error('這台瀏覽器沒有新版加密存檔。');
      const nextState = stateFromResponse(payload);
      if (nextState) setServerState(nextState);
      await refreshSaveTools();
      toast('已載入本機加密存檔。', 'success');
    } catch (error) {
      toast(error?.message || '載入失敗', 'error');
    }
    return;
  }

  if (event.target.closest('[data-save-delete]')) {
    if (!window.confirm('確定刪除這台瀏覽器的加密存檔？目前正在執行的 Session 不會一起刪除。')) return;
    clearEncryptedBrowserSave();
    setLegacySaveExport(null);
    toast('本機加密存檔已刪除。', 'success');
    return;
  }

  if (event.target.closest('[data-legacy-import-code]')) {
    const code = String(document.getElementById('legacy-save-code-input')?.value || '').trim();
    if (!code) {
      toast('請先貼上舊版存檔碼。', 'error');
      return;
    }
    try {
      await finishLegacyImport(await importLegacySave({ saveCode: code }));
    } catch (error) {
      toast(error?.message || '舊版存檔碼匯入失敗', 'error');
    }
    return;
  }

  if (event.target.closest('[data-legacy-import-file]')) {
    const file = document.getElementById('legacy-save-file-input')?.files?.[0];
    if (!file) {
      toast('請先選擇舊版 JSON / GZ 存檔檔案。', 'error');
      return;
    }
    try {
      const fileBase64 = await fileToBase64(file);
      await finishLegacyImport(await importLegacySave({ fileBase64 }));
    } catch (error) {
      toast(error?.message || '舊版存檔檔案匯入失敗', 'error');
    }
    return;
  }

  if (event.target.closest('[data-legacy-export-code]')) {
    try {
      const payload = await exportLegacySave();
      setLegacySaveExport(payload);
      toast('已產生舊版相容存檔碼。', 'success');
    } catch (error) {
      toast(error?.message || '舊版存檔碼匯出失敗', 'error');
    }
    return;
  }

  if (event.target.closest('[data-legacy-export-file]')) {
    try {
      const payload = await exportLegacySave();
      downloadBase64(payload?.file_base64, payload?.filename);
      toast('舊版 GZ 存檔已產生。', 'success');
    } catch (error) {
      toast(error?.message || '舊版 GZ 匯出失敗', 'error');
    }
    return;
  }

  if (event.target.closest('[data-legacy-copy-code]')) {
    const output = document.getElementById('legacy-save-code-output');
    const text = String(output?.value || '');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('存檔碼已複製。', 'success');
    } catch {
      output?.focus();
      output?.select();
      document.execCommand('copy');
      toast('存檔碼已複製。', 'success');
    }
  }
});

document.addEventListener('change', async event => {
  const toggle = event.target.closest('[data-save-autosave]');
  if (!toggle) return;
  const enabled = Boolean(toggle.checked);
  try {
    const response = await sendGameAction('save_set_autosave', { enabled });
    const nextState = stateFromResponse(response);
    if (nextState) setServerState(nextState);
    setEncryptedAutosaveEnabled(enabled);
    setSaveTools({ ...(getState().ui.saveTools || {}), autosave_enabled: enabled });
    toast(enabled ? '自動存檔已開啟。' : '自動存檔已關閉。', 'success');
  } catch (error) {
    toggle.checked = !enabled;
    toast(error?.message || '無法更新自動存檔設定', 'error');
  }
});
