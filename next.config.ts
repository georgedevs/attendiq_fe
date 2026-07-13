import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

// The API origin is the only external host the app is allowed to talk to.
// Derived from the same env var the axios client uses, so they can't drift.
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').origin
  } catch {
    return ''
  }
})()

// Content-Security-Policy. The most important directive for a localStorage-
// token app is connect-src: even if an XSS payload ever runs, it cannot
// exfiltrate tokens to an attacker's server because fetch/XHR/WebSocket to
// any origin outside this list is blocked by the browser.
// 'unsafe-inline'/'unsafe-eval' concessions: Next.js injects inline hydration
// scripts (inline) and dev mode uses eval for fast refresh (eval, dev only).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isDev ? ' ws: wss:' : ''}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Redundant with frame-ancestors but covers old browsers: no embedding
  // this app in an iframe (clickjacking the attendance flow).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app needs geolocation (attendance geofence); everything else is off.
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=(), usb=()' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'sonner',
    ],
  },
}

export default nextConfig
