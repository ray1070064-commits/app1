import { loadCompanyPanel, sendGameAction } from './api.js';
import { scheduleEncryptedAutosave } from './browser-save.js';
import { getState, setCompanyPanel, setServerState } from './state.js';
import { toast } from './ui.js';

function stateFromResponse(payload) {
  if (!payload) return null;
  return payload.state || payload.game_state || payload;
}

export async function refreshCompany() {
  if (!getState().connected || !getState().server?.world?.game_started) return;
  try {
    const payload = await loadCompanyPanel();
    setCompanyPanel(payload?.company_panel || null);
  } catch (error) {
    toast(error?.message || '無法載入公司資料', 'error');
  }
}

async function executeCompany(action, payload = {}) {
  if (!getState().connected) {
    toast('後端尚未連線。', 'error');
    return null;
  }
  try {
    const response = await sendGameAction(action, payload);
    const state = stateFromResponse(response);
    if (state) setServerState(state);
    if (state?.world?.game_started) scheduleEncryptedAutosave();
    await refreshCompany();
    toast(response?.message || '公司操作完成', 'success');
    return response;
  } catch (error) {
    toast(error?.message || '公司操作失敗', 'error');
    return null;
  }
}

function positive(id, label) {
  const value = Number(document.getElementById(id)?.value || 0);
  if (!Number.isFinite(value) || value <= 0) {
    toast(`${label}必須大於 0。`, 'error');
    return null;
  }
  return value;
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('.nav-button[data-view="company"]');
  if (nav) {
    await refreshCompany();
    return;
  }

  const pick = event.target.closest('[data-company-pick-industry]');
  if (pick) {
    const key = String(pick.dataset.companyPickIndustry || '');
    const select = document.getElementById('company-start-industry');
    if (select) select.value = key;
    const row = (getState().ui.companyPanel?.startup?.industries || []).find(x => String(x.key) === key);
    const capital = document.getElementById('company-start-capital');
    if (capital && row) capital.value = String(Math.max(Number(row.start_cost || 0), Number(row.recommended_capital || 0)));
    return;
  }

  if (event.target.closest('[data-company-create]')) {
    const industry = String(document.getElementById('company-start-industry')?.value || '');
    const name = String(document.getElementById('company-start-name')?.value || '').trim();
    const ticker = String(document.getElementById('company-start-ticker')?.value || '').trim();
    const capital = positive('company-start-capital', '投入資本');
    if (!industry || !name || !ticker || capital == null) {
      if (!name || !ticker) toast('公司名稱與代號不能空白。', 'error');
      return;
    }
    await executeCompany('company_create', { industry, name, ticker, capital });
    return;
  }

  const companyEvent = event.target.closest('[data-company-event-choice]');
  if (companyEvent) {
    await executeCompany('company_resolve_event', { choice: Number(companyEvent.dataset.companyEventChoice) });
    return;
  }

  const bankruptcy = event.target.closest('[data-company-bankruptcy]');
  if (bankruptcy) {
    await executeCompany('company_bankruptcy_action', { kind: bankruptcy.dataset.companyBankruptcy });
    return;
  }

  const actionButton = event.target.closest('[data-company-action]');
  if (!actionButton) return;
  const kind = actionButton.dataset.companyAction;

  if (kind === 'inject') {
    const amount = positive('company-inject-amount', '增資金額');
    if (amount != null) await executeCompany('company_inject_capital', { amount });
    return;
  }
  if (kind === 'marketing') {
    const amount = positive('company-marketing-amount', '行銷金額');
    if (amount != null) await executeCompany('company_marketing', { amount });
    return;
  }
  if (kind === 'hire') {
    const count = Math.floor(Number(document.getElementById('company-hire-count')?.value || 0));
    if (count > 0) await executeCompany('company_hire', { count });
    else toast('招募人數必須大於 0。', 'error');
    return;
  }
  if (kind === 'fire') {
    const count = Math.floor(Number(document.getElementById('company-fire-count')?.value || 0));
    if (count > 0) await executeCompany('company_fire', { count });
    else toast('裁員人數必須大於 0。', 'error');
    return;
  }
  if (kind === 'borrow') {
    const amount = positive('company-borrow-amount', '借款金額');
    if (amount != null) await executeCompany('company_borrow', { amount });
    return;
  }
  if (kind === 'repay') {
    const amount = positive('company-repay-amount', '還款金額');
    if (amount != null) await executeCompany('company_repay', { amount });
    return;
  }
  if (kind === 'capex') {
    const amount = positive('company-capex-amount', '資本支出');
    if (amount != null) await executeCompany('company_capex', { amount });
    return;
  }
  if (kind === 'rd') {
    const amount = positive('company-rd-amount', '研發投入');
    if (amount != null) await executeCompany('company_extra_rd', { amount });
    return;
  }
  if (kind === 'rename') {
    const name = String(document.getElementById('company-rename')?.value || '').trim();
    if (name) await executeCompany('company_rename', { name });
    else toast('公司名稱不能空白。', 'error');
    return;
  }
  if (kind === 'ticker') {
    const ticker = String(document.getElementById('company-ticker')?.value || '').trim();
    if (ticker) await executeCompany('company_change_ticker', { ticker });
    else toast('公司代號不能空白。', 'error');
    return;
  }
  if (kind === 'ipo') {
    const pct = Number(document.getElementById('company-ipo-release')?.value || 25);
    if (!Number.isFinite(pct) || pct < 0 || pct > 95) {
      toast('IPO 釋股比例必須介於 0% 到 95%。', 'error');
      return;
    }
    await executeCompany('company_ipo', { release_ratio: pct / 100 });
    return;
  }
  if (kind === 'dividend') {
    const pct = Number(document.getElementById('company-dividend-yield')?.value || 0);
    if (!Number.isFinite(pct) || pct < 0 || pct > 10) {
      toast('目標殖利率必須介於 0% 到 10%。', 'error');
      return;
    }
    await executeCompany('company_set_dividend_yield', { target_yield: pct / 100 });
    return;
  }
  if (kind === 'issue') {
    const shares = positive('company-issue-shares', '增發股數');
    if (shares != null) await executeCompany('company_issue_shares', { shares });
    return;
  }
  if (kind === 'buyback') {
    const shares = positive('company-buyback-shares', '回購股數');
    if (shares != null) await executeCompany('company_buyback_shares', { shares });
  }
});

queueMicrotask(() => {
  if (getState().ui.activeView === 'company' && getState().server?.world?.game_started) refreshCompany();
});
