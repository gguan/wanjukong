/**
 * Whitelist a user-supplied redirect path so an attacker can't hijack
 * `/login?redirect=https://phishing.example/fake-paypal` (an open-redirect,
 * which is a classic Safe Browsing "Social Engineering" trigger).
 *
 * Rules:
 *  - Must be a non-empty string.
 *  - Must start with a single `/` (i.e. a same-origin absolute path).
 *  - Must NOT start with `//` or `/\` (protocol-relative URLs that browsers
 *    treat as external).
 *  - Must NOT contain a scheme (`http:`, `javascript:`, `data:` …).
 *  - Must NOT contain `\` which some routers normalize into `/` post-check.
 *
 * Anything that fails the above falls back to `defaultPath`.
 */
export function safeRedirect(
  candidate: unknown,
  defaultPath = '/account',
): string {
  if (typeof candidate !== 'string' || candidate.length === 0) return defaultPath;

  // Reject protocol-relative (//evil.com) and backslash variants (/\evil.com).
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return defaultPath;

  // Must be an absolute in-app path.
  if (!candidate.startsWith('/')) return defaultPath;

  // Reject embedded schemes / control chars / backslashes entirely.
  // Control chars are intentional — they're the payload class we're blocking.
  // eslint-disable-next-line no-control-regex
  if (/[\\\0-\x1f]/.test(candidate)) return defaultPath;
  if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) return defaultPath;

  return candidate;
}
