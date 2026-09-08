const initialState = {
  ui: {
    activeView: 'trading',
    selectedSymbol: null,
    chartRange: '1M',
    indicators: {
      ma20: true,
      ma50: false,
      ma200: false,
    },
    marketSearch: '',
    marketCategory: '全部',
    marketHeldOnly: false,
    orderAction: 'open',
    positionSide: 'SPOT',
    orderType: 'market',
    leverage: 1,
    orderQuantity: 1,
    endGameConfirm: false,
    legacy: null,
    chart: null,
    startup: null,
    marketPanel: null,
    lifePanel: null,
    familyPanel: null,
    companyPanel: null,
    powerPanel: null,
    newsPanel: null,
    progressPanel: null,
    settlementPanel: null,
    saveTools: null,
    legacySaveExport: null,
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
  if (serverState?.world?.game_over) {
    state.ui.activeView = 'settlement';
    state.ui.endGameConfirm = false;
  }
  emit();
}

export function setStartup(payload) {
  state.ui.startup = payload || null;
  emit();
}

export function setMarketPanel(payload) {
  state.ui.marketPanel = payload || null;
  emit();
}

export function setLifePanel(payload) {
  state.ui.lifePanel = payload || null;
  emit();
}

export function setFamilyPanel(payload) {
  state.ui.familyPanel = payload || null;
  emit();
}

export function setCompanyPanel(payload) {
  state.ui.companyPanel = payload || null;
  emit();
}

export function setPowerPanel(payload) {
  state.ui.powerPanel = payload || null;
  emit();
}

export function setNewsPanel(payload) {
  state.ui.newsPanel = payload || null;
  emit();
}

export function setProgressPanel(payload) {
  state.ui.progressPanel = payload || null;
  emit();
}

export function setSettlementPanel(payload) {
  state.ui.settlementPanel = payload || null;
  emit();
}

export function setSaveTools(payload) {
  state.ui.saveTools = payload || null;
  emit();
}

export function setLegacySaveExport(payload) {
  state.ui.legacySaveExport = payload || null;
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