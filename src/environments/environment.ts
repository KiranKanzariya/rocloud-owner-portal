export const environment = {
  production: false,
  apiUrl: '/api',
  tenantUrlFormat: 'https://{subdomain}.localhost:4200',
  googleClientId: '926900050656-2kbm2un1r4d3l6kn0ssoo2l7asnhipn7.apps.googleusercontent.com',
  // Central app domain where Google sign-in runs (single Google "Authorized origin"). Subdomain
  // login redirects here; this page resolves the workspace and hands back to the tenant subdomain.
  apexUrl: 'https://localhost:4200',
  // Timezone for displaying all dates/times — Angular DatePipe offset (e.g. '+0530' = IST).
  // Keep in sync with the API's App:TimeZone.
  timeZoneOffset: '+0530',
};
