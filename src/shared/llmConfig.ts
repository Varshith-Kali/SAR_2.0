/**
 * LLM provider configuration — OpenAI GPT-5.5 only (Zero Fallbacks, Zero Persistence).
 *
 * Security Architecture:
 * - Strictly requires a user-supplied OpenAI API key held only in volatile browser RAM.
 * - Never persisted to localStorage, sessionStorage, IndexedDB, cookies, disk, or server state.
 * - Calls ONLY the real OpenAI Responses API (`POST https://api.openai.com/v1/responses`)
 *   with `model: "gpt-5.5"` and `store: false` (zero upstream retention).
 * - No fallback models, no server-side Gemini, and no deterministic synthesis.
 */

export type Provider = 'openai';

export interface LlmConfig {
  provider: Provider;
  apiKey: string;
  model: 'gpt-5.5';
}

export interface ProviderModel {
  id: 'gpt-5.5';
  label: string;
  note: string;
}

export const PROVIDER_MODELS: Record<Provider, ProviderModel[]> = {
  openai: [
    {
      id: 'gpt-5.5',
      label: 'GPT-5.5',
      note: 'OpenAI GPT-5.5 · Direct API call only (No fallbacks)',
    },
  ],
};

export const DEFAULT_MODEL: Record<Provider, 'gpt-5.5'> = {
  openai: 'gpt-5.5',
};

/**
 * Allowlist of valid model IDs. Strictly locked to 'gpt-5.5'.
 */
export const ALLOWED_MODELS: Record<Provider, ReadonlySet<string>> = {
  openai: new Set(['gpt-5.5']),
};

/**
 * Printable ASCII check for API keys — prevents CRLF header injection,
 * control characters, whitespace injection, or oversized strings.
 */
const SAFE_API_KEY_REGEX = /^[\x21-\x7E]{10,256}$/;

export function isConfigured(c: LlmConfig | null | undefined): c is LlmConfig {
  return (
    !!c &&
    c.provider === 'openai' &&
    c.model === 'gpt-5.5' &&
    typeof c.apiKey === 'string' &&
    SAFE_API_KEY_REGEX.test(c.apiKey.trim())
  );
}

/**
 * Validates a config object received from the client.
 * Rejects unknown providers, any model other than 'gpt-5.5', malformed/unsafe API keys,
 * or objects attempting prototype pollution.
 */
export function validateConfig(raw: unknown): LlmConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  // Guard against prototype pollution keys
  if (
    Object.prototype.hasOwnProperty.call(raw, '__proto__') ||
    Object.prototype.hasOwnProperty.call(raw, 'constructor') ||
    Object.prototype.hasOwnProperty.call(raw, 'prototype')
  ) {
    return null;
  }

  const c = raw as Record<string, unknown>;
  if (c.provider !== 'openai') return null;

  // Reject if caller explicitly requests any model other than 'gpt-5.5'
  if (c.model !== undefined && c.model !== 'gpt-5.5') {
    return null;
  }

  // Reject any attempt to override baseUrl / endpoint (SSRF protection)
  if (c.baseUrl !== undefined || c.endpoint !== undefined || c.url !== undefined) {
    return null;
  }

  if (typeof c.apiKey !== 'string') return null;
  const trimmedKey = c.apiKey.trim();
  if (!SAFE_API_KEY_REGEX.test(trimmedKey)) return null;

  return {
    provider: 'openai',
    apiKey: trimmedKey,
    model: 'gpt-5.5',
  };
}

/**
 * Scrubs any API key or Bearer token from error strings or logs so keys
 * can never be echoed back to the client or written to console output.
 */
export function scrubApiKeyFromText(text: string, apiKey?: string): string {
  if (!text) return '';
  let scrubbed = text;
  if (apiKey && apiKey.trim().length >= 6) {
    const escaped = apiKey.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    scrubbed = scrubbed.replace(new RegExp(escaped, 'g'), '[REDACTED_API_KEY]');
  }
  return scrubbed
    .replace(/sk-[A-Za-z0-9_-]{6,}/g, 'sk-[REDACTED]')
    .replace(/Bearer\s+[^\s"',;]+/gi, 'Bearer [REDACTED]');
}
