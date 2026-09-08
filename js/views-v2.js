import { renderView as renderBaseView } from './views.js';
import { renderNativeCompany } from './company.js';
import { renderNativeNews, renderNativeProgress } from './content.js';
import { renderFamilySections } from './family.js';
import { renderNativeLife } from './life.js';
import { renderNativePower } from './power.js';
import { renderNativeSettlement } from './settlement.js';
import { renderAdvancedTrading } from './trading.js';

export function renderView(state) {
  if (state?.ui?.activeView === 'settlement') return renderNativeSettlement(state);
  if (state?.ui?.activeView === 'trading') return renderAdvancedTrading(state);
  if (state?.ui?.activeView === 'life') return `${renderNativeLife(state)}${renderFamilySections(state)}`;
  if (state?.ui?.activeView === 'company') return renderNativeCompany(state);
  if (state?.ui?.activeView === 'politics') return renderNativePower(state);
  if (state?.ui?.activeView === 'news') return renderNativeNews(state);
  if (state?.ui?.activeView === 'progress') return renderNativeProgress(state);
  return renderBaseView(state);
}
