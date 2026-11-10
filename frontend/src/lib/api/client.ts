import type { z } from 'zod';

/**
 * Typed API client. The browser only ever calls same-origin relative URLs
 * (`/api/...`); the dev server / reverse proxy forwards them to the backend.
 * Access tokens are held in memory (not localStorage) to reduce XSS exposure.
 */

// Keep same-origin requests for local Docker/Vite, but allow a separately hosted
// API in platforms such as Render. The configured value is the API origin only.
const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/+$/, '');
const BASE_URL = `${API_ORIGIN}/api`;

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(path: string, opts: RequestOptions<T> = {}): Promise<T> {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Unable to reach the server. Check your connection and try again.');
  }

  if (res.status === 401) {
    // Session expired / invalid — let the app clear it and route to login.
    if (unauthorizedHandler && accessToken) unauthorizedHandler();
  }

  if (!res.ok) {
    let code = 'ERROR';
    let message = `Request failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data && typeof data === 'object') {
        code = (data as { code?: string }).code || code;
        message = (data as { message?: string }).message || message;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, code, message);
  }

  // 204 / empty body
  const text = await res.text();
  if (!text) return undefined as T;
  const data = JSON.parse(text);
  if (opts.schema) return opts.schema.parse(data);
  return data as T;
}
