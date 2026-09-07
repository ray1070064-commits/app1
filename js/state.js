const initialState = {
  ui: {
    activeView: 'trading',
    selectedSymbol: null,
    chartRange: '1M',
    orderSide: 'buy',
    orderQuantity: 1,
    legacy: null,
    chart: null,
    startup: null,
  },
  server: null,
  connected: false,
};

const state = structuredClone(initialState);
const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener(state);
}

export function patchUI(patch) {
  Object.assign(state.ui, patch);
  emit();
}

export function setServerState(serverState) {
  state.server = serverState || null;
  if (!state.ui.selectedSymbol && serverState?.market?.selected_symbol) {
    state.ui.selectedSymbol = serverState.market.selected_symbol;
  }
  emit();
}

export function setStartup(payload) {
  state.ui.startup = payload || null;
  emit();
}

export function setLegacyUi(payload) {
  state.ui.legacy = payload || null;
  emit();
}

export function setChart(payload) {
  state.ui.chart = payload || null;
  emit();
}

export function setConnected(value) {
  state.connected = Boolean(value);
  emit();
}
