import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// Request signing for TikTok Shop & Shopee Open Platform.
// Both use HMAC-SHA256 but with different base-string rules.
// These functions are pure & deterministic → unit-verifiable offline.
// ─────────────────────────────────────────────────────────────

// ── Shopee Open Platform v2 ──
// base = partner_id + api_path + timestamp [+ access_token + shop_id]
// sign = hex( HMAC-SHA256(partner_key, base) )
export function shopeeSign(
  partnerKey: string,
  partnerId: string,
  apiPath: string,
  timestamp: number,
  accessToken?: string,
  shopId?: string,
): string {
  let base = `${partnerId}${apiPath}${timestamp}`;
  if (accessToken && shopId) base += `${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(base).digest('hex');
}

// ── TikTok Shop Open API ──
// signString = appSecret + path + (sorted key+value for each query param,
//   excluding `sign` and `access_token`) + body(if any) + appSecret
// sign = hex( HMAC-SHA256(appSecret, signString) )
export function tiktokSign(
  appSecret: string,
  path: string,
  queryParams: Record<string, string | number>,
  body?: string,
): string {
  const keys = Object.keys(queryParams)
    .filter(k => k !== 'sign' && k !== 'access_token')
    .sort();
  let str = keys.map(k => `${k}${queryParams[k]}`).join('');
  str = `${path}${str}`;
  if (body) str += body;
  str = `${appSecret}${str}${appSecret}`;
  return crypto.createHmac('sha256', appSecret).update(str).digest('hex');
}
