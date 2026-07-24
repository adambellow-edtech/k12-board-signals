/* Breakout Land backend — auth: stateless signed tokens + SSO provider seam.
   No passwords are stored. A token is a signed claim about who the caller is. */

import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.BREAKOUT_SECRET || 'dev-only-secret-change-in-prod';

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const unb64 = (str) => JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
const sign = (payloadB64) => createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

// payload: { uid, role, cls, name, iat }
export function issueToken(payload) {
  const body = b64({ ...payload, iat: Date.now() });
  return `${body}.${sign(body)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = sign(body);
  const a = Buffer.from(sig || ''), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { return unb64(body); } catch { return null; }
}

/* SSO provider abstraction. Each provider resolves an external identity to a
   normalized { provider, externalId, name, email }. `local` is for dev and the
   student join-code flow; Google/Clever/ClassLink implement OAuth2. */
export const providers = {
  local: {
    async resolveIdentity({ name, email = null }) {
      return { provider: 'local', externalId: email || `local:${name}`, name, email };
    },
  },
};
export function getProvider(name) { return providers[name] || null; }

/* ---- SSO (OAuth2) config. Credentials come from the environment; when a
   provider is not configured it runs in DEMO mode so the flow is exercisable
   without real client secrets. Set the *_CLIENT_ID / *_CLIENT_SECRET vars and a
   redirect URI registered with each provider to go live. ---- */
const SSO = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile', label: 'Google',
  },
  clever: {
    clientId: process.env.CLEVER_CLIENT_ID, clientSecret: process.env.CLEVER_CLIENT_SECRET,
    authorize: 'https://clever.com/oauth/authorize',
    token: 'https://clever.com/oauth/tokens',
    me: 'https://api.clever.com/v3.0/me', scope: 'read:user_id read:students read:teachers', label: 'Clever',
  },
  classlink: {
    clientId: process.env.CLASSLINK_CLIENT_ID, clientSecret: process.env.CLASSLINK_CLIENT_SECRET,
    authorize: 'https://launchpad.classlink.com/oauth2/v2/auth',
    token: 'https://launchpad.classlink.com/oauth2/v2/token',
    me: 'https://nodeapi.classlink.com/v2/my/info', scope: 'profile', label: 'ClassLink',
  },
};
export function ssoProviders() { return Object.keys(SSO); }
export function ssoConfigured(p) { return !!(SSO[p] && SSO[p].clientId); }

export function ssoAuthorizeUrl(provider, { redirectUri, state }) {
  const c = SSO[provider]; if (!c) return null;
  if (!ssoConfigured(provider)) return `demo://${provider}/authorize?state=${encodeURIComponent(state)}`; // demo mode
  const params = new URLSearchParams({
    client_id: c.clientId, redirect_uri: redirectUri, response_type: 'code', scope: c.scope, state,
  });
  if (provider === 'clever') params.set('district_id', process.env.CLEVER_DISTRICT_ID || '');
  return `${c.authorize}?${params.toString()}`;
}

/* Exchange an auth code for a normalized identity. In DEMO mode returns a
   deterministic identity; in live mode exchanges the code and reads the user. */
export async function ssoExchange(provider, { code, redirectUri }) {
  const c = SSO[provider]; if (!c) throw new Error('unknown provider');
  if (!ssoConfigured(provider)) {
    return { provider, externalId: `${provider}:demo`, name: `${c.label} Teacher`, email: `${provider}.teacher@school.example`, demo: true };
  }
  const body = new URLSearchParams({
    grant_type: 'authorization_code', code, redirect_uri: redirectUri,
    client_id: c.clientId, client_secret: c.clientSecret,
  });
  const tok = await fetch(c.token, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body }).then(r => r.json());
  if (provider === 'google') {
    // id_token comes straight from Google's token endpoint over TLS, so its
    // claims can be trusted without re-verifying the signature.
    const claims = JSON.parse(Buffer.from(tok.id_token.split('.')[1], 'base64url').toString('utf8'));
    return { provider, externalId: `google:${claims.sub}`, name: claims.name || claims.email, email: claims.email };
  }
  // Clever / ClassLink: use the access token to read the user profile
  const me = await fetch(c.me, { headers: { authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
  const d = me.data || me;
  const name = d.name ? [d.name.first, d.name.last].filter(Boolean).join(' ') : (d.DisplayName || d.email || 'Educator');
  return { provider, externalId: `${provider}:${d.id || d.UserId || d.sourcedId}`, name, email: d.email || d.Email || null };
}
