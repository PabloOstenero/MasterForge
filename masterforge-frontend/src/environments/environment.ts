// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  wsBaseUrl: 'ws://localhost:8080',
  campaignCacheTtlMs: 5 * 60 * 1000,   // 5 minutes per Req 8.5
  searchDebounceMs: 300,
  requestTimeoutMs: 10_000,             // 10 s per Req 7.5
  enableMockPaymentDisclaimer: true,
  logLevel: 'debug',
  enablePushNotifications: false,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
