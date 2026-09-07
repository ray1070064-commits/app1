// PUBLIC FRONTEND CONFIG ONLY.
// Never place API secrets, private keys, game formulas, event odds, or hidden rules here.
export const CONFIG = Object.freeze({
  APP_NAME: '資本人生 Capital Life',
  API_BASE_URL: '', // Example later: https://api.example.com
  API_PREFIX: '/api/game',
  REQUEST_TIMEOUT_MS: 15000,
});

export function hasBackendConfig() {
  return typeof CONFIG.API_BASE_URL === 'string' && CONFIG.API_BASE_URL.trim().length > 0;
}
