/** @type {import('next').NextConfig} */

/**
 * Baseline security headers applied to every response.
 *
 * Threat model:
 *   - Clickjacking: a malicious site iframes /app and tricks a signed-in
 *     user into clicking through to a state-changing action. X-Frame-Options
 *     + CSP `frame-ancestors 'none'` block this. We do both because not
 *     every consumer (e.g. older corporate proxies, archive snapshots)
 *     honors CSP, but every modern browser honors X-Frame-Options.
 *   - Referrer leakage: a click out from /brief/<id> shouldn't send the
 *     full URL to the destination (the id is in the path). `strict-origin-
 *     when-cross-origin` sends only the origin off-site.
 *   - Feature abuse: we use no browser sensor APIs, so deny everything
 *     via Permissions-Policy and a future XSS won't gain camera/mic/etc.
 *   - MIME sniffing: nosniff stops a renamed-extension upload from being
 *     re-interpreted as a script.
 *
 * CSP is the trickier one. Next.js inlines bootstrap scripts at build time
 * which need a runtime-generated nonce to be CSP-strict. Adding nonce
 * propagation correctly is a fluid-compute refactor (it has to happen in
 * middleware and thread through every Server Component render — and the
 * landing page is `force-static` so middleware doesn't run there) — that's
 * a separate PR.
 *
 * Until then we ship the directives that don't need a nonce but still add
 * real defense-in-depth:
 *   - `frame-ancestors 'none'` — clickjacking
 *   - `base-uri 'self'` — kill `<base href="evil">` injection that would
 *     reroute relative URLs through an attacker-controlled origin
 *   - `form-action 'self'` — POST-able forms can't be exfiltrated to a
 *     third-party endpoint via injected `<form action>`
 *   - `object-src 'none'` — no `<object>`, `<embed>`, Flash, etc.
 *   - `upgrade-insecure-requests` — auto-upgrade any stray http://
 *     subresource references to https
 *
 * We don't set `default-src`, `script-src`, or `style-src` yet — those
 * would need 'unsafe-inline' to coexist with Next's inline bootstrap, which
 * defeats the point. Coming back for them with the nonce PR.
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No sensor/feature APIs in use — deny everything.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  // Nonce-free CSP directives. See block comment above for why script-src
  // / default-src / style-src aren't here yet.
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes including API. SSE responses already set
        // Content-Type explicitly so nosniff is a no-op on them, not a
        // breaker.
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
