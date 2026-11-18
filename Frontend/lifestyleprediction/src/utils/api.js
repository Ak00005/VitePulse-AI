/**
 * VitaPulse AI — Central API Utility
 *
 * Automatically resolves API endpoints based on the deployment environment:
 * - In unified Vercel deployment: uses relative '/api/...' paths (same origin)
 * - In separate frontend/backend deployments: prepends VITE_API_URL if configured
 */

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const getApiUrl = (endpoint) => {
  if (!endpoint) return '';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
};

export default getApiUrl;

