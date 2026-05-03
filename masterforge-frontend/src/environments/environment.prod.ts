export const environment = {
  production: true,
  apiBaseUrl: '',          // same origin in production (served from Spring Boot static)
  wsBaseUrl: '',           // same origin WebSocket
  campaignCacheTtlMs: 5 * 60 * 1000,
  searchDebounceMs: 300,
  requestTimeoutMs: 10_000,
  enableMockPaymentDisclaimer: true,
  logLevel: 'warn',
};
