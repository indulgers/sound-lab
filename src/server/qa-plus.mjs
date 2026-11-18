/**
 * Ephemeral QA Plus overlay. Never persists or modifies payment entitlements.
 *
 * Access requires all of:
 * - a signed-in, real user (route verifies session and stored user record)
 * - the exact random userId on the operator-owned allowlist
 * - an unexpired explicit ISO timestamp, at most 30 days ahead
 * - a request on localhost OR an exact configured hostname
 *
 * Merely adding ?plus=true to a URL never grants anything.
 */
const MAX_QA_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function configuredIds(value) {
  return new Set(String(value ?? '').split(/[\s,;]+/).map(x => x.trim()).filter(Boolean));
}

export function qaPlusGrant(config, userId, requestUrl, nowMs = Date.now()) {
  if (!config || !userId || typeof userId !== 'string' || !Number.isFinite(nowMs)) return null;

  const ids = configuredIds(config.SOUNDLAB_QA_PLUS_USER_IDS);
  if (!ids.has(userId)) return null;

  const expiryString = String(config.SOUNDLAB_QA_PLUS_EXPIRES_AT || '').trim();
  // Require an explicit UTC or offset-bearing ISO 8601 time.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(expiryString)) return null;
  const expiresAt = Date.parse(expiryString);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs ||
      expiresAt - nowMs > MAX_QA_WINDOW_MS) return null;

  let hostname;
  try { hostname = new URL(requestUrl).hostname.toLowerCase(); }
  catch { return null; }
  const explicitlyAllowed = new Set(
    String(config.SOUNDLAB_QA_PLUS_ALLOWED_HOSTS || '')
      .split(/[\s,;]+/).map(h => h.toLowerCase().trim()).filter(Boolean),
  );
  // No wildcard or suffix matching: a tenant/preview hostname must be opted in exactly.
  if (!LOCAL_HOSTS.has(hostname) && !explicitlyAllowed.has(hostname)) return null;

  return {
    active: true,
    plan: 'subscription-yearly',
    provider: 'qa',
    status: 'active',
    currentPeriodEnd: expiresAt,
    isTest: true,
  };
}
