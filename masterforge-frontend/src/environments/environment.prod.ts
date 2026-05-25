export const environment = {
  production: true,
  apiBaseUrl: 'https://masterforge-4n4g.onrender.com',          // live Render backend
  wsBaseUrl: 'wss://masterforge-4n4g.onrender.com',           // live Render WebSocket secure
  campaignCacheTtlMs: 5 * 60 * 1000,
  searchDebounceMs: 300,
  requestTimeoutMs: 10_000,
  enableMockPaymentDisclaimer: true,
  logLevel: 'warn',
};
