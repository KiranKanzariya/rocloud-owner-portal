export const environment = {
  production: true,
  apiUrl: 'https://api.rocloud.in/api',
  tenantUrlFormat: 'https://{subdomain}.rocloud.in',
  // Root domain tenants sign in under; shown wherever a tenant's {subdomain}.<domain> is displayed.
  baseDomain: 'rocloud.in',
  googleClientId: '424526358165-mn2gjimj3cjh11jq6avu95ihfjl7d76v.apps.googleusercontent.com',
  // Central app domain where Google sign-in runs (the single Google "Authorized origin").
  apexUrl: 'https://app.rocloud.in',
  // Public marketing site — the single home of the Terms, Privacy and other policies (see
  // core/legal-links.ts). The portal links to these; it never hosts a copy of the legal text.
  siteUrl: 'https://rocloud.in',
  // Timezone for displaying all dates/times — Angular DatePipe offset (e.g. '+0530' = IST).
  // Keep in sync with the API's App:TimeZone.
  timeZoneOffset: '+0530',
};
