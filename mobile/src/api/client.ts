import { API_BASE_URL } from '../config';
import { ApiErrorResponse } from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let currentToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

export function setOnUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const query = searchParams.toString();
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (currentToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach server. Check Wi-Fi.", {
      originalError: err?.message,
    });
  }

  if (response.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    let message = 'Unauthorized';
    let code = 'UNAUTHORIZED';
    try {
      const data: ApiErrorResponse = await response.json();
      if (data?.error?.message) message = data.error.message;
      if (data?.error?.code) code = data.error.code;
    } catch {}
    throw new ApiError(401, code, message);
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  let json: any = null;
  const text = await response.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!response.ok) {
    const errorPayload = json?.error;
    const code = errorPayload?.code || `HTTP_${response.status}`;
    const message = errorPayload?.message || response.statusText || 'Request failed';
    const details = errorPayload?.details;
    throw new ApiError(response.status, code, message, details);
  }

  return json as T;
}

