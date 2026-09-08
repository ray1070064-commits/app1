import { getEncryptedBrowserSaveMeta, hasEncryptedBrowserSave } from './browser-save.js';
import { escapeHtml } from './ui.js';

function disabledAttr(ok) {
  return ok ? '' : 'disabled';
}

function formatMeta(meta) {
  if (!meta) return '這台瀏覽器目前沒有新版加密存檔。';
  const date = meta.saved_at ? new Date(meta.saved_at) : null;
  const when = date && !Number.isNaN(date.getTime()) ? date.toLocaleString('zh-TW') : '未知時間';
  const chars = Number(meta.chars || 0).toLocaleString('zh-TW');
  return `最後儲存：${when}｜密文字元：${chars}`;
}

export function renderNativeSave(state) {
  const connected = Boolean(state.connected);
  const tools = state.ui.saveTools || {};
  const legacy = state.ui.legacySaveExport || null;
  const meta = getEncryptedBrowserSaveMeta();
  const hasSave = hasEncryptedBrowserSave();
  const autosave = tools.autosave_enabled !== false;

  return `<div class="page-header">
      <div>
        <h1 class="page-title">存檔管理</h1>
        <div class="page-subtitle">正式進度使用後端加密密文；舊 LCMG / JSON / GZ 只作向下相容。</div>
      </div>
    </div>

    <div class="save-grid">
      <section class="panel">
        <div class="panel-header">正式加密瀏覽器存檔</div>
        <div class="panel-body save-stack">
          <label class="save-toggle-row">
            <input type="checkbox" data-save-autosave ${autosave ? 'checked' : ''} ${disabledAttr(connected)} />
            <span><strong>自動存檔</strong><small>成功改變遊戲狀態後防抖寫入加密密文。</small></span>
          </label>
          <div class="save-meta ${hasSave ? 'has-save' : ''}">${escapeHtml(formatMeta(meta))}</div>
          <div class="button-row">
            <button class="button primary" data-save-now ${disabledAttr(connected)}>立即加密儲存</button>
            <button class="button" data-save-load ${disabledAttr(connected && hasSave)}>載入本機加密存檔</button>
            <button class="button danger" data-save-delete ${disabledAttr(hasSave)}>刪除本機存檔</button>
          </div>
          <p class="muted">新版存檔由 Private Backend 加密與驗證；LocalStorage 不保存可直接修改的現金、持倉、世界 Seed 或事件內部規則。</p>
        </div>
      </section>

      <section class="panel legacy-save-panel">
        <div class="panel-header">舊版存檔匯入</div>
        <div class="panel-body save-stack">
          <div class="save-warning">舊 LCMG / JSON / GZ 是歷史相容格式，本身可讀且可修改。匯入成功後會立刻轉存為新版加密存檔。</div>
          <div class="field">
            <label for="legacy-save-code-input">舊版 LCMG 存檔碼</label>
            <textarea id="legacy-save-code-input" class="textarea save-code-area" rows="5" placeholder="LCMG:... 或 LCMG21:..." spellcheck="false"></textarea>
          </div>
          <button class="button primary" data-legacy-import-code ${disabledAttr(connected)}>匯入存檔碼</button>
          <div class="field">
            <label for="legacy-save-file-input">舊版 JSON / GZ 存檔檔案</label>
            <input id="legacy-save-file-input" class="input" type="file" accept=".json,.gz,.json.gz,application/json,application/gzip" />
          </div>
          <button class="button" data-legacy-import-file ${disabledAttr(connected)}>匯入檔案</button>
        </div>
      </section>
    </div>

    <section class="panel legacy-save-panel" style="margin-top:12px">
      <div class="panel-header">舊版格式匯出</div>
      <div class="panel-body save-stack">
        <div class="save-warning">只有需要帶回舊版程式時才使用。舊格式不是防竄改格式，請不要把它當正式安全存檔。</div>
        <div class="button-row">
          <button class="button" data-legacy-export-code ${disabledAttr(connected && Boolean(state.server?.world?.game_started))}>產生舊版存檔碼</button>
          <button class="button" data-legacy-export-file ${disabledAttr(connected && Boolean(state.server?.world?.game_started))}>下載舊版 GZ</button>
        </div>
        ${legacy?.save_code ? `<div class="field">
          <label for="legacy-save-code-output">相容存檔碼</label>
          <textarea id="legacy-save-code-output" class="textarea save-code-area" rows="5" readonly spellcheck="false">${escapeHtml(legacy.save_code)}</textarea>
          <button class="button" data-legacy-copy-code>複製存檔碼</button>
        </div>` : '<div class="muted">只有按「產生舊版存檔碼」後才會把舊格式內容顯示在瀏覽器。</div>'}
      </div>
    </section>`;
}
