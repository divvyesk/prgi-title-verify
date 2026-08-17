/**
 * Typed HTTP Client for PRGI TitleGuard
 * Handles request timeouts (2.5s limit), AbortController cancellation,
 * structured API error envelope parsing, and runtime Zod contract validation.
 */

import { type ZodSchema } from 'zod';
import { ApiErrorSchema } from './schemas';

// In development, default to '/api' to leverage Vite reverse proxy (zero-CORS)
const BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? '/api' : 'http://localhost:8000');
const REQUEST_TIMEOUT_MS = 2500;

export class ApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly rawDetails?: unknown;

  constructor(code: string, message: string, status?: number, rawDetails?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.rawDetails = rawDetails;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Maps backend structured error codes to user-friendly plain-language messages.
   */
  public get userMessage(): string {
    switch (this.code) {
      case 'TITLE_EMPTY':
        return 'Please enter a title before submitting for verification.';
      case 'INVALID_TITLE_LENGTH':
        return 'The submitted title length is outside permissible statutory limits (under 3 or over 100 characters).';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many verification requests. Please wait a moment and try again.';
      case 'UNAUTHORIZED':
        return 'Access token expired or unauthorized. Please check your credentials.';
      case 'NOT_FOUND':
        return 'The requested record, guideline, or case was not found.';
      case 'TIMEOUT':
        return 'Verification request timed out. Falling back to offline heuristics engine.';
      case 'VALIDATION_ERROR':
        return 'The response returned from the server did not match the expected statutory API contract.';
      case 'SERVICE_UNAVAILABLE':
        return 'The verification backend service is currently offline or unreachable.';
      case 'INTERNAL_ERROR':
        return 'An internal processing error occurred on the verification server.';
      default:
        return this.message || 'An unexpected verification error occurred.';
    }
  }
}

/**
 * Extracts structured { error: { code, message } } envelope from failed HTTP responses.
 */
async function toApiError(res: Response): Promise<ApiError> {
  try {
    const rawData = await res.json();
    const parsed = ApiErrorSchema.safeParse(rawData);
    if (parsed.success) {
      return new ApiError(parsed.data.error.code, parsed.data.error.message, res.status, rawData);
    }
    if (rawData && typeof rawData === 'object' && 'detail' in rawData) {
      const detailMsg = typeof rawData.detail === 'string' ? rawData.detail : JSON.stringify(rawData.detail);
      return new ApiError('SERVER_ERROR', detailMsg, res.status, rawData);
    }
  } catch {
    // Non-JSON response body
  }

  return new ApiError(
    `HTTP_${res.status}`,
    res.statusText || `Request failed with HTTP status ${res.status}`,
    res.status
  );
}

/**
 * Standard POST request with 2.5s AbortController and Zod schema parsing
 */
export async function post<T>(path: string, body: unknown, schema: ZodSchema<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      throw await toApiError(res);
    }

    const json = await res.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      console.error(`[API Schema Error] ${path}:`, result.error);
      throw new ApiError(
        'VALIDATION_ERROR',
        `Contract validation failed for ${path}: ${result.error.issues.map(i => i.message).join(', ')}`,
        res.status,
        result.error
      );
    }

    return result.data;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', `Request to ${path} exceeded the ${REQUEST_TIMEOUT_MS}ms budget.`);
    }
    if (err instanceof TypeError) {
      throw new ApiError('SERVICE_UNAVAILABLE', `Unable to connect to backend at ${BASE}${path}.`);
    }
    throw new ApiError('UNKNOWN_ERROR', (err as Error)?.message || 'An unknown network error occurred.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Standard GET request with 2.5s AbortController and Zod schema parsing
 */
export async function get<T>(path: string, schema: ZodSchema<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: ctrl.signal,
    });

    if (!res.ok) {
      throw await toApiError(res);
    }

    const json = await res.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      console.error(`[API Schema Error] ${path}:`, result.error);
      throw new ApiError(
        'VALIDATION_ERROR',
        `Contract validation failed for ${path}: ${result.error.issues.map(i => i.message).join(', ')}`,
        res.status,
        result.error
      );
    }

    return result.data;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', `Request to ${path} exceeded the ${REQUEST_TIMEOUT_MS}ms budget.`);
    }
    if (err instanceof TypeError) {
      throw new ApiError('SERVICE_UNAVAILABLE', `Unable to connect to backend at ${BASE}${path}.`);
    }
    throw new ApiError('UNKNOWN_ERROR', (err as Error)?.message || 'An unknown network error occurred.');
  } finally {
    clearTimeout(timer);
  }
}
