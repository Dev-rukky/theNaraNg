// lib/auth/redirect.ts
// Shared by server and browser code.

const DEFAULT_AFTER_AUTH = "/dashboard";

/**
 * Turns a `?redirect=` / `?next=` value into a safe same-site path.
 * Blocks open redirects such as `https://evil.com`, `//evil.com` or `/\evil.com`,
 * which would otherwise send users to a phishing page right after they sign in.
 * Also never sends users back to /auth, which would loop.
 */
export function safeRedirectPath(raw: unknown, fallback = DEFAULT_AFTER_AUTH): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  try {
    const base = "http://local.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}