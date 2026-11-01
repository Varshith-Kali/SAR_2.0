import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MODEL, validateConfig, type LlmConfig, type Provider } from '../shared/llmConfig';

/**
 * SECURITY — Ephemeral Session-Memory-Only API Key Store.
 *
 * The user's OpenAI API key is held EXCLUSIVELY in a private module-scoped JS variable.
 * It is NEVER written to:
 *   - localStorage / sessionStorage / IndexedDB / Cache API / cookies
 *   - window / globalThis properties or DOM data attributes
 *   - Any server-side database, disk, env var, or log file
 *
 * The key lives only in volatile RAM for the active browser tab and is automatically
 * wiped on tab close / pagehide / beforeunload.
 */

let _sessionConfig: LlmConfig | null = null;
const _listeners = new Set<() => void>();

function notifyAll() {
  for (const l of _listeners) l();
}

function wipeSessionMemory() {
  if (_sessionConfig) {
    _sessionConfig = null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', wipeSessionMemory);
  window.addEventListener('beforeunload', wipeSessionMemory);
}

export function useLLMConfig() {
  const [, forceRender] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    _listeners.add(listener);
    cleanupRef.current = () => _listeners.delete(listener);
    return () => {
      _listeners.delete(listener);
      cleanupRef.current = null;
    };
  }, []);

  const config = _sessionConfig;

  const save = useCallback((provider: Provider, apiKey: string, model?: string) => {
    const m = (model ?? DEFAULT_MODEL[provider]) as 'gpt-5.5';
    const validated = validateConfig({ provider, apiKey: apiKey.trim(), model: m });
    if (!validated) {
      throw new Error(
        'Invalid API key format. Key must be 10–256 printable ASCII characters with model GPT-5.5.'
      );
    }
    _sessionConfig = validated;
    notifyAll();
    return validated;
  }, []);

  const clear = useCallback(() => {
    wipeSessionMemory();
    notifyAll();
  }, []);

  return { config, save, clear };
}
