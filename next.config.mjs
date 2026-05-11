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
 * middleware and thread through every Server Component render) and that's
 * a separate PR. Until then, the CSP here is a `frame-ancestors 'none'`
 * minimum — it shores up clickjacking defense without blocking the
 * unhashed inline bootstrap. We do NOT set a default-src; doing so would
 * either need 'unsafe-inline' (defeating the point) or nonce wiring (the
 * PR we're deferring). The other four headers are doing the heavy lifting.
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
  // Minimum CSP: just frame-ancestors. See block comment above for why
  // we're not setting default-src yet.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
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
