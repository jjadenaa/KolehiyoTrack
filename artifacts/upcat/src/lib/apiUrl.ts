/**
 * Returns the base URL for the API server.
 * In production (Replit), API is at the same origin under /api.
 * In local dev (when running separately), API might be at localhost:8080.
 */
export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    // In production on Vercel, Replit, Cloud Run, custom domain, etc.
    return `${window.location.origin}/api`;
  }
  return import.meta.env.VITE_API_URL || "/api";
}
