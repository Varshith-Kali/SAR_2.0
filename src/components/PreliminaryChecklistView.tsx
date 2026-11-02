import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  History,
  Info,
  Lock,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { MODULE_CATALOG } from '../shared/definitions';
import { evaluateFlowGates } from '../shared/rulesEngine';
import {
  DefinitionVersion,
  ModuleCode,
  QuestionDefinition,
  SARRecord,
} from '../shared/types';

interface PreliminaryChecklistViewProps {
  sar: SARRecord;
  definition: DefinitionVersion;
  activeStage: number; // 1..6 = stages, 7 = Category Confirmation & Roadmap
  onChangeStage: (stage: number) => void;
  onAnswerQuestion: (
    questionId: string,
    value: unknown,
    extra?: { naReason?: string; unknownOwner?: string; unknownNote?: string }
  ) => void;
  onUpdateManualCategories: (manual: {
    added: string[];
    removed: string[];
    fullReviewRequested: boolean;
    reason?: string;
  }) => void;
  onOpenDetailedModule: (moduleCode: ModuleCode) => void;
  onDelegateModule: (moduleCode: ModuleCode, assigneeName: string, assigneeEmail: string, note: string) => void;
  scopeChangeNotice: {
    added: ModuleCode[];
    removed: ModuleCode[];
    previousAnswer?: { questionId: string; value: unknown };
  } | null;
  onUndoScopeChange: () => void;
  onDismissScopeNotice: () => void;
}

const STAGES = [
  { num: 1, title: 'WHO — Users & Identities', subtitle: 'Human, automated & vendor access' },
  { num: 2, title: 'HOW — Channels & Connectivity', subtitle: 'Interfaces, APIs, files & network' },
  { num: 3, title: 'WHERE — Hosting & Locations', subtitle: 'Platform, environments & reachability' },
  { num: 4, title: 'WHAT — Scope, Data & Assets', subtitle: 'Objective, components, data & AI' },
];

export const PreliminaryChecklistView: React.FC<PreliminaryChecklistViewProps> = ({
  sar,
  definition,
  activeStage,
  onChangeStage,
  onAnswerQuestion,
  onUpdateManualCategories,
  onOpenDetailedModule,
  onDelegateModule,
  scopeChangeNotice,
  onUndoScopeChange,
  onDismissScopeNotice,
}) => {
  const [activeHelpQId, setActiveHelpQId] = useState<string | null>(null);
  const [historyPopoverQId, setHistoryPopoverQId] = useState<string | null>(null);
  const [delegateModalMod, setDelegateModalMod] = useState<ModuleCode | null>(null);
  const [delegateName, setDelegateName] = useState(sar.basics.technicalOwner || 'Prathamesh');
  const [delegateEmail, setDelegateEmail] = useState(
    sar.basics.technicalOwnerEmail || 'prathamesh@enterprise.internal'
  );
  const [delegateNote, setDelegateNote] = useState('');
  const [stageGateMessage, setStageGateMessage] = useState<string | null>(null);

  const evalRes = sar.evaluation;
  const visibleQIds = useMemo(
    () => new Set(evalRes?.visibleQuestionIds || []),
    [evalRes?.visibleQuestionIds]
  );
  const requiredQIds = useMemo(
    () => new Set(evalRes?.requiredQuestionIds || []),
    [evalRes?.requiredQuestionIds]
  );
  const isReadOnly = sar.status === 'submitted';
  const flowGates = useMemo(() => evaluateFlowGates(sar, definition), [sar, definition]);

  const stageProgressMap = useMemo(() => {
    const map = new Map<number, { total: number; answered: number }>();
    for (const q of definition.questions) {
      if (q.stage === undefined || !visibleQIds.has(q.id)) continue;
      let entry = map.get(q.stage);
      if (!entry) {
        entry = { total: 0, answered: 0 };
        map.set(q.stage, entry);
      }
      entry.total++;
      const v = sar.answers[q.id]?.value;
      if (
        v !== undefined &&
        v !== null &&
        v !== '' &&
        !(Array.isArray(v) && v.length === 0)
      ) {
        entry.answered++;
      }
    }
    return map;
  }, [definition.questions, visibleQIds, sar.answers]);

  const stageQuestions = useMemo(
    () =>
      definition.questions.filter(
        (q) => q.stage === activeStage && visibleQIds.has(q.id)
      ),
    [definition.questions, activeStage, visibleQIds]
  );

  // Screen-reader & focus management on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveHelpQId(null);
  }, [activeStage]);

  const handleToggleOption = (q: QuestionDefinition, optId: string, isExclusive?: boolean) => {
    if (isReadOnly) return;
    if (
      q.answerType === 'single_select' ||
      q.answerType === 'yes_no' ||
      q.answerType === 'yes_no_not_sure'
    ) {
      onAnswerQuestion(q.id, optId);
      return;
    }

    // Multi-select with exclusive option support ("None" clears other options)
    const currentRaw = sar.answers[q.id]?.value;
    const currentArr: string[] = Array.isArray(currentRaw) ? currentRaw.map(String) : [];

    if (isExclusive) {
      if (currentArr.includes(optId)) {
        onAnswerQuestion(q.id, []);
      } else {
        onAnswerQuestion(q.id, [optId]);
      }
      return;
    }

    // Remove any exclusive option when selecting a normal option
    const exclusiveIds = new Set(
      (q.options || []).filter((o) => o.exclusive).map((o) => o.id)
    );
    const cleaned = currentArr.filter((id) => !exclusiveIds.has(id));
    const nextArr = cleaned.includes(optId)
      ? cleaned.filter((id) => id !== optId)
      : [...cleaned, optId];
    onAnswerQuestion(q.id, nextArr);
  };

  const handleAddManualModule = (code: ModuleCode) => {
    if (isReadOnly) return;
    const cur = sar.manualCategories;
    const added = cur.added.includes(code) ? cur.added : [...cur.added, code];
    const removed = cur.removed.filter((c) => c !== code);
    onUpdateManualCategories({ ...cur, added, removed });
  };

  const handleRemoveModule = (code: ModuleCode) => {
    if (isReadOnly || code === 'M0' || code === 'M17') return;
    const cur = sar.manualCategories;
    const removed = cur.removed.includes(code) ? cur.removed : [...cur.removed, code];
    const added = cur.added.filter((c) => c !== code);
    onUpdateManualCategories({ ...cur, added, removed });
  };

  const submitDelegation = () => {
    if (!delegateModalMod) return;
    onDelegateModule(delegateModalMod, delegateName, delegateEmail, delegateNote);
    setDelegateModalMod(null);
    setDelegateNote('');
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-5">
      {/* Scope Change Summary Banner with Undo */}
      {scopeChangeNotice && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 p-4 rounded-xl border border-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 dark:border-zinc-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 text-xs text-zinc-900 dark:text-zinc-100">
            <Sparkles className="w-4 h-4 text-zinc-900 dark:text-zinc-200 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Checklist updated: </span>
              {scopeChangeNotice.added.length > 0 && (
                <span>
                  {scopeChangeNotice.added.length} section(s) added
                  {scopeChangeNotice.removed.length > 0 ? ', ' : '. '}
                </span>
              )}
              {scopeChangeNotice.removed.length > 0 && (
                <span>
                  {scopeChangeNotice.removed.length} no longer needed.{' '}
                </span>
              )}
              <span className="text-zinc-600 dark:text-zinc-300">
                Your earlier answers are safely kept if you switch back.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {scopeChangeNotice.previousAnswer && (
              <button
                type="button"
                onClick={onUndoScopeChange}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo change</span>
              </button>
            )}
            <button
              type="button"
              onClick={onDismissScopeNotice}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE & TABLET HORIZONTAL STAGE STRIP (< lg) */}
      <div className="lg:hidden mb-4 space-y-2.5">
        <div className="sar-glass-card rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-2.5">
          <div className="flex items-center justify-between px-1 mb-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            <span className="font-bold uppercase tracking-wider">Preliminary Stages (WHO · HOW · WHERE · WHAT)</span>
            <span>
              {evalRes?.activeModules.length || 2} Sections
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {STAGES.map((st) => {
              const prog = stageProgressMap.get(st.num) || { total: 0, answered: 0 };
              const stGate = flowGates.stages[st.num];
              const isComplete = stGate?.complete && prog.total > 0;
              const isUnlocked = stGate?.unlocked ?? true;
              const isCurrent = activeStage === st.num;

              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => {
                    if (!isUnlocked && !isReadOnly) {
                      setStageGateMessage(
                        `Please complete all required questions in Stage ${flowGates.maxUnlockedStage} first.`
                      );
                      return;
                    }
                    setStageGateMessage(null);
                    onChangeStage(st.num);
                  }}
                  className={`sar-glass-step-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 cursor-pointer ${
                    isCurrent
                      ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                      : isUnlocked
                      ? 'bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 opacity-70'
                  }`}
                >
                  {!isUnlocked ? (
                    <Lock className="w-3 h-3 shrink-0" />
                  ) : isComplete ? (
                    <Check
                      className={`w-3 h-3 shrink-0 ${
                        isCurrent ? 'text-white dark:text-zinc-900' : 'text-emerald-600'
                      }`}
                    />
                  ) : null}
                  <span>
                    {st.num}. {st.title}
                  </span>
                  <span className="font-mono text-[10px] opacity-75">
                    ({prog.answered}/{prog.total})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3-Column Desktop Canvas */}
      <div id="sec-prelim-origin" className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT RAIL: 4 Canonical Stages (WHO, HOW, WHERE, WHAT) + Direct Launch to Detailed Modules */}
        <aside className="sar-glass-card hidden lg:block lg:col-span-3 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 lg:sticky lg:top-20">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 px-2 mb-3">
            Phase 2 · Preliminary (WHO · HOW · WHERE · WHAT)
          </div>
          <nav className="space-y-1.5">
            {STAGES.map((st) => {
              const prog = stageProgressMap.get(st.num) || { total: 0, answered: 0 };
              const stGate = flowGates.stages[st.num];
              const isComplete = stGate?.complete && prog.total > 0;
              const isUnlocked = stGate?.unlocked ?? true;
              const isCurrent = activeStage === st.num;

              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={() => {
                    if (!isUnlocked && !isReadOnly) {
                      setStageGateMessage(
                        `Please complete required questions in Stage ${flowGates.maxUnlockedStage} first (${
                          flowGates.stages[flowGates.maxUnlockedStage]?.missingCodes.length || 0
                        } remaining).`
                      );
                      setTimeout(() => setStageGateMessage(null), 3500);
                      return;
                    }
                    setStageGateMessage(null);
                    onChangeStage(st.num);
                  }}
                  className={`sar-glass-step-btn w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer border ${
                    isCurrent
                      ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-semibold shadow-xs'
                      : isUnlocked
                      ? 'border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/90 dark:hover:bg-zinc-800/70 hover:border-zinc-200 dark:hover:border-zinc-700'
                      : 'border-transparent text-zinc-400 dark:text-zinc-600 opacity-75'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs truncate flex items-center gap-1.5">
                      {!isUnlocked && <Lock className="w-3 h-3 text-zinc-400 shrink-0" />}
                      <span>
                        {st.num}. {st.title}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] truncate ${
                        isCurrent
                          ? 'text-zinc-300 dark:text-zinc-600'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {st.subtitle}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[11px] shrink-0 tabular-nums px-1.5 py-0.5 rounded-full ${
                      isCurrent
                        ? 'bg-white/15 text-white dark:bg-zinc-900/15 dark:text-zinc-900 font-semibold'
                        : isComplete
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold'
                        : 'text-zinc-400'
                    }`}
                  >
                    {prog.answered}/{prog.total}
                  </span>
                </button>
              );
            })}

            <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  if (!flowGates.preliminaryComplete && !isReadOnly) {
                    setStageGateMessage(
                      `Complete remaining questions (${flowGates.missingPreliminaryCodes.length} remaining) to customize or delegate sections.`
                    );
                    setTimeout(() => setStageGateMessage(null), 3500);
                    return;
                  }
                  setStageGateMessage(null);
                  onChangeStage(5);
                }}
                className={`sar-glass-step-btn w-full text-left px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer border ${
                  activeStage === 5
                    ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-semibold shadow-xs'
                    : flowGates.preliminaryComplete || isReadOnly
                    ? 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/90 dark:hover:bg-zinc-800/70'
                    : 'border-transparent text-zinc-400 opacity-75'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs flex items-center gap-1.5 truncate">
                    {!flowGates.preliminaryComplete && !isReadOnly && (
                      <Lock className="w-3 h-3 shrink-0" />
                    )}
                    <span>5. Customize / Delegate Scope</span>
                  </div>
                  <div
                    className={`text-[11px] truncate ${
                      activeStage === 5
                        ? 'text-zinc-300 dark:text-zinc-600'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    Add/remove sections or assign teammates
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!flowGates.preliminaryComplete && !isReadOnly) {
                    setStageGateMessage(
                      `Complete remaining questions (${flowGates.missingPreliminaryCodes.length} remaining) to open Checklist.`
                    );
                    setTimeout(() => setStageGateMessage(null), 3500);
                    return;
                  }
                  setStageGateMessage(null);
                  onOpenDetailedModule('M1');
                }}
                className={`sar-glass-step-btn w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer ${
                  flowGates.preliminaryComplete || isReadOnly
                    ? 'bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white font-semibold shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
              >
                <div>
                  <div className="text-xs flex items-center gap-1.5">
                    {!flowGates.preliminaryComplete && !isReadOnly && (
                      <Lock className="w-3 h-3 shrink-0" />
                    )}
                    <span>Proceed to Checklist</span>
                  </div>
                  <div
                    className={`text-[11px] ${
                      flowGates.preliminaryComplete || isReadOnly
                        ? 'text-zinc-300 dark:text-zinc-600'
                        : 'text-zinc-400'
                    }`}
                  >
                    {evalRes?.activeModules.length || 2} sections tailored
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          </nav>
        </aside>

        {/* CENTRE AREA: Questions for Stage 1..4 OR Screen #5 Category Confirmation (Stage 5) */}
        <main className="lg:col-span-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
              style={{ willChange: 'opacity, transform' }}
              className="space-y-5"
            >
              {activeStage <= 4 ? (
                <>
                  {/* Stage Header */}
                  <div
                    id="sec-prelim-stage"
                    className="sar-glass-card p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[11px] font-semibold">
                        Stage {activeStage} of 4
                      </span>
                      <span>{stageQuestions.length} Questions in Stage</span>
                    </div>
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
                      {STAGES[activeStage - 1].title}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {STAGES[activeStage - 1].subtitle} — Select the options that apply to your
                      project.
                    </p>
                  </div>

                  {/* Question Cards */}
                  {stageQuestions.map((q, qIdx) => {
                    const ansEntry = sar.answers[q.id];
                    const rawVal = ansEntry?.value;
                    const selectedArr: string[] = Array.isArray(rawVal)
                      ? rawVal.map(String)
                      : rawVal !== undefined && rawVal !== null && rawVal !== ''
                      ? [String(rawVal)]
                      : [];
                    const isHelpOpen = activeHelpQId === q.id;

                    return (
                      <div
                        key={q.id}
                        id={`question-${q.id}`}
                        data-question-code={q.code}
                        className="sar-glass-card p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 relative"
                      >
                        {/* Top Question Meta */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-[11px] font-bold">
                              Question {qIdx + 1}
                            </span>
                            <span>
                              {q.answerType === 'multi_select'
                                ? 'Select all that apply'
                                : q.answerType === 'long_text'
                                ? 'Optional note'
                                : 'Select one'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {ansEntry && ansEntry.history.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setHistoryPopoverQId(historyPopoverQId === q.id ? null : q.id)
                                }
                                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5" />
                                <span>History ({ansEntry.history.length})</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Question Title + Red Asterisk + Floating Small Info Icon Tooltip */}
                        <div className="flex items-start justify-between gap-3 mb-3.5 relative">
                          <h2 className="font-display text-base sm:text-lg font-bold text-zinc-950 dark:text-white leading-snug">
                            {q.text}
                            {requiredQIds.has(q.id) && (
                              <span className="text-red-500 ml-1" aria-label="Required">
                                *
                              </span>
                            )}
                          </h2>

                          {/* Small Info Icon Trigger for Floating Plain-English Tooltip */}
                          <div
                            className="relative shrink-0"
                            onMouseEnter={() => setActiveHelpQId(q.id)}
                            onMouseLeave={() =>
                              setActiveHelpQId((prev) => (prev === q.id ? null : prev))
                            }
                          >
                            <button
                              type="button"
                              aria-label="Help and guidance for this question"
                              aria-expanded={isHelpOpen}
                              onClick={() =>
                                setActiveHelpQId((prev) => (prev === q.id ? null : q.id))
                              }
                              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                                isHelpOpen
                                  ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                                  : 'bg-zinc-100/90 text-zinc-600 border-zinc-200/90 hover:bg-zinc-200/80 hover:text-zinc-950 dark:bg-zinc-800/90 dark:text-zinc-300 dark:border-zinc-700 dark:hover:text-white'
                              }`}
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            <AnimatePresence>
                              {isHelpOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                  transition={{ duration: 0.14 }}
                                  role="tooltip"
                                  className="absolute right-0 top-9 z-30 w-72 sm:w-80 p-3.5 rounded-xl bg-zinc-950 text-white dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-800 dark:border-zinc-700 shadow-xl text-xs space-y-2"
                                >
                                  <div>
                                    <div className="font-semibold text-zinc-300 dark:text-zinc-400 text-[11px] uppercase tracking-wider mb-0.5">
                                      Why we ask
                                    </div>
                                    <p className="text-zinc-100 dark:text-zinc-200 leading-relaxed">
                                      {q.whyWeAsk}
                                    </p>
                                  </div>
                                  {q.hint && (
                                    <div className="pt-1.5 border-t border-zinc-800 dark:border-zinc-700/80">
                                      <div className="font-semibold text-zinc-300 dark:text-zinc-400 text-[11px] uppercase tracking-wider mb-0.5">
                                        What to select
                                      </div>
                                      <p className="text-zinc-200 dark:text-zinc-300 leading-relaxed">
                                        {q.hint}
                                      </p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Answer History Popover */}
                        {historyPopoverQId === q.id && ansEntry && (
                          <div className="mb-3.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
                            <div className="font-semibold text-zinc-950 dark:text-white mb-2">
                              Answer History
                            </div>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                              {ansEntry.history.map((h, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between gap-2 py-1 border-b border-zinc-200/60 dark:border-zinc-700/60 last:border-none"
                                >
                                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300">
                                    {JSON.stringify(h.value)} · by {h.updatedBy}
                                  </span>
                                  {!isReadOnly && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onAnswerQuestion(q.id, h.value);
                                        setHistoryPopoverQId(null);
                                      }}
                                      className="text-zinc-950 dark:text-zinc-200 font-semibold hover:underline cursor-pointer"
                                    >
                                      Restore
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Compact, Clean Customer-Facing Option Tiles or Textarea */}
                        {q.answerType === 'long_text' ? (
                          <div>
                            <textarea
                              rows={3}
                              disabled={isReadOnly}
                              value={typeof rawVal === 'string' ? rawVal : ''}
                              onChange={(e) => onAnswerQuestion(q.id, e.target.value)}
                              placeholder="Enter any additional notes, target timelines, or context for the review team..."
                              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950 text-zinc-950 dark:text-white text-sm focus:outline-none focus:bg-white focus:border-zinc-950 dark:focus:border-zinc-300 transition-colors"
                            />
                          </div>
                        ) : (
                          <div
                            className={`grid gap-2 ${
                              (q.options?.length || 0) <= 3
                                ? 'grid-cols-1 sm:grid-cols-3'
                                : 'grid-cols-1 sm:grid-cols-2'
                            }`}
                          >
                            {(q.options || []).map((opt) => {
                              const isSelected = selectedArr.includes(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={isReadOnly}
                                  onClick={() => handleToggleOption(q, opt.id, opt.exclusive)}
                                  className={`sar-glass-option text-left px-3.5 py-2.5 rounded-xl border cursor-pointer flex items-center justify-between gap-2.5 transition-all ${
                                    isSelected
                                      ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:bg-zinc-800/90 dark:border-zinc-200 dark:ring-zinc-200'
                                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white/85 dark:bg-zinc-900/60'
                                  }`}
                                >
                                  <span className="font-display font-medium text-sm text-zinc-950 dark:text-white leading-snug">
                                    {opt.label}
                                  </span>
                                  <span
                                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                      isSelected
                                        ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900'
                                        : 'border border-zinc-300 dark:border-zinc-700 text-transparent'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Stage Gate Notice */}
                  {stageGateMessage && (
                    <div className="px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{stageGateMessage}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStageGateMessage(null)}
                        className="p-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Stage Navigation Footer */}
                  <div
                    id="sec-prelim-next"
                    className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setStageGateMessage(null);
                        onChangeStage(Math.max(1, activeStage - 1));
                      }}
                      disabled={activeStage === 1}
                      className="sar-glass-step-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-zinc-950 dark:hover:border-zinc-300 disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Previous Stage</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const currentStageGate = flowGates.stages[activeStage];
                        if (currentStageGate && !currentStageGate.complete && !isReadOnly) {
                          setStageGateMessage(
                            `Please complete the ${currentStageGate.missingCodes.length} remaining required question(s) in Stage ${activeStage} first.`
                          );
                          setTimeout(() => setStageGateMessage(null), 3500);
                          const missingCode = currentStageGate.missingCodes[0];
                          const firstMissingEl =
                            document.getElementById(`question-${missingCode}`) ||
                            document.querySelector(`[data-question-code="${missingCode}"]`);
                          firstMissingEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          return;
                        }
                        setStageGateMessage(null);
                        if (activeStage < 4) {
                          onChangeStage(activeStage + 1);
                        } else {
                          onOpenDetailedModule('M1');
                        }
                      }}
                      className="sar-glass-step-btn inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      <span>
                        {activeStage < 4
                          ? `Continue to Stage ${activeStage + 1}: ${STAGES[activeStage].title}`
                          : `Complete Preliminary → Open Checklist (${
                              evalRes?.activeModules.length || 2
                            })`}
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </>
              ) : (
                /* SCREEN #5: CATEGORY CONFIRMATION & ROADMAP WORKSPACE */
                <div className="space-y-6">
                  <div className="sar-glass-card p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-1">
                      Preliminary Checklist Complete · Tailored Sections
                    </div>
                    <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                      Tailored Security Checklist Sections
                    </h1>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      Based on your answers, we selected the checklist sections below. You can
                      delegate specific technical sections to teammates or open any section to begin.
                    </p>

                    {/* Primary + Secondary Detected Categories */}
                    <div className="mt-5 p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white mb-2">
                        Project areas identified:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(evalRes?.detectedCategories || []).map((cat) => (
                          <div
                            key={cat.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" />
                            <strong className="text-zinc-900 dark:text-white">{cat.label}</strong>
                            {cat.isPrimary && (
                              <span className="text-[11px] text-zinc-500">(Primary)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ordered Unlocked Modules List */}
                  <div className="sar-glass-card p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                        Your Checklist Roadmap ({evalRes?.activeModules.length || 0} Sections)
                      </h2>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateManualCategories({
                            ...sar.manualCategories,
                            fullReviewRequested: !sar.manualCategories.fullReviewRequested,
                          })
                        }
                        className="text-xs font-medium text-zinc-900 dark:text-zinc-200 hover:underline cursor-pointer"
                      >
                        {sar.manualCategories.fullReviewRequested
                          ? 'Use tailored sections only'
                          : 'Unlock all 18 sections'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(evalRes?.activeModules || []).map((mod) => {
                        const delegation = sar.delegations?.[mod.code];
                        return (
                          <div
                            key={mod.code}
                            className="sar-glass-option p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-display font-semibold text-sm text-zinc-900 dark:text-white">
                                  {mod.title}
                                </span>
                                {mod.code !== 'M0' && mod.code !== 'M17' && (
                                  <span className="font-mono text-zinc-500 tabular-nums">
                                    · {mod.visibleQuestionCount ?? 0} questions
                                  </span>
                                )}
                              </div>
                              {delegation && (
                                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                                  Delegated to {delegation.assigneeName} ({delegation.assigneeEmail})
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {mod.code !== 'M0' && mod.code !== 'M17' && (
                                <button
                                  type="button"
                                  onClick={() => setDelegateModalMod(mod.code)}
                                  className="sar-glass-step-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                  <Share2 className="w-3 h-3" />
                                  <span>Delegate</span>
                                </button>
                              )}
                              {mod.isManuallyAdded && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveModule(mod.code)}
                                  className="sar-glass-step-btn px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOpenDetailedModule(mod.code)}
                                className="sar-glass-step-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                              >
                                <span>Open Section</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Add a Missed Module Picker */}
                    <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Need an additional section? Click to add:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {MODULE_CATALOG.filter(
                          (m) => !evalRes?.activeModules.some((am) => am.code === m.code)
                        ).map((m) => (
                          <button
                            key={m.code}
                            type="button"
                            onClick={() => handleAddManualModule(m.code)}
                            className="sar-glass-step-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{m.shortTitle}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stage 5 Navigation Footer */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => onChangeStage(4)}
                      className="sar-glass-step-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-zinc-950 dark:hover:border-zinc-300 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Stage 4: WHAT</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDetailedModule('M1')}
                      className="sar-glass-step-btn inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      <span>Open Security Checklist ({evalRes?.activeModules.length || 2} Sections)</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* RIGHT LIVE PANEL: Clean User-Facing Summary ("Your request so far") */}
        <aside
          id="sec-prelim-rules"
          className="sar-glass-card lg:col-span-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 lg:sticky lg:top-20 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                Your request so far
              </div>
              <div className="text-[11px] text-zinc-500">Tailored to your answers</div>
            </div>
          </div>

          {/* Detected Categories */}
          <div>
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Project Areas
            </div>
            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {(evalRes?.detectedCategories || []).map((c) => c.label).join(' · ') ||
                'Answer Stage 1 to begin'}
            </div>
          </div>

          {/* Live Checklist Sections */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <span>Checklist Sections ({evalRes?.activeModules.length || 2})</span>
              <span className="font-mono tabular-nums">
                {evalRes?.completionPercentage || 0}% done
              </span>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1 py-0.5">
              {(evalRes?.activeModules || []).map((mod) => (
                <button
                  key={mod.code}
                  type="button"
                  onClick={() => {
                    if (mod.code === 'M0') {
                      onOpenDetailedModule('M0');
                      return;
                    }
                    if (!flowGates.canAccessModules && !isReadOnly) {
                      setStageGateMessage(
                        `Finish Preliminary Stages 1–4 to open ${mod.shortTitle}.`
                      );
                      return;
                    }
                    onOpenDetailedModule(mod.code);
                  }}
                  className="sar-glass-option w-full text-left p-2.5 rounded-lg bg-zinc-50/85 dark:bg-zinc-800/70 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1 truncate">
                      {!flowGates.canAccessModules && mod.code !== 'M0' && !isReadOnly && (
                        <Lock className="w-3 h-3 text-zinc-400 shrink-0" />
                      )}
                      <span className="truncate">{mod.shortTitle}</span>
                    </span>
                    <span className="font-mono text-[11px] text-zinc-400 tabular-nums shrink-0">
                      {mod.code !== 'M0' && mod.code !== 'M17'
                        ? `${mod.visibleQuestionCount ?? 0} Qs`
                        : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Contradiction Warnings Preview */}
          {(evalRes?.contradictions.length || 0) > 0 && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Please Double-Check ({evalRes?.contradictions.length})</span>
              </div>
              {evalRes?.contradictions.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 mb-1.5"
                >
                  {c.title}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* SECTION DELEGATION MODAL */}
      {delegateModalMod && (
        <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-6">
            <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white mb-1">
              Delegate Checklist Section
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Assign this technical section to an Infrastructure, Network, or DBA teammate.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Contributor Name</label>
                <input
                  type="text"
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Corporate Email</label>
                <input
                  type="email"
                  value={delegateEmail}
                  onChange={(e) => setDelegateEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Handover Note</label>
                <textarea
                  rows={2}
                  value={delegateNote}
                  onChange={(e) => setDelegateNote(e.target.value)}
                  placeholder="e.g. Please paste the Mumbai DC server IPs and DMZ firewall rules."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDelegateModalMod(null)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDelegation}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
              >
                Save Delegation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
