export const environment = {
  production: false,
  apiUrl: '/api',
  tenantUrlFormat: 'https://{subdomain}.localhost:4200',
  googleClientId: '853521465325-5jjfffds63ikdcr8phcqg83nmsresvmo.apps.googleusercontent.com',
  razorpayKeyId: 'rzp_test_xxx',
  // Central app domain where Google sign-in runs (single Google "Authorized origin"). Subdomain
  // login redirects here; this page resolves the workspace and hands back to the tenant subdomain.
  apexUrl: 'https://localhost:4200',
};
