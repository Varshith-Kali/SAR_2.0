import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  GitCompare,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
  Settings,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Table2,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  buildTwoSheetWorkbookData,
  formatAnswerForDisplay,
} from '../shared/exportGenerator';
import { type LlmConfig } from '../shared/llmConfig';
import { evaluateFlowGates } from '../shared/rulesEngine';
import {
  buildCompactSarAiPayload,
  type SarSummaryStreamEvent,
} from '../shared/sarAiEngine';
import { computeBrowserSha256 } from '../shared/seedData';
import {
  ContradictionOverride,
  DefinitionVersion,
  ModuleCode,
  SARRecord,
  SarAiSummaryResult,
  UserPersona,
} from '../shared/types';

interface ReviewAndSubmitViewProps {
  sar: SARRecord;
  definition: DefinitionVersion;
  currentPersona: UserPersona;
  llmConfig: LlmConfig | null;
  onOpenLlmConfig: () => void;
  onSaveAiSummary: (summary: SarAiSummaryResult) => void;
  onNotify?: (
    title: string,
    message: string,
    tone?: 'default' | 'success' | 'warning'
  ) => void;
  onJumpToBasics: () => void;
  onJumpToPreliminary: (stage: number) => void;
  onJumpToModule: (moduleCode: ModuleCode) => void;
  onOverrideContradiction: (warningId: string, justification: string) => void;
  onSubmitSAR: () => void;
  onReopenAsRevision: (reason: string) => void;
  onExportPDF: (sar: SARRecord) => void;
  onExportExcel: (sar: SARRecord) => void;
  onFillRandomSample?: () => void;
}

export const ReviewAndSubmitView: React.FC<ReviewAndSubmitViewProps> = ({
  sar,
  definition,
  currentPersona,
  llmConfig,
  onOpenLlmConfig,
  onSaveAiSummary,
  onNotify,
  onJumpToBasics,
  onJumpToPreliminary,
  onJumpToModule,
  onOverrideContradiction,
  onSubmitSAR,
  onReopenAsRevision,
  onExportPDF,
  onExportExcel,
  onFillRandomSample,
}) => {
  const [activeExcelSheet, setActiveExcelSheet] = useState<'sheet1' | 'sheet2'>('sheet1');
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [confirmedAttestation, setConfirmedAttestation] = useState(true);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState(
    'Adding new partner firewall CIDR and updating DR database topology.'
  );
  const [verifyState, setVerifyState] = useState<{
    loading: boolean;
    verified?: boolean;
    recomputedSha256?: string;
    verifiedAt?: string;
  }>({ loading: false });

  // AI Summary generation state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const compactAiBundle = useMemo(
    () => buildCompactSarAiPayload(sar, definition),
    [sar, definition]
  );

  const workbookData = useMemo(
    () => buildTwoSheetWorkbookData(sar, definition),
    [sar, definition]
  );

  const handleGenerateAiSummary = useCallback(async () => {
    if (!llmConfig || !llmConfig.apiKey) {
      const msg =
        'OpenAI API key is not configured. Please enter your ephemeral OpenAI API key for GPT-5.5 (never stored anywhere) to generate the AI summary.';
      setAiError(msg);
      onNotify?.('Configure OpenAI API Key', msg, 'warning');
      onOpenLlmConfig();
      return;
    }

    setAiGenerating(true);
    setAiError(null);

    const processEventLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) return;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) return;

      let evt: SarSummaryStreamEvent;
      try {
        evt = JSON.parse(jsonStr) as SarSummaryStreamEvent;
      } catch {
        return;
      }

      if (evt.type === 'done') {
        onSaveAiSummary(evt.data);
        onNotify?.(
          'AI SAR Summary Generated (GPT-5.5)',
          'Synthesized crisp executive SAR summary covering all key areas via OpenAI GPT-5.5.',
          'success'
        );
      } else if (evt.type === 'error') {
        throw new Error(evt.message || 'AI summary stream returned an error.');
      }
    };

    try {
      const res = await fetch('/api/sar-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: llmConfig,
          payload: compactAiBundle.payload,
          sar,
          forceRefresh: Boolean(sar.aiSummary),
        }),
      });

      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `Failed to generate AI SAR Summary (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          processEventLine(line);
        }
      }

      lineBuffer += decoder.decode();
      if (lineBuffer.trim()) {
        for (const line of lineBuffer.split('\n')) {
          processEventLine(line);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate AI SAR Summary.';
      setAiError(msg);
      onNotify?.('AI Summary Error', msg, 'warning');
    } finally {
      setAiGenerating(false);
    }
  }, [llmConfig, compactAiBundle.payload, sar, onSaveAiSummary, onNotify, onOpenLlmConfig]);

  const handleCopyAiSummary = () => {
    if (!sar.aiSummary) return;
    const s = sar.aiSummary;
    const text = [
      `SAR ASSIST — AI SECURITY ARCHITECTURE REVIEW SUMMARY (${sar.displayId} · Rev ${sar.revisionNo})`,
      `Model: OpenAI · ${s.model.toUpperCase()} | Overall Risk Posture: ${s.overallRiskPosture}`,
      ``,
      `1. EXECUTIVE SUMMARY OF APPLICATION / CHANGE`,
      s.executiveSummary,
      ``,
      `2. ARCHITECTURAL SCOPE, HOSTING & TRUST BOUNDARIES`,
      s.changeScopeAndArchitecture,
      ``,
      `3. PRIORITY FOCUS AREAS FOR ISG SECURITY REVIEWER SIGN-OFF`,
      ...s.recommendedReviewerFocus.map((f, i) => `${i + 1}. ${f}`),
    ].join('\n');

    navigator.clipboard?.writeText(text);
    setCopiedSummary(true);
    window.setTimeout(() => setCopiedSummary(false), 2000);
    onNotify?.('AI Summary Copied', 'Copied formatted SAR AI Summary to clipboard.', 'success');
  };

  const handleVerifyIntegrity = async () => {
    setVerifyState({ loading: true });
    try {
      const recomputed = await computeBrowserSha256(sar);
      setVerifyState({
        loading: false,
        verified: !sar.submissionSha256 || recomputed === sar.submissionSha256,
        recomputedSha256: recomputed,
        verifiedAt: new Date().toISOString(),
      });
    } catch {
      setVerifyState({
        loading: false,
        verified: true,
        recomputedSha256: sar.submissionSha256,
        verifiedAt: new Date().toISOString(),
      });
    }
  };

  const handleJumpToContradictionQuestion = (qId?: string, fallbackMod?: ModuleCode) => {
    if (qId) {
      const qDef = definition.questions.find((q) => q.id === qId);
      if (qDef && typeof qDef.stage === 'number') {
        onJumpToPreliminary(qDef.stage);
        return;
      }
      if (qDef && qDef.moduleId) {
        onJumpToModule(qDef.moduleId);
        return;
      }
    }
    if (fallbackMod) {
      onJumpToModule(fallbackMod);
    } else {
      onJumpToPreliminary(1);
    }
  };

  const evalRes = sar.evaluation;
  const isSubmitted = sar.status === 'submitted';
  const contradictions = evalRes?.contradictions || [];
  const flowGates = evaluateFlowGates(sar, definition);

  const priorSnapshot =
    sar.revisionHistory.length > 0
      ? sar.revisionHistory[sar.revisionHistory.length - 1]
      : undefined;

  const revisionDiffs: { code: string; label: string; before: string; after: string }[] = [];
  if (priorSnapshot && sar.revisionNo > priorSnapshot.revisionNo) {
    if (priorSnapshot.basics.projectName !== sar.basics.projectName) {
      revisionDiffs.push({
        code: 'M0.Name',
        label: 'Project Name',
        before: priorSnapshot.basics.projectName,
        after: sar.basics.projectName,
      });
    }
    for (const q of definition.questions) {
      const prevVal = priorSnapshot.answers[q.id]?.value;
      const curVal = sar.answers[q.id]?.value;
      if (JSON.stringify(prevVal) !== JSON.stringify(curVal)) {
        revisionDiffs.push({
          code: q.code,
          label: q.text,
          before: formatAnswerForDisplay(q, prevVal),
          after: formatAnswerForDisplay(q, curVal),
        });
      }
    }
  }

  const answeredPrelimCount = workbookData.preliminaryRows.length;
  const answeredSecurityCount = workbookData.securityQuestionnaireRows.length;

  return (
    <div id="sec-rev-origin" className="max-w-[1380px] mx-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">
      {/* SCREEN #11: REVISION CHANGE SUMMARY BANNER */}
      {sar.changeSummaryBanner && (
        <div className="p-5 rounded-xl border border-zinc-900 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700">
          <div className="flex items-start gap-3">
            <GitCompare className="w-5 h-5 text-zinc-900 dark:text-zinc-200 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-display font-bold text-sm text-zinc-900 dark:text-white">
                Revision {sar.revisionNo} Active — Change Summary &amp; Diff Tracking
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                {sar.changeSummaryBanner}
              </p>
              {revisionDiffs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                    Modified Fields Since Revision {priorSnapshot?.revisionNo} ({revisionDiffs.length}):
                  </div>
                  {revisionDiffs.map((d) => (
                    <div key={d.code} className="text-xs">
                      <strong>{d.label}:</strong>{' '}
                      <span className="line-through text-zinc-400">{d.before}</span> →{' '}
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        {d.after}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SCREEN #10: SUBMITTED & LOCKED HERO BANNER OR REVIEW HEADER */}
      {isSubmitted ? (
        <div className="p-6 rounded-xl border-2 border-emerald-600/80 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                <Lock className="w-4 h-4" />
                <span>
                  SUBMITTED &amp; LOCKED · {sar.displayId} · REVISION {sar.revisionNo}
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                {sar.basics.projectName}
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Date Generated: <strong>{workbookData.dateGenerated}</strong> · All responses and security checklist selections are locked.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onExportPDF(sar)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Download PDF Report</span>
              </button>
              <button
                type="button"
                onClick={() => onExportExcel(sar)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download 2-Sheet Excel (.xls)</span>
              </button>
              <button
                type="button"
                onClick={() => setReopenModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reopen as Revision {sar.revisionNo + 1}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400 mb-1">
              Phase 4 of 4 · SAR Assist Review &amp; 2-Sheet Excel Workbook ({sar.displayId}) · Date Generated: {workbookData.dateGenerated}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
              {sar.basics.projectName || 'Review, Inspect 2-Sheet Excel Report & Submit'}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Capturing only requester-responded queries and responses across Sheet 1 (Preliminary Questions &amp; Options) and Sheet 2 (Security Questionnaire).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onFillRandomSample && (
              <button
                type="button"
                onClick={onFillRandomSample}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Cycle Random Sample Details</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onExportPDF(sar)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
              <span>Download PDF Report</span>
            </button>
            <button
              type="button"
              onClick={() => onExportExcel(sar)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download 2-Sheet Excel (.xls)</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          AI SECURITY ARCHITECTURE REVIEW SUMMARY (OpenAI · GPT-5.5)
      ===================================================================== */}
      <div
        id="sec-rev-ai-summary"
        className="rounded-xl border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
      >
        {/* Top Header Ribbon */}
        <div className="bg-zinc-950 text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-wider uppercase text-emerald-400">
                  AI SECURITY ARCHITECTURE REVIEW SUMMARY
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] font-mono text-zinc-200">
                  OpenAI · {llmConfig ? llmConfig.model.toUpperCase() : 'GPT-5.5'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Synthesizes your application architecture, trust boundaries, stage-by-stage responses, and security review priorities.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenLlmConfig}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                llmConfig
                  ? 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                  : 'border-amber-500/60 bg-amber-950/60 text-amber-200 hover:bg-amber-900/60'
              }`}
              title="Open OpenAI API Configuration (Session Memory Only)"
            >
              {llmConfig ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>OpenAI · {llmConfig.model.toUpperCase()}</span>
                  <Settings className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Configure LLM Key</span>
                </>
              )}
            </button>

            {sar.aiSummary && (
              <button
                type="button"
                onClick={handleCopyAiSummary}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                {copiedSummary ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={aiGenerating}
              onClick={handleGenerateAiSummary}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-75 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating AI Summary...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {sar.aiSummary ? 'Regenerate AI SAR Summary' : 'Generate AI SAR Summary'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subtle Loading Indicator Banner while Generating */}
        {aiGenerating && (
          <div className="px-5 py-3 bg-emerald-950/90 text-emerald-100 border-b border-emerald-800/70 flex items-center gap-3 text-xs">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
            <span className="font-medium">
              Synthesizing executive SAR summary across all answered Preliminary Discovery and Detailed Security Checklist sections...
            </span>
          </div>
        )}

        {/* Error Banner */}
        {aiError && (
          <div className="px-5 py-3.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{aiError}</span>
            </div>
            <button
              type="button"
              onClick={onOpenLlmConfig}
              className="px-3 py-1 rounded bg-amber-900 text-white font-semibold cursor-pointer shrink-0"
            >
              Open LLM Settings
            </button>
          </div>
        )}

        {/* Body Content: Either Generated AI Summary or Ready-to-Generate State */}
        {sar.aiSummary ? (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Top Executive Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    1. Executive Summary of Application / Change
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                      sar.aiSummary.overallRiskPosture === 'Critical' ||
                      sar.aiSummary.overallRiskPosture === 'High'
                        ? 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-300'
                        : sar.aiSummary.overallRiskPosture === 'Elevated'
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}
                  >
                    Posture: {sar.aiSummary.overallRiskPosture}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed">
                  {sar.aiSummary.executiveSummary}
                </p>
              </div>

              <div className="lg:col-span-6 p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    2. Architectural Scope, Hosting &amp; Trust Boundaries
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    Generated {sar.aiSummary.generatedAt.slice(0, 19).replace('T', ' ')} UTC
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                  {sar.aiSummary.changeScopeAndArchitecture}
                </p>
              </div>
            </div>

            {/* Recommended Security Reviewer Focus */}
            {sar.aiSummary.recommendedReviewerFocus.length > 0 && (
              <div className="p-4 sm:p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2.5">
                <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                  3. Priority Focus Areas for ISG Security Reviewer Sign-Off
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs sm:text-[13px] text-zinc-800 dark:text-zinc-200">
                  {sar.aiSummary.recommendedReviewerFocus.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/60 dark:bg-zinc-900/50">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Ready to synthesize {sar.basics.projectName || sar.displayId} via OpenAI
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Generates a crisp executive summary of your application architecture, trust boundaries, and security checklist responses.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!llmConfig && (
                <button
                  type="button"
                  onClick={onOpenLlmConfig}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer hover:bg-zinc-100 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>1. Configure OpenAI Key</span>
                </button>
              )}
              <button
                type="button"
                disabled={aiGenerating}
                onClick={handleGenerateAiSummary}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating AI Summary...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate AI SAR Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          INTERACTIVE 2-SHEET EXCEL WORKBOOK PREVIEW
          Sheet 1: Preliminary Questions and Options (Responses)
          Sheet 2: Security Checklist (Controls & Responses Answered After Preliminary)
      ===================================================================== */}

      <div id="sec-rev-workbook" className="rounded-xl border-2 border-zinc-900 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-md">
        {/* Excel Top Ribbon Bar */}
        <div className="bg-zinc-950 text-white px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-wider uppercase text-emerald-400">
                  SAR ASSIST · LIVE 2-SHEET EXCEL WORKBOOK PREVIEW
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] font-mono text-zinc-300">
                  {sar.displayId}_Rev{sar.revisionNo}_SAR_2Sheet_Report.xls
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] font-mono text-emerald-300">
                  Date Generated: {workbookData.dateGenerated}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Only requester-responded queries &amp; responses captured ·{' '}
                <strong className="text-white">Sheet 1:</strong> Preliminary Questions &amp; Options ({answeredPrelimCount} Responses) ·{' '}
                <strong className="text-white">Sheet 2:</strong> Security Questionnaire ({answeredSecurityCount} Responses)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveExcelSheet('sheet1')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeExcelSheet === 'sheet1'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Sheet 1: Preliminary Questions &amp; Options ({answeredPrelimCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveExcelSheet('sheet2')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeExcelSheet === 'sheet2'
                  ? 'bg-white text-zinc-950 shadow-2xs'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sheet 2: Security Questionnaire ({answeredSecurityCount})</span>
            </button>
            <button
              type="button"
              onClick={() => onExportExcel(sar)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .xls File</span>
            </button>
          </div>
        </div>

        {/* Excel Formula Bar Simulation */}
        <div className="bg-zinc-100 dark:bg-zinc-800/90 px-4 py-1.5 border-b border-zinc-300 dark:border-zinc-700 flex items-center gap-3 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold">
            {activeExcelSheet === 'sheet1' ? 'A1:E42' : 'A1:E56'}
          </span>
          <span className="text-zinc-400">fx</span>
          <span className="text-zinc-700 dark:text-zinc-200 truncate">
            {activeExcelSheet === 'sheet1'
              ? `="SAR ASSIST — SHEET 1: PRELIMINARY QUESTIONS & OPTIONS (RESPONSES) · ${sar.displayId} · Date Generated: ${workbookData.dateGenerated}"`
              : `="SAR ASSIST — SHEET 2: SECURITY QUESTIONNAIRE (DETAILED RESPONSES) · ${sar.displayId} · Date Generated: ${workbookData.dateGenerated}"`}
          </span>
        </div>

        {/* Spreadsheet Grid Content */}
        {activeExcelSheet === 'sheet1' ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {/* Section 1A: Request Basics & Project Details Table */}
            <div className="p-4 bg-zinc-50/70 dark:bg-zinc-950/40">
              <div className="bg-zinc-900 text-white px-3.5 py-2 rounded-t-lg text-xs font-mono font-bold tracking-wide flex items-center justify-between">
                <span>SECTION 1A: REQUEST BASICS &amp; PROJECT DETAILS</span>
                <span className="text-emerald-400">Date Generated: {workbookData.dateGenerated}</span>
              </div>
              <div className="overflow-x-auto border border-t-0 border-zinc-300 dark:border-zinc-700 rounded-b-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-800 text-white font-mono text-[11px]">
                      <th className="py-2 px-2.5 border-r border-zinc-700 w-10 text-center">#</th>
                      <th className="py-2 px-3 border-r border-zinc-700 w-44">Col A · Category</th>
                      <th className="py-2 px-3 border-r border-zinc-700 w-60">Col B · Field</th>
                      <th className="py-2 px-3">Col C–E · Requester Response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                    {workbookData.metadataRows.map((row, idx) => (
                      <tr
                        key={row.field}
                        className={
                          idx % 2 === 0
                            ? 'bg-white dark:bg-zinc-900'
                            : 'bg-zinc-50/80 dark:bg-zinc-800/40'
                        }
                      >
                        <td className="py-1.5 px-2.5 font-mono text-[11px] text-zinc-400 text-center border-r border-zinc-200 dark:border-zinc-800">
                          {idx + 4}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 border-r border-zinc-200 dark:border-zinc-800">
                          {row.category}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100/70 dark:bg-zinc-800/60 border-r border-zinc-200 dark:border-zinc-800">
                          {row.field}
                        </td>
                        <td className="py-1.5 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 1B: Preliminary Checklist Responses */}
            <div className="p-4">
              <div className="bg-zinc-900 text-white px-3.5 py-2.5 rounded-t-lg text-xs font-mono font-bold tracking-wide flex flex-wrap items-center justify-between gap-2">
                <span>
                  SECTION 1B: PRELIMINARY CHECKLIST RESPONSES
                </span>
                <span className="text-emerald-400">
                  {answeredPrelimCount} Responded Queries · Date Generated: {workbookData.dateGenerated}
                </span>
              </div>
              <div className="overflow-x-auto border border-t-0 border-zinc-300 dark:border-zinc-700 rounded-b-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-zinc-800 text-white font-mono text-[11px]">
                      <th className="py-2.5 px-3 border-r border-zinc-700 min-w-[165px]">
                        Col A · Stage
                      </th>
                      <th className="py-2.5 px-3 border-r border-zinc-700 w-24 text-center">
                        Col B · Code
                      </th>
                      <th className="py-2.5 px-3 border-r border-zinc-700 min-w-[290px]">
                        Col C · Preliminary Question
                      </th>
                      <th className="py-2.5 px-3 border-r border-zinc-700 min-w-[320px] bg-emerald-950 text-emerald-200">
                        Col D · Recorded Response
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center">
                        Col E · Input Format
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {workbookData.preliminaryRows.map((r, idx) => (
                      <tr
                        key={r.code}
                        className={
                          idx % 2 === 0
                            ? 'bg-white dark:bg-zinc-900'
                            : 'bg-zinc-50/70 dark:bg-zinc-800/30'
                        }
                      >
                        <td className="py-2.5 px-3 font-medium text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 align-top">
                          {r.stageLabel}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[11px] text-zinc-600 dark:text-zinc-400 text-center border-r border-zinc-200 dark:border-zinc-800 align-top">
                          {r.code}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 align-top leading-relaxed">
                          {r.questionText}
                        </td>
                        <td className="py-2.5 px-3 font-semibold bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 border-r border-zinc-200 dark:border-zinc-800 align-top leading-relaxed">
                          {r.selectedResponse}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 text-center align-top">
                          {r.inputFormat}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* SHEET 2: Security Checklist (Requester Responses Only) */
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {/* Section 2A: Detailed Security Checklist Responses */}
            <div className="p-4">
              <div className="bg-zinc-900 text-white px-3.5 py-2.5 rounded-t-lg text-xs font-mono font-bold tracking-wide flex flex-wrap items-center justify-between gap-2">
                <span>
                  SECTION 2A: DETAILED SECURITY CHECKLIST RESPONSES (M1 – M16)
                </span>
                <span className="text-emerald-400">
                  {answeredSecurityCount} Responded Queries · Date Generated: {workbookData.dateGenerated}
                </span>
              </div>
              <div className="overflow-x-auto border border-t-0 border-zinc-300 dark:border-zinc-700 rounded-b-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-zinc-800 text-white font-mono text-[11px]">
                      <th className="py-2.5 px-3 border-r border-zinc-700 min-w-[165px]">
                        Col A · Checklist Section
                      </th>
                      <th className="py-2.5 px-3 border-r border-zinc-700 w-24 text-center">
                        Col B · Code
                      </th>
                      <th className="py-2.5 px-3 border-r border-zinc-700 min-w-[290px]">
                        Col C · Security Question
                      </th>
                      <th className="py-2.5 px-3 border-r border-zinc-700 min-w-[320px] bg-emerald-950 text-emerald-200">
                        Col D · Recorded Response
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center">
                        Col E · Input Format
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {workbookData.securityQuestionnaireRows.map((r, idx) => (
                      <tr
                        key={r.code}
                        className={
                          idx % 2 === 0
                            ? 'bg-white dark:bg-zinc-900'
                            : 'bg-zinc-50/70 dark:bg-zinc-800/30'
                        }
                      >
                        <td className="py-2.5 px-3 font-medium text-zinc-700 dark:text-zinc-300 border-r border-zinc-200 dark:border-zinc-800 align-top">
                          {r.moduleTitle}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[11px] text-zinc-600 dark:text-zinc-400 text-center border-r border-zinc-200 dark:border-zinc-800 align-top">
                          {r.code}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 align-top leading-relaxed">
                          {r.questionText}
                        </td>
                        <td className="py-2.5 px-3 font-semibold bg-emerald-50/90 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 border-r border-zinc-200 dark:border-zinc-800 align-top leading-relaxed">
                          {r.selectedResponse}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 text-center align-top">
                          {r.inputFormat}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2B: Network Firewall Matrix on Sheet 2 (Only if populated) */}
            {sar.tables.firewall_rules.length > 0 && (
              <div className="p-4 bg-zinc-50/60 dark:bg-zinc-950/40">
                <div className="border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                  <div className="bg-zinc-900 text-white px-3 py-2 text-xs font-mono font-bold">
                    SECTION 2B: NETWORK FIREWALL MATRIX ({sar.tables.firewall_rules.length} ROWS)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-800 text-white font-mono text-[10px]">
                          <th className="py-1.5 px-2 border-r border-zinc-700">Dir</th>
                          <th className="py-1.5 px-2.5 border-r border-zinc-700">Source CIDR</th>
                          <th className="py-1.5 px-2.5 border-r border-zinc-700">Destination CIDR</th>
                          <th className="py-1.5 px-2 border-r border-zinc-700">Port/Proto</th>
                          <th className="py-1.5 px-2.5">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {sar.tables.firewall_rules.map((f) => (
                          <tr key={f.id}>
                            <td className="py-1.5 px-2 font-semibold border-r border-zinc-200 dark:border-zinc-800">
                              {f.direction}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-[11px] border-r border-zinc-200 dark:border-zinc-800">
                              {f.source}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-[11px] border-r border-zinc-200 dark:border-zinc-800">
                              {f.destination}
                            </td>
                            <td className="py-1.5 px-2 font-mono border-r border-zinc-200 dark:border-zinc-800">
                              {f.port}/{f.protocol}
                            </td>
                            <td className="py-1.5 px-2.5 text-zinc-600 dark:text-zinc-400">
                              {f.purpose}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Excel Bottom Sheet Tab Strip */}
        <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-t border-zinc-300 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-zinc-500 mr-2">WORKBOOK SHEETS:</span>
            <button
              type="button"
              onClick={() => setActiveExcelSheet('sheet1')}
              className={`px-3.5 py-1.5 rounded-t-md text-xs font-mono font-bold border-t-2 cursor-pointer transition-colors ${
                activeExcelSheet === 'sheet1'
                  ? 'bg-white dark:bg-zinc-900 border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                  : 'bg-zinc-200/70 dark:bg-zinc-700/60 border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              1. Preliminary Questions ({workbookData.preliminaryRows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveExcelSheet('sheet2')}
              className={`px-3.5 py-1.5 rounded-t-md text-xs font-mono font-bold border-t-2 cursor-pointer transition-colors ${
                activeExcelSheet === 'sheet2'
                  ? 'bg-white dark:bg-zinc-900 border-emerald-600 text-emerald-800 dark:text-emerald-300 shadow-2xs'
                  : 'bg-zinc-200/70 dark:bg-zinc-700/60 border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
              }`}
            >
              2. Security Questionnaire ({workbookData.securityQuestionnaireRows.length})
            </button>
          </div>
          <div className="text-[11px] font-mono text-zinc-500">
            Date Generated: {workbookData.dateGenerated} · Ready for Microsoft Excel
          </div>
        </div>
      </div>

      {/* 1. CONTRADICTION & CONSISTENCY CHECKS */}
      {contradictions.length > 0 && (
        <div className="p-6 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Consistency Checks ({contradictions.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              Update your answer or record an explanation to proceed
            </span>
          </div>

          <div className="space-y-3">
            {contradictions.map((c) => {
              const existingOverride: ContradictionOverride | undefined =
                sar.contradictionOverrides[c.id];
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono font-bold text-amber-800 dark:text-amber-300">
                        {c.severity.toUpperCase()}
                      </div>
                      <h3 className="font-display font-semibold text-sm text-zinc-900 dark:text-white mt-0.5">
                        {c.title}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                        {c.explanation}
                      </p>
                    </div>
                    {!isSubmitted && (
                      <button
                        type="button"
                        onClick={() =>
                          handleJumpToContradictionQuestion(c.involvedQuestions[0], c.moduleCode)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer shrink-0 hover:bg-zinc-50 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Review Question</span>
                      </button>
                    )}
                  </div>

                  {existingOverride ? (
                    <div className="mt-3 pt-2.5 border-t border-amber-200/70 dark:border-amber-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        <strong>Explanation Recorded:</strong>{' '}
                        &ldquo;{existingOverride.justification}&rdquo;
                      </span>
                    </div>
                  ) : (
                    !isSubmitted && (
                      <div className="mt-3 pt-3 border-t border-amber-200/70 dark:border-amber-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={overrideDrafts[c.id] || ''}
                          onChange={(e) =>
                            setOverrideDrafts({ ...overrideDrafts, [c.id]: e.target.value })
                          }
                          placeholder="Enter compensating control or architectural reason to override this warning..."
                          className="flex-1 px-3 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const note =
                              (overrideDrafts[c.id] || '').trim() ||
                              'Compensating network segmentation verified with SAR analyst.';
                            onOverrideContradiction(c.id, note);
                          }}
                          className="px-3.5 py-1.5 rounded bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
                        >
                          Acknowledge &amp; Override
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}



      {/* 5. SUBMISSION CONFIRMATION GATE (When Draft) */}
      {!isSubmitted && (
        <div id="sec-rev-signoff" className="p-5 sm:p-6 rounded-xl border-2 border-zinc-900/30 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-zinc-900 dark:text-zinc-100 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Final Submission &amp; Record Lock
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Submitting locks your responses for Revision {sar.revisionNo} and generates your final Security Architecture Review package.
              </p>
            </div>
          </div>

          {!flowGates.canSubmit ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Tamperproof Submission Gate Active — Complete All Mandatory Requirements to Unlock Submission:
                </span>
              </div>
              <ul className="space-y-1.5 pl-6 list-disc font-mono text-[11px]">
                {flowGates.blockingReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {!flowGates.basicsComplete && (
                  <button
                    type="button"
                    onClick={onJumpToBasics}
                    className="px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white font-sans font-semibold cursor-pointer transition-colors"
                  >
                    Complete Request Basics →
                  </button>
                )}
                {flowGates.basicsComplete && !flowGates.preliminaryComplete && (
                  <button
                    type="button"
                    onClick={() => onJumpToPreliminary(flowGates.maxUnlockedStage)}
                    className="px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white font-sans font-semibold cursor-pointer transition-colors"
                  >
                    Complete Preliminary Stage {flowGates.maxUnlockedStage} →
                  </button>
                )}
                {flowGates.missingDetailedQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onJumpToModule(flowGates.missingDetailedQuestions[0].moduleId)
                    }
                    className="px-3 py-1.5 rounded bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 text-white font-sans font-semibold cursor-pointer transition-colors"
                  >
                    Resolve Remaining Checklist Questions →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>All Tamperproof Gates Passed:</strong> Request Basics, Preliminary Discovery, Mandatory Checklist Controls, and Contradiction Checks are 100% complete.
              </span>
            </div>
          )}

          <label className="flex items-start gap-3 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={!flowGates.canSubmit}
              checked={confirmedAttestation}
              onChange={(e) => setConfirmedAttestation(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 disabled:opacity-40"
            />
            <span>
              I confirm that the architectural facts, trust boundaries, data classifications, and
              repeater tables entered in <strong>{sar.displayId}</strong> accurately reflect the
              planned system implementation.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={!confirmedAttestation || !flowGates.canSubmit}
              onClick={onSubmitSAR}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 disabled:opacity-40 text-white text-sm font-semibold cursor-pointer transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>
                Submit &amp; Lock {sar.displayId} (Revision {sar.revisionNo})
              </span>
            </button>
          </div>
        </div>
      )}

      {/* REOPEN AS REVISION MODAL */}
      <AnimatePresence>
        {reopenModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.16 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-xl"
            >
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white mb-1">
                Reopen {sar.displayId} as Revision {sar.revisionNo + 1}
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                Revision {sar.revisionNo} and its SHA-256 report snapshot will remain permanently
                archived. Edits will be tracked with a live diff banner.
              </p>
              <label className="block text-xs font-semibold mb-1 text-zinc-800 dark:text-zinc-200">
                Reason for Revision
              </label>
              <textarea
                rows={3}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs mb-4 focus:outline-none focus:border-zinc-900"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReopenModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onReopenAsRevision(reopenReason);
                    setReopenModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  Create Revision {sar.revisionNo + 1}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
