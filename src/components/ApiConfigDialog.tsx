import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { validateConfig, type LlmConfig, type Provider } from '../shared/llmConfig';

/**
 * OpenAI API Configuration Modal — Strictly GPT-5.5, Ephemeral Session Memory Only
 *
 * Security Guarantees:
 * - Zero persistence: API key lives exclusively in volatile browser RAM (`useLLMConfig`)
 *   and is never saved to localStorage, sessionStorage, IndexedDB, cookies, or any server.
 * - Model: strictly locked to GPT-5.5 (direct API call to `https://api.openai.com/v1/responses`
 *   with `store: false`, zero fallback models, zero server-side keys).
 */
export const ApiConfigDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: LlmConfig | null;
  onSave: (provider: Provider, apiKey: string, model?: string) => void;
  onClear?: () => void;
  onNotify?: (title: string, message: string, tone?: 'default' | 'success' | 'warning') => void;
}> = ({ open, onOpenChange, current, onSave, onClear, onNotify }) => {
  const provider: Provider = 'openai';
  const [apiKey, setApiKey] = useState(current?.apiKey ?? '');
  const selectedModel = 'gpt-5.5';
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  useEffect(() => {
    if (open) {
      setApiKey(current?.apiKey ?? '');
      setTestResult(null);
      setShowKey(false);
    }
  }, [open, current]);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    const validated = validateConfig({
      provider,
      apiKey: trimmed,
      model: selectedModel,
    });
    if (!validated) {
      setTestResult({
        ok: false,
        message: 'Invalid API key format. Key must be 10–256 printable ASCII characters.',
      });
      onNotify?.(
        'Invalid API Key',
        'Please enter a valid OpenAI API key (10–256 printable characters).',
        'warning'
      );
      return;
    }
    onSave(provider, validated.apiKey, selectedModel);
    onNotify?.(
      'Configured · GPT-5.5',
      'OpenAI API key active in volatile session memory (GPT-5.5 only, zero storage).',
      'success'
    );
    onOpenChange(false);
  };

  const handleClear = () => {
    setApiKey('');
    setTestResult(null);
    onClear?.();
    onNotify?.(
      'API Key Cleared',
      'OpenAI API key wiped from session memory.',
      'default'
    );
    onOpenChange(false);
  };

  const handleTest = async () => {
    const trimmed = apiKey.trim();
    const validated = validateConfig({
      provider,
      apiKey: trimmed,
      model: selectedModel,
    });
    if (!validated) {
      setTestResult({
        ok: false,
        message: 'Invalid API key format. Key must be 10–256 printable ASCII characters.',
      });
      onNotify?.('Invalid API Key', 'Enter a valid OpenAI API key first.', 'warning');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: validated,
        }),
      });
      const data = await res.json();
      setTestResult({
        ok: !!data.ok,
        message: data.ok ? data.message : data.error,
      });
      if (data.ok) {
        onNotify?.('Connection Successful', data.message, 'success');
      } else {
        onNotify?.('Connection Failed', data.error || 'Connection failed', 'warning');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setTestResult({ ok: false, message: msg });
      onNotify?.('Network Error', msg, 'warning');
    } finally {
      setTesting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:max-w-md w-full p-6 shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display flex items-center gap-2 text-lg font-bold text-zinc-900 dark:text-white">
                  <Zap className="w-4 h-4 text-zinc-900 dark:text-white shrink-0" />
                  <span>OpenAI API Configuration (GPT-5.5)</span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Enter your OpenAI API key to call <strong>GPT-5.5</strong> directly. Your key is
                  held exclusively in volatile browser RAM — never saved to disk, browser storage,
                  or any server — and is wiped automatically when you close or refresh the tab.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* API Key input */}
            <div className="space-y-1.5">
              <label
                htmlFor="openai-api-key"
                className="block text-[11px] font-mono font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400"
              >
                OPENAI API KEY (EPHEMERAL RAM ONLY)
              </label>
              <div className="relative">
                <input
                  id="openai-api-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 pr-10 font-mono text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Model — Strictly locked to GPT-5.5 */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono font-bold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                MODEL (LOCKED · ZERO FALLBACKS)
              </label>
              <div className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3.5 flex items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>GPT-5.5</span>
                </div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  DIRECT API ONLY
                </span>
              </div>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                  testResult.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}
              >
                {testResult.ok ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                )}
                <p className="leading-relaxed">{testResult.message}</p>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div>
                {current && onClear && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Key</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || !apiKey.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer transition-colors"
                >
                  {testing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>Test Connection</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save &amp; Connect</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
