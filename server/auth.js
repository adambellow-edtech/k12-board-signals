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
   student join-code flow; Google/Clever/ClassLink implement the same shape. */
export const providers = {
  local: {
    async resolveIdentity({ name, email = null }) {
      return { provider: 'local', externalId: email || `local:${name}`, name, email };
    },
  },
  // google:   { async resolveIdentity({ idToken }) { /* verify Google id_token */ } },
  // clever:   { async resolveIdentity({ code })    { /* OAuth code exchange */ } },
  // classlink:{ async resolveIdentity({ code })    { /* OAuth code exchange */ } },
};

export function getProvider(name) { return providers[name] || null; }
