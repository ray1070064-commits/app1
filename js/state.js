const initialState = {
  ui: {
    activeView: 'trading',
    selectedSymbol: null,
    chartRange: '1M',
    orderSide: 'buy',
    orderQuantity: 1,
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
  emit();
}

export function setConnected(value) {
  state.connected = Boolean(value);
  emit();
}
