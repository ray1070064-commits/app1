import { renderView as renderBaseView } from './views.js';
import { renderNativeCompany } from './company.js';
import { renderFamilySections } from './family.js';
import { renderNativeLife } from './life.js';
import { renderNativePower } from './power.js';
import { renderAdvancedTrading } from './trading.js';

export function renderView(state) {
  if (state?.ui?.activeView === 'trading') return renderAdvancedTrading(state);
  if (state?.ui?.activeView === 'life') return `${renderNativeLife(state)}${renderFamilySections(state)}`;
  if (state?.ui?.activeView === 'company') return renderNativeCompany(state);
  if (state?.ui?.activeView === 'politics') return renderNativePower(state);
  return renderBaseView(state);
}
