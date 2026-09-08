import { renderView as renderBaseView } from './views.js';
import { renderAdvancedTrading } from './trading.js';

export function renderView(state) {
  if (state?.ui?.activeView === 'trading') return renderAdvancedTrading(state);
  return renderBaseView(state);
}
