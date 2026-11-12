import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Layers,
  CornerDownRight,
} from 'lucide-react';
import {
  SARRecord,
  DefinitionVersion,
  ModuleCode,
  QuestionDefinition,
  AnswerEntry,
  RepeaterTablesData,
} from '../shared/types';
import {
  resolveActiveUserThreads,
  getDetailedQuestionChainConfig,
  THREAD_DIMENSIONS,
} from '../shared/checklistChains';
import { CMDB_APPLICATIONS } from '../shared/definitions';
import { CyberKickerTrace } from './CyberScrollTrace';
import { RepeaterTableEditors } from './RepeaterTableEditors';

function getThreadShortLabel(dimKey: string, optionId?: string): string {
  if (!optionId) return 'Default';
  const dim = THREAD_DIMENSIONS.find((d) => d.id === dimKey);
  const found = dim?.options.find((o) => o.id === optionId);
  return found ? found.shortLabel : optionId;
}

function getCrispWhyText(rawText?: string, fallbackText?: string): string {
  const source = (rawText || fallbackText || '').trim();
  if (!source) return 'Verifies that this security control is in place before production release.';
  const firstSentence = source.split(/(?<=[.!?])\s+/)[0] || source;
  return firstSentence.length > 150 ? `${firstSentence.slice(0, 147)}...` : firstSentence;
}

interface DetailedModulesViewProps {
  sar: SARRecord;
  definition: DefinitionVersion;
  activeModule: ModuleCode;
  onSelectModule: (moduleCode: ModuleCode) => void;
  onAnswerQuestion: (
    questionId: string,
    value: unknown,
    extra?: { comment?: string; naReason?: string; unknownOwner?: string; unknownNote?: string }
  ) => void;
  onUpdateTables: (tables: RepeaterTablesData) => void;
  onBackToPreliminary: () => void;
  onProceedToReview: () => void;
}

function isQuestionAnswered(ans?: AnswerEntry): boolean {
  if (!ans || ans.state === 'inactive') return false;
  const val = ans.value;
  if (val === undefined || val === null || val === '') return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val as object).length > 0;
  return true;
}

function formatModuleTitle(title: string): string {
  return title.replace(/^Module\s+\d+\s*[—–-]\s*/i, '');
}

function extractNumericOrder(codeOrId: string): number {
  const match = codeOrId.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function getContextualDetailedQuestionTitle(
  q: QuestionDefinition,
  primaryApp: string,
  connectedApps: string[]
): string {
  const text = q.text || '';
  if (!primaryApp || primaryApp === 'Primary Application') return text;

  const hasConnected = connectedApps.length > 0;
  const connectedLabel =
    connectedApps.length <= 2
      ? connectedApps.join(' & ')
      : `${connectedApps.slice(0, 2).join(', ')} +${connectedApps.length - 2} more`;

  let contextual = text
    .replace(/\bthis application\b/gi, primaryApp)
    .replace(/\bthe application\b/gi, primaryApp)
    .replace(/\bthis solution\b/gi, primaryApp)
    .replace(/\bthe solution\b/gi, primaryApp);

  if (
    hasConnected &&
    (q.moduleId === 'M9' || q.moduleId === 'M8') &&
    !contextual.includes(connectedLabel) &&
    /\b(partner|connected|integration|external|api|file|webhook)\b/i.test(contextual)
  ) {
    contextual = `${contextual} (${primaryApp} ↔ ${connectedLabel})`;
  }

  return contextual;
}

export const DetailedModulesView: React.FC<DetailedModulesViewProps> = ({
  sar,
  definition,
  activeModule,
  onSelectModule,
  onAnswerQuestion,
  onUpdateTables,
  onBackToPreliminary,
  onProceedToReview,
}) => {
  const [hoveredWhyId, setHoveredWhyId] = useState<string | null>(null);

  const evaluation = sar.evaluation;
  const visibleSet = useMemo(
    () => new Set(evaluation?.visibleQuestionIds || []),
    [evaluation?.visibleQuestionIds]
  );

  // Strict ascending numerical order M1 -> M16
  const activeModules = useMemo(
    () =>
      [...(evaluation?.activeModules || [])]
        .filter((m) => m.code !== 'M0' && m.code !== 'M17')
        .sort((a, b) => extractNumericOrder(a.code) - extractNumericOrder(b.code)),
    [evaluation?.activeModules]
  );

  useEffect(() => {
    if (
      activeModules.length > 0 &&
      !activeModules.some((m) => m.code === activeModule)
    ) {
      onSelectModule(activeModules[0].code);
    }
  }, [activeModules, activeModule, onSelectModule]);

  const currentModule = useMemo(
    () => activeModules.find((m) => m.code === activeModule) || activeModules[0],
    [activeModules, activeModule]
  );

  const currentModuleDef = useMemo(
    () => definition.modules.find((m) => m.code === currentModule?.code),
    [definition.modules, currentModule?.code]
  );

  const currentModuleIndex = useMemo(
    () => activeModules.findIndex((m) => m.code === currentModule?.code),
    [activeModules, currentModule]
  );

  // Strict top-to-bottom ascending order of questions within each module
  const questionsByModuleMap = useMemo(() => {
    const map: Record<string, QuestionDefinition[]> = {};
    activeModules.forEach((m) => {
      map[m.code] = definition.questions
        .filter((q) => q.moduleId === m.code && visibleSet.has(q.id))
        .sort((a, b) => extractNumericOrder(a.id) - extractNumericOrder(b.id));
    });
    return map;
  }, [activeModules, definition.questions, visibleSet]);

  const currentModuleQuestions = useMemo(
    () => (currentModule ? questionsByModuleMap[currentModule.code] || [] : []),
    [currentModule, questionsByModuleMap]
  );

  const overallStats = useMemo(() => {
    let total = 0;
    let answered = 0;
    activeModules.forEach((m) => {
      const qs = questionsByModuleMap[m.code] || [];
      total += qs.length;
      qs.forEach((q) => {
        if (isQuestionAnswered(sar.answers[q.id])) answered += 1;
      });
    });
    return { total, answered };
  }, [activeModules, questionsByModuleMap, sar.answers]);

  const { activeUserTypes, matrix: threadMatrix } = useMemo(
    () => resolveActiveUserThreads(sar.answers),
    [sar.answers]
  );

  const primarySolutionName = useMemo(() => {
    const raw = (sar.basics.projectName || '').trim();
    if (!raw) return 'Primary Application Under Review';
    return raw.length > 64 ? `${raw.slice(0, 61)}...` : raw;
  }, [sar.basics.projectName]);

  const connectedSystemNames = useMemo(() => {
    const names: string[] = [];
    (sar.basics.connectedAppIds || []).forEach((id) => {
      const found = CMDB_APPLICATIONS.find((a) => a.id === id);
      if (found) names.push(found.canonicalName);
    });
    (sar.basics.customConnectedApps || []).forEach((custom) => {
      if (custom && custom.trim()) names.push(custom.trim());
    });
    return names;
  }, [sar.basics.connectedAppIds, sar.basics.customConnectedApps]);

  const handleToggleFollowUpYesNo = (
    questionId: string,
    followUpId: string,
    val: 'yes' | 'no'
  ) => {
    const mapKey = `${questionId}_FOLLOWUPS`;
    const existingRaw = sar.answers[mapKey]?.value;
    const existing =
      existingRaw && typeof existingRaw === 'object' && !Array.isArray(existingRaw)
        ? (existingRaw as Record<string, 'yes' | 'no'>)
        : {};
    onAnswerQuestion(mapKey, {
      ...existing,
      [followUpId]: val,
    });
  };

  const handleToggleThreadConfirm = (
    questionId: string,
    userTypeId: string,
    val: 'yes' | 'no'
  ) => {
    const mapKey = `${questionId}_THREADS`;
    const existingRaw = sar.answers[mapKey]?.value;
    const existing =
      existingRaw && typeof existingRaw === 'object' && !Array.isArray(existingRaw)
        ? (existingRaw as Record<string, 'yes' | 'no'>)
        : {};
    onAnswerQuestion(mapKey, {
      ...existing,
      [userTypeId]: val,
    });
  };

  const renderPrimaryControl = (q: QuestionDefinition) => {
    const ans = sar.answers[q.id];
    const currentVal = ans?.value;

    // 1. Single Select / Yes-No with explicit options (Option labels only, no sub-points)
    if (
      (q.answerType === 'single_select' ||
        q.answerType === 'yes_no' ||
        q.answerType === 'yes_no_not_sure') &&
      q.options &&
      q.options.length > 0
    ) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          {q.options.map((opt) => {
            const isSelected = currentVal === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onAnswerQuestion(q.id, opt.id)}
                className={`sar-glass-option px-3.5 py-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800/90'
                    : 'border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {opt.label}
                </span>
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    // 2. Multi-Select (Option labels only, no sub-points)
    if (q.answerType === 'multi_select' && q.options) {
      const selectedArr: string[] = Array.isArray(currentVal)
        ? (currentVal as string[])
        : typeof currentVal === 'string' && currentVal
        ? [currentVal]
        : [];

      const toggleOption = (optId: string, exclusive?: boolean) => {
        if (exclusive || optId === 'none') {
          onAnswerQuestion(q.id, [optId]);
          return;
        }
        const exclusiveIds = new Set(
          q.options?.filter((o) => o.exclusive || o.id === 'none').map((o) => o.id) || []
        );
        const filtered = selectedArr.filter((id) => !exclusiveIds.has(id));
        const exists = filtered.includes(optId);
        const next = exists ? filtered.filter((id) => id !== optId) : [...filtered, optId];
        onAnswerQuestion(q.id, next);
      };

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          {q.options.map((opt) => {
            const isSelected = selectedArr.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleOption(opt.id, opt.exclusive)}
                className={`sar-glass-option px-3.5 py-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800/90'
                    : 'border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {opt.label}
                </span>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  {isSelected && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    // 3. Default Yes/No Verification Buttons for Detailed Checklist Controls
    const chainCfg = getDetailedQuestionChainConfig(
      q.id,
      q.text,
      q.moduleId,
      q.showOnlyIfText
    );
    const isYesSelected =
      currentVal === 'yes' ||
      currentVal === true ||
      (typeof currentVal === 'string' &&
        currentVal.length > 0 &&
        currentVal !== 'no' &&
        currentVal !== 'not_applicable');
    const isNoSelected = currentVal === 'no' || currentVal === false;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
        {[
          {
            key: 'yes',
            label: chainCfg.yesLabel,
            selected: isYesSelected,
          },
          {
            key: 'no',
            label: chainCfg.noLabel,
            selected: isNoSelected,
          },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onAnswerQuestion(q.id, opt.key)}
            className={`sar-glass-option px-3.5 py-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
              opt.selected
                ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800/90'
                : 'border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
            }`}
          >
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
              {opt.label}
            </span>
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                opt.selected
                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                  : 'border-zinc-300 dark:border-zinc-600'
              }`}
            >
              {opt.selected && <CheckCircle2 className="w-3 h-3" />}
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderChainedFollowUps = (q: QuestionDefinition) => {
    const ans = sar.answers[q.id];
    if (!isQuestionAnswered(ans)) return null;

    const chainCfg = getDetailedQuestionChainConfig(
      q.id,
      q.text,
      q.moduleId,
      q.showOnlyIfText
    );

    const val = ans?.value;
    const isNegative =
      val === 'no' ||
      val === false ||
      val === 'not_sure' ||
      val === 'none' ||
      (Array.isArray(val) && val.includes('none'));

    const followUpsToShow = isNegative ? chainCfg.noFollowUps : chainCfg.yesFollowUps;
    const followUpRaw = sar.answers[`${q.id}_FOLLOWUPS`]?.value;
    const followUpMap: Record<string, 'yes' | 'no'> =
      followUpRaw && typeof followUpRaw === 'object' && !Array.isArray(followUpRaw)
        ? (followUpRaw as Record<string, 'yes' | 'no'>)
        : {};

    const threadConfirmRaw = sar.answers[`${q.id}_THREADS`]?.value;
    const threadConfirmMap: Record<string, 'yes' | 'no'> =
      threadConfirmRaw &&
      typeof threadConfirmRaw === 'object' &&
      !Array.isArray(threadConfirmRaw)
        ? (threadConfirmRaw as Record<string, 'yes' | 'no'>)
        : {};

    const showUserThreads =
      Boolean(chainCfg.supportsUserPlatformThreads) && activeUserTypes.length >= 2;

    if (followUpsToShow.length === 0 && !showUserThreads) return null;

    const count = activeUserTypes.length;
    const threadGridClass =
      count === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : count === 3
        ? 'grid-cols-1 md:grid-cols-3'
        : count === 4
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5';

    return (
      <div className="mt-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 space-y-4">
        {/* 1. Simple Guided Follow-Up Questions (Yes / No — Option titles only) */}
        {followUpsToShow.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
              <span>Follow-Up Questions (Yes / No)</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {followUpsToShow.map((subQ, subIdx) => {
                const chosen = followUpMap[subQ.id] || (isNegative ? 'no' : 'yes');
                return (
                  <div
                    key={subQ.id}
                    className="rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {subIdx + 1}. {subQ.prompt}
                    </div>

                    <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                      {(['yes', 'no'] as const).map((yn) => {
                        const active = chosen === yn;
                        return (
                          <button
                            key={yn}
                            type="button"
                            onClick={() => handleToggleFollowUpYesNo(q.id, subQ.id, yn)}
                            className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              active
                                ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-700'
                            }`}
                          >
                            {yn === 'yes' ? 'Yes' : 'No'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Clear Side-by-Side User × Platform Confirmation */}
        {showUserThreads && (
          <div className="space-y-2.5 pt-1">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider font-bold text-zinc-800 dark:text-zinc-200">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>SIDE-BY-SIDE USER × PLATFORM THREADS ({count})</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Confirm whether this security control is enabled for each user type below:
              </p>
            </div>

            <div className={`grid gap-3.5 ${threadGridClass}`}>
              {activeUserTypes.map((uMeta, tIdx) => {
                const row = threadMatrix[uMeta.userTypeId] || uMeta.defaultValues;
                const chosen = threadConfirmMap[uMeta.userTypeId] || 'yes';
                const platformShort = getThreadShortLabel('platform', row.platform);

                return (
                  <div
                    key={uMeta.userTypeId}
                    className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="pb-2.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                            THREAD {tIdx + 1} · {uMeta.shortLabel.toUpperCase()}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white mt-0.5 leading-snug">
                            {uMeta.label}
                          </div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0 mt-0.5" />
                      </div>

                      <div className="mt-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
                        Is this control enabled for {uMeta.shortLabel} ({platformShort})?
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {(['yes', 'no'] as const).map((yn) => {
                        const active = chosen === yn;
                        return (
                          <button
                            key={yn}
                            type="button"
                            onClick={() =>
                              handleToggleThreadConfirm(q.id, uMeta.userTypeId, yn)
                            }
                            className={`px-2.5 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                              active
                                ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
                                : 'border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-700'
                            }`}
                          >
                            <span className="text-xs">{yn === 'yes' ? 'Yes' : 'No'}</span>
                            <span
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                                active
                                  ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                  : 'border-zinc-300 dark:border-zinc-600'
                              }`}
                            >
                              {active && <CheckCircle2 className="w-2.5 h-2.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentModuleAnsweredCount = useMemo(
    () =>
      currentModuleQuestions.filter((q) => isQuestionAnswered(sar.answers[q.id])).length,
    [currentModuleQuestions, sar.answers]
  );

  const isExpandedForSideBySide = activeUserTypes.length >= 2;
  const containerWidthClass =
    activeUserTypes.length >= 4
      ? 'max-w-[1440px]'
      : isExpandedForSideBySide
      ? 'max-w-7xl'
      : 'max-w-5xl';

  return (
    <div className={`${containerWidthClass} mx-auto px-4 sm:px-6 xl:pl-14 py-6 transition-all`}>
      {/* Phase 3 Header */}
      <div
        id="sec-mod-origin"
        className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">
            <CyberKickerTrace />
            <span>PHASE 3 OF 5</span>
            <span>•</span>
            <span>DETAILED CHECKLIST</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Security Checklist ({activeModules.length} Sections)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Answer the simple Yes/No questions below for each section unlocked by your Preliminary Discovery.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 tabular-nums">
            {overallStats.answered}/{overallStats.total}
          </span>
          <button
            type="button"
            onClick={onProceedToReview}
            className="sar-glass-primary-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Architecture Flow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Application Architecture Scope Bar — Distinguishes Primary Solution vs Connected Applications */}
      <div className="mb-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
            Primary Solution Under SAR
          </span>
          <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white truncate">
            {primarySolutionName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mr-1">
            Connected Systems ({connectedSystemNames.length}):
          </span>
          {connectedSystemNames.length > 0 ? (
            connectedSystemNames.map((appName, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
              >
                {appName}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Standalone (No external connected apps declared in Basics)
            </span>
          )}
        </div>
      </div>

      {/* Main Responsive Grid: Left Section Rail + Right Active Section Controls */}
      <div id="sec-mod-controls" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Section Navigation Rail */}
        <aside
          className={`${
            isExpandedForSideBySide ? 'lg:col-span-3 xl:col-span-2' : 'lg:col-span-3'
          } lg:sticky lg:top-20 space-y-2`}
        >
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
              Checklist Sections
            </span>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
              {currentModuleIndex + 1}/{activeModules.length}
            </span>
          </div>

          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {activeModules.map((mod) => {
              const qs = questionsByModuleMap[mod.code] || [];
              const answered = qs.filter((q) => isQuestionAnswered(sar.answers[q.id])).length;
              const isSelected = currentModule?.code === mod.code;
              const isDone = qs.length > 0 && answered === qs.length;

              return (
                <button
                  key={mod.code}
                  type="button"
                  onClick={() => onSelectModule(mod.code)}
                  className={`shrink-0 lg:w-full text-left px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950 text-white dark:border-white dark:ring-white dark:bg-white dark:text-zinc-950 shadow-2xs'
                      : 'sar-glass-card border-zinc-200/90 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isSelected
                            ? 'bg-white/15 text-white dark:bg-zinc-900/15 dark:text-zinc-950'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {mod.code}
                      </span>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected
                            ? 'text-white dark:text-zinc-950'
                            : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        {mod.shortTitle || formatModuleTitle(mod.title)}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-mono font-semibold flex items-center gap-1 shrink-0 tabular-nums ${
                        isSelected
                          ? 'text-zinc-200 dark:text-zinc-700'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {answered}/{qs.length}
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onBackToPreliminary}
            className="hidden lg:inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Preliminary</span>
          </button>
        </aside>

        {/* Right Section Questions Stream */}
        <motion.div
          key={currentModule?.code || activeModule}
          id="sec-mod-questions"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className={`${
            isExpandedForSideBySide ? 'lg:col-span-9 xl:col-span-10' : 'lg:col-span-9'
          } space-y-4`}
        >
          {currentModule && (
            <div className="sar-glass-card rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-mono font-bold">
                    {currentModule.code}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                    {formatModuleTitle(currentModule.title)}
                  </h2>
                </div>
                <span className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                  {currentModuleAnsweredCount}/{currentModuleQuestions.length}
                </span>
              </div>

              {currentModuleDef?.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  {currentModuleDef.description}
                </p>
              )}
            </div>
          )}

          {/* Questions in Current Module */}
          <div className="space-y-4">
            {currentModuleQuestions.map((q, idx) => {
              const ans = sar.answers[q.id];
              const answered = isQuestionAnswered(ans);
              const chainCfg = getDetailedQuestionChainConfig(
                q.id,
                q.text,
                q.moduleId,
                q.showOnlyIfText
              );
              const isWhyOpen = hoveredWhyId === q.id;
              const crispWhy = getCrispWhyText(q.whyWeAsk, chainCfg.chainFromPreliminary);

              return (
                <div
                  key={q.id}
                  id={`mod-q-${q.id}`}
                  data-scroll-card="true"
                  data-scroll-label={`${q.code} · Question ${idx + 1}`}
                  className="sar-glass-card rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 transition-all"
                >
                  {/* Clean Top Row — Simple Question Number + Short Hovering Why We Ask */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[10px] font-mono font-bold tabular-nums">
                        Question {idx + 1} of {currentModuleQuestions.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {(q.whyWeAsk || chainCfg.chainFromPreliminary) && (
                        <div
                          className="relative"
                          onMouseEnter={() => setHoveredWhyId(q.id)}
                          onMouseLeave={() => setHoveredWhyId(null)}
                        >
                          <button
                            type="button"
                            onClick={() => setHoveredWhyId(isWhyOpen ? null : q.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Why we ask</span>
                          </button>

                          {isWhyOpen && (
                            <div className="absolute right-0 top-full mt-1.5 z-40 w-64 sm:w-72 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg text-[11px] leading-snug text-zinc-700 dark:text-zinc-200">
                              {crispWhy}
                            </div>
                          )}
                        </div>
                      )}

                      {answered && (
                        <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Question Headline & Hint */}
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white leading-snug">
                    {getContextualDetailedQuestionTitle(
                      q,
                      primarySolutionName,
                      connectedSystemNames
                    )}
                  </h3>
                  {q.hint && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                      {q.hint}
                    </p>
                  )}

                  {/* Primary Control Input */}
                  {renderPrimaryControl(q)}

                  {/* Dynamic Connected Follow-up Checks & Side-by-Side Threads */}
                  {renderChainedFollowUps(q)}
                </div>
              );
            })}
          </div>

          {/* Module Repeater Table (e.g., Firewall Rules, API Endpoints, Integrations) */}
          {currentModuleDef?.repeaterTable && currentModuleDef.repeaterTable !== 'servers' && (
            <RepeaterTableEditors
              tableType={currentModuleDef.repeaterTable}
              tables={sar.tables}
              internetFacing={Boolean(evaluation?.flags.internet_facing)}
              isReadOnly={sar.status === 'submitted'}
              onUpdateTables={onUpdateTables}
            />
          )}

          {/* Section Footer Navigation */}
          <div
            id="sec-mod-evidence"
            className="sar-glass-card rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
              Section {currentModuleIndex + 1}/{activeModules.length} ·{' '}
              {currentModuleAnsweredCount}/{currentModuleQuestions.length} Answered
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {currentModuleIndex > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    onSelectModule(activeModules[currentModuleIndex - 1].code)
                  }
                  className="sar-glass-btn px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  Previous Section
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onBackToPreliminary}
                  className="sar-glass-btn px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  Back to Preliminary
                </button>
              )}

              {currentModuleIndex < activeModules.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    onSelectModule(activeModules[currentModuleIndex + 1].code)
                  }
                  className="sar-glass-primary-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <span>Next: {activeModules[currentModuleIndex + 1].code}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onProceedToReview}
                  className="sar-glass-primary-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <span>Continue to Architecture Flow</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
