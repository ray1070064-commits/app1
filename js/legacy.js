import { escapeHtml } from './ui.js';

function messageCard(message) {
  const kind = String(message?.kind || 'write');
  if (kind === 'metric') {
    return `<div class="metric-card"><span>${escapeHtml(message.label || '')}</span><strong>${escapeHtml(message.text || '')}</strong>${message.delta ? `<small>${escapeHtml(message.delta)}</small>` : ''}</div>`;
  }
  const text = String(message?.text ?? '');
  if (!text.trim()) return '';
  const safeKind = ['info', 'success', 'warning', 'error', 'caption', 'title', 'subheader'].includes(kind) ? kind : 'write';
  return `<div class="legacy-message legacy-${safeKind}">${escapeHtml(text)}</div>`;
}

function optionList(control, selected) {
  const options = Array.isArray(control.options) ? control.options : [];
  return options.map(option => {
    const index = Number(option?.index ?? 0);
    const isSelected = Number(selected) === index;
    return `<option value="${index}" ${isSelected ? 'selected' : ''}>${escapeHtml(option?.label ?? index)}</option>`;
  }).join('');
}

function renderControl(control, connected) {
  const id = escapeHtml(control.id || '');
  const label = escapeHtml(control.label || '');
  const disabled = !connected || control.disabled ? 'disabled' : '';
  const value = control.value;

  switch (control.kind) {
    case 'button':
      return `<button class="button ${control.disabled ? '' : 'primary'} legacy-button" data-legacy-button="${id}" ${disabled}>${label || '執行'}</button>`;
    case 'selectbox':
    case 'radio':
      return `<label class="field legacy-field"><span>${label}</span><select class="select" data-legacy-input="${id}" data-legacy-kind="${escapeHtml(control.kind)}" ${disabled}>${optionList(control, value)}</select></label>`;
    case 'multiselect':
      return `<label class="field legacy-field"><span>${label}</span><select class="select" multiple data-legacy-input="${id}" data-legacy-kind="multiselect" ${disabled}>${optionList(control, Array.isArray(value) ? value : [])}</select></label>`;
    case 'number_input':
      return `<label class="field legacy-field"><span>${label}</span><input class="input" type="number" data-legacy-input="${id}" data-legacy-kind="number_input" value="${escapeHtml(value ?? 0)}" ${control.min != null ? `min="${escapeHtml(control.min)}"` : ''} ${control.max != null ? `max="${escapeHtml(control.max)}"` : ''} ${control.step != null ? `step="${escapeHtml(control.step)}"` : ''} ${disabled}></label>`;
    case 'slider':
      return `<label class="field legacy-field"><span>${label} <strong data-legacy-value-for="${id}">${escapeHtml(value ?? '')}</strong></span><input type="range" data-legacy-input="${id}" data-legacy-kind="slider" value="${escapeHtml(value ?? 0)}" ${control.min != null ? `min="${escapeHtml(control.min)}"` : ''} ${control.max != null ? `max="${escapeHtml(control.max)}"` : ''} ${control.step != null ? `step="${escapeHtml(control.step)}"` : ''} ${disabled}></label>`;
    case 'text_input':
    case 'text_area':
      return `<label class="field legacy-field"><span>${label}</span>${control.kind === 'text_area'
        ? `<textarea class="input" data-legacy-input="${id}" data-legacy-kind="text_area" ${disabled}>${escapeHtml(value ?? '')}</textarea>`
        : `<input class="input" type="text" data-legacy-input="${id}" data-legacy-kind="text_input" value="${escapeHtml(value ?? '')}" ${disabled}>`}</label>`;
    case 'checkbox':
    case 'toggle':
      return `<label class="legacy-check"><input type="checkbox" data-legacy-input="${id}" data-legacy-kind="${escapeHtml(control.kind)}" ${value ? 'checked' : ''} ${disabled}><span>${label}</span></label>`;
    case 'download_button':
      return `<div class="legacy-note">${label || '下載'}：新版後端下載功能將走專用安全端點，不由公開前端產生遊戲資料。</div>`;
    case 'file_uploader':
      return `<div class="legacy-note">${label || '匯入檔案'}：匯入功能會由後端驗證，不直接把存檔套用到前端狀態。</div>`;
    default:
      return `<div class="legacy-note">${label || escapeHtml(control.kind || '控制項')}</div>`;
  }
}

export function collectLegacyInputs(root = document) {
  const inputs = {};
  for (const node of root.querySelectorAll('[data-legacy-input]')) {
    const id = node.dataset.legacyInput;
    const kind = node.dataset.legacyKind;
    if (!id) continue;
    if (kind === 'multiselect') {
      inputs[id] = Array.from(node.selectedOptions).map(option => Number(option.value));
    } else if (kind === 'checkbox' || kind === 'toggle') {
      inputs[id] = Boolean(node.checked);
    } else if (kind === 'number_input' || kind === 'slider') {
      inputs[id] = Number(node.value);
    } else if (kind === 'selectbox' || kind === 'radio') {
      inputs[id] = Number(node.value);
    } else {
      inputs[id] = node.value;
    }
  }
  return inputs;
}

export function renderLegacyCompatibility(ui, connected) {
  const controls = Array.isArray(ui?.controls) ? ui.controls : [];
  const messages = Array.isArray(ui?.messages) ? ui.messages : [];
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">完整功能相容模式</h1>
        <div class="page-subtitle">這裡直接映射舊版 145 個互動入口，作為 FastAPI 遷移期間的功能保底；遊戲規則仍只在私有後端執行。</div>
      </div>
      <div class="toolbar"><button class="button" data-legacy-refresh ${connected ? '' : 'disabled'}>重新整理功能</button></div>
    </div>
    <div class="legacy-layout">
      <section class="panel">
        <div class="panel-header">操作</div>
        <div class="panel-body legacy-controls">
          ${controls.length ? controls.map(control => renderControl(control, connected)).join('') : '<div class="empty-state">正在等待後端提供完整功能控制項。</div>'}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">遊戲訊息</div>
        <div class="panel-body legacy-messages">
          ${messages.length ? messages.map(messageCard).join('') : '<div class="empty-state">目前沒有訊息。</div>'}
        </div>
      </section>
    </div>
  `;
}
