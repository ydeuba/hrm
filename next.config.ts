import type { NextConfig } from 'next';

/**
 * Static security headers. The Content-Security-Policy is per-request (nonce)
 * and is therefore set in src/proxy.ts, not here (ADR-006 / cross-cutting).
 */
const staticSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'same-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

/**
 * Hostnames from TRUSTED_ORIGINS (e.g. "http://10.0.6.70:3000"). `next dev` refuses
 * its scripts to any host but localhost unless listed in allowedDevOrigins, so one
 * setting in .env enables both the dev assets and the sign-in Origin check.
 */
function trustedHosts(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => {
      try {
        return [new URL(s).hostname];
      } catch {
        return [];
      }
    });
}

// `output: 'standalone'` is intentionally not set: v1 runs with `next start`.
// Enable it when building the container image for server deployment.
const nextConfig: NextConfig = {
  allowedDevOrigins: trustedHosts(process.env.TRUSTED_ORIGINS),
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3', '@node-rs/argon2'],
  async headers() {
    return [{ source: '/:path*', headers: staticSecurityHeaders }];
  },
};

export default nextConfig;
