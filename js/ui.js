export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const prefix = number > 0 ? '+' : '';
  return `${prefix}${number.toFixed(2)}%`;
}

export function toast(message, type = '') {
  const root = document.getElementById('toast-root');
  if (!root) return;

  const node = document.createElement('div');
  node.className = `toast ${type}`.trim();
  node.textContent = String(message || '');
  root.appendChild(node);

  window.setTimeout(() => node.remove(), 3200);
}

export function setBusy(element, busy) {
  if (!element) return;
  element.disabled = Boolean(busy);
  element.dataset.busy = busy ? '1' : '0';
}
