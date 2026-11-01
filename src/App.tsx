import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Lock,
  Menu,
  Moon,
  RotateCcw,
  Search,
  ShieldCheck,
  Shuffle,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { ApiConfigDialog } from './components/ApiConfigDialog';
import { DetailedModulesView } from './components/DetailedModulesView';
import { CyberNodeUnderline, CyberScrollTrace } from './components/CyberScrollTrace';
import { PreliminaryChecklistView } from './components/PreliminaryChecklistView';
import { RequestBasicsView } from './components/RequestBasicsView';
import { ReviewAndSubmitView } from './components/ReviewAndSubmitView';
import { useLLMConfig } from './hooks/useLlmConfig';
import {
  DEFAULT_DEFINITION_VERSION,
  USER_PERSONAS,
} from './shared/definitions';
import {
  generateExcelWorkbookXML,
  generatePrintableReportHTML,
  sanitizeFilename,
} from './shared/exportGenerator';
import { PROVIDER_MODELS } from './shared/llmConfig';
import { globalPatternLearningStore } from './shared/patternLearningEngine';
import {
  evaluateFlowGates,
  evaluateSAR,
  redactSensitivePatterns,
} from './shared/rulesEngine';
import {
  clearBrowserSessionForRequester,
  computeBrowserSha256,
  fillRandomSampleSessionForRequester,
  loadBrowserSessionForRequester,
  purgeLegacyPersistentStorage,
  saveBrowserSessionForRequester,
} from './shared/seedData';
import {
  AnswerEntry,
  AttachmentSlotState,
  DefinitionVersion,
  ModuleCode,
  RepeaterTablesData,
  RequestBasicsData,
  SARRecord,
  SarAiSummaryResult,
  UserPersona,
} from './shared/types';

type ActiveView =
  | 'basics'
  | 'preliminary'
  | 'modules'
  | 'review';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  tone: 'default' | 'success' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
}

function getFormattedISTTime(): string {
  return (
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date()) + ' IST'
  );
}

export default function App() {
  const [currentPersona] = useState<UserPersona>(USER_PERSONAS[0]);
  const [activeSar, setActiveSar] = useState<SARRecord>(() =>
    loadBrowserSessionForRequester(USER_PERSONAS[0])
  );
  // Open the active screen (defaults to 16-Section Checklist on pre-populated sample SAR)
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (
      activeSar.lastActiveScreen === 'modules' ||
      activeSar.lastActiveScreen === 'preliminary' ||
      activeSar.lastActiveScreen === 'review' ||
      activeSar.lastActiveScreen === 'basics'
    ) {
      return activeSar.lastActiveScreen;
    }
    return 'modules';
  });
  const [activePrelimStage, setActivePrelimStage] = useState<number>(1);
  const [activeModuleCode, setActiveModuleCode] = useState<ModuleCode>('M1');
  const [sampleVariantCounter, setSampleVariantCounter] = useState<number>(0);

  const [activeDefinition] = useState<DefinitionVersion>(
    DEFAULT_DEFINITION_VERSION
  );
  const [definitions] = useState<DefinitionVersion[]>([
    DEFAULT_DEFINITION_VERSION,
  ]);

  const [lastSavedTime, setLastSavedTime] = useState<string>(() => getFormattedISTTime());
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem('sar_theme_mode') === 'dark';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // Modals, Notices & In-App Pop-Up Toasts
  const { config: llmConfig, save: saveLlmConfig, clear: clearLlmConfig } = useLLMConfig();
  const [llmConfigOpen, setLlmConfigOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [scopeChangeNotice, setScopeChangeNotice] = useState<{
    added: ModuleCode[];
    removed: ModuleCode[];
    previousAnswer?: { questionId: string; value: unknown };
  } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const llmProviderLabel = llmConfig
    ? (() => {
        const found = PROVIDER_MODELS.openai.find((m) => m.id === llmConfig.model);
        return found ? `OpenAI · ${found.label}` : 'OpenAI';
      })()
    : null;

  const pushToast = useCallback(
    (
      title: string,
      message: string,
      tone: 'default' | 'success' | 'warning' = 'default',
      actionLabel?: string,
      onAction?: () => void
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [
        ...prev.slice(-2),
        { id, title, message, tone, actionLabel, onAction },
      ]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Toggle dark class on root html and persist preference in sessionStorage
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.sessionStorage.setItem('sar_theme_mode', darkMode ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  // Purge any legacy localStorage keys on mount so only ephemeral sessionStorage is used
  useEffect(() => {
    purgeLegacyPersistentStorage();
  }, []);

  // Global keyboard shortcut Cmd/Ctrl + K for Command Palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Track scroll position for seamless top header borderless blending (RAF throttled for 120fps smoothness)
  useEffect(() => {
    let rafId: number | null = null;
    let lastScrolled = window.scrollY > 8;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const currentScrolled = window.scrollY > 8;
        if (currentScrolled !== lastScrolled) {
          lastScrolled = currentScrolled;
          setIsScrolled(currentScrolled);
        }
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const getPinnedDefinition = useCallback(
    (sar: SARRecord): DefinitionVersion => {
      return (
        definitions.find((d) => d.versionId === sar.pinnedVersionId) || activeDefinition
      );
    },
    [definitions, activeDefinition]
  );

  const activeFlowGates = evaluateFlowGates(activeSar, getPinnedDefinition(activeSar));

  // Persist current requester's progress in browser storage safely and immediately
  const persistSessionSar = useCallback(
    (nextSar: SARRecord, personaOverride?: UserPersona) => {
      const targetPersona = personaOverride || currentPersona;
      setActiveSar(nextSar);
      saveBrowserSessionForRequester(targetPersona, nextSar);
      setLastSavedTime(getFormattedISTTime());
    },
    [currentPersona]
  );

  // Fill realistic sample details in every step & jump to 2-Sheet Excel Review
  const handleFillRandomSample = () => {
    const nextVariant = sampleVariantCounter + 1;
    setSampleVariantCounter(nextVariant);
    const populated = fillRandomSampleSessionForRequester(currentPersona, nextVariant);
    setActiveSar(populated);
    setActivePrelimStage(4);
    setActiveModuleCode('M1');
    setScopeChangeNotice(null);
    setMobileMenuOpen(false);
    setActiveView('review');
    setLastSavedTime(getFormattedISTTime());
    pushToast(
      `All Steps Populated (${populated.displayId})`,
      'Filled Request Basics, Preliminary Discovery, and Security Checklist. Showing 2-Sheet Excel Report.',
      'success'
    );
  };

  // Reset / Clear Current Temporary Browser Session
  const handleResetCurrentSession = () => {
    const fresh = clearBrowserSessionForRequester(currentPersona);
    setActiveSar(fresh);
    setActivePrelimStage(1);
    setActiveModuleCode('M1');
    setScopeChangeNotice(null);
    setMobileMenuOpen(false);
    setActiveView('basics');
    setLastSavedTime(getFormattedISTTime());
    pushToast(
      'Session Reset',
      'Cleared temporary browser progress. Ready for a fresh ServiceNow SAR intake.',
      'success'
    );
  };

  const handleNavigatePhase = (sar: SARRecord, explicitScreen?: string) => {
    setMobileMenuOpen(false);
    const gates = evaluateFlowGates(sar, getPinnedDefinition(sar));

    if (sar.status === 'submitted') {
      setActiveView('review');
      return;
    }

    const targetScreen = explicitScreen || sar.lastActiveScreen || 'basics';

    if (targetScreen === 'review') {
      if (gates.canAccessReview) {
        setActiveView('review');
      } else if (gates.canAccessModules) {
        pushToast(
          'Phase 4 Locked',
          `${gates.missingDetailedQuestions.length} checklist questions remaining before Review & Submit.`,
          'warning'
        );
        setActiveModuleCode(gates.missingDetailedQuestions[0]?.moduleId || 'M1');
        setActiveView('modules');
      } else if (gates.canAccessPreliminary) {
        pushToast(
          'Phase 4 Locked',
          `Complete Preliminary Discovery (${gates.missingPreliminaryCodes.length} remaining) first.`,
          'warning'
        );
        setActivePrelimStage(gates.maxUnlockedStage);
        setActiveView('preliminary');
      } else {
        pushToast(
          'Phase 1 Required',
          `Complete ${gates.missingBasicsFields.length} required fields in Request Basics first.`,
          'warning'
        );
        setActiveView('basics');
      }
      return;
    }

    if (targetScreen === 'modules') {
      if (gates.canAccessModules) {
        setActiveModuleCode(sar.lastActiveModule || 'M1');
        setActiveView('modules');
      } else if (gates.canAccessPreliminary) {
        pushToast(
          'Phase 3 Locked',
          `Complete Preliminary Discovery (${gates.missingPreliminaryCodes.length} remaining) to unlock Checklist.`,
          'warning'
        );
        setActivePrelimStage(gates.maxUnlockedStage);
        setActiveView('preliminary');
      } else {
        pushToast(
          'Phase 1 Required',
          `Complete ${gates.missingBasicsFields.length} required fields in Request Basics first.`,
          'warning'
        );
        setActiveView('basics');
      }
      return;
    }

    if (targetScreen === 'preliminary') {
      if (gates.canAccessPreliminary) {
        const requestedStage = Math.min(sar.lastActiveStage || 1, gates.maxUnlockedStage);
        setActivePrelimStage(requestedStage);
        setActiveView('preliminary');
      } else {
        pushToast(
          'Phase 2 Locked',
          `Complete ${gates.missingBasicsFields.length} required fields in Request Basics first.`,
          'warning'
        );
        setActiveView('basics');
      }
      return;
    }

    setActiveView('basics');
  };

  const handleUpdateBasics = (patch: Partial<RequestBasicsData>) => {
    const nextBasics = { ...activeSar.basics, ...patch };
    const nextSar: SARRecord = {
      ...activeSar,
      basics: nextBasics,
      updatedBy: currentPersona.name,
      updatedAt: new Date().toISOString(),
      lastActiveScreen: 'basics',
    };
    persistSessionSar(nextSar);
  };

  const handleAnswerQuestion = (
    questionId: string,
    value: unknown,
    extra?: { comment?: string; naReason?: string; unknownOwner?: string; unknownNote?: string }
  ) => {
    const def = getPinnedDefinition(activeSar);
    const prevModules = new Set(activeSar.evaluation?.activeModules.map((m) => m.code) || []);
    const previousAnswerVal = activeSar.answers[questionId]?.value;
    const existing = activeSar.answers[questionId];

    const sanitizedValue =
      typeof value === 'string' ? redactSensitivePatterns(value).slice(0, 2000) : value;
    const rawComment = extra?.comment !== undefined ? extra.comment : existing?.comment;
    const sanitizedComment = rawComment
      ? redactSensitivePatterns(rawComment).slice(0, 1000)
      : undefined;
    const sanitizedNaReason = extra?.naReason
      ? redactSensitivePatterns(extra.naReason).slice(0, 600)
      : undefined;
    const sanitizedUnknownOwner = extra?.unknownOwner
      ? redactSensitivePatterns(extra.unknownOwner).slice(0, 120)
      : undefined;
    const sanitizedUnknownNote = extra?.unknownNote
      ? redactSensitivePatterns(extra.unknownNote).slice(0, 600)
      : undefined;

    const now = new Date().toISOString();
    const historyItem = {
      value: sanitizedValue,
      comment: sanitizedComment,
      naReason: sanitizedNaReason,
      unknownOwner: sanitizedUnknownOwner,
      unknownNote: sanitizedUnknownNote,
      updatedBy: currentPersona.name,
      updatedAt: now,
    };

    const nextAnswers: Record<string, AnswerEntry> = {
      ...activeSar.answers,
      [questionId]: {
        questionId,
        value: sanitizedValue,
        state: 'active' as const,
        comment: sanitizedComment,
        naReason: sanitizedNaReason,
        unknownOwner: sanitizedUnknownOwner,
        unknownNote: sanitizedUnknownNote,
        updatedBy: currentPersona.name,
        updatedAt: now,
        history: existing ? [...existing.history.slice(-19), historyItem] : [historyItem],
      },
    };

    // Evaluate once to determine active modules and visible questions, then mark inactive answers
    const firstEval = evaluateSAR(
      nextAnswers,
      activeSar.tables,
      activeSar.manualCategories,
      def
    );
    const activeModSet = new Set(firstEval.activeModules.map((m) => m.code));
    const visibleQSet = new Set(firstEval.visibleQuestionIds);

    for (const [qId, ans] of Object.entries(nextAnswers)) {
      const qDef = def.questions.find((q) => q.id === qId);
      if (!qDef) continue;
      const shouldBeActive =
        qDef.stage !== undefined
          ? visibleQSet.has(qId)
          : activeModSet.has(qDef.moduleId) && visibleQSet.has(qId);
      ans.state = shouldBeActive ? 'active' : 'inactive';
    }

    const nextEvaluation = evaluateSAR(
      nextAnswers,
      activeSar.tables,
      activeSar.manualCategories,
      def
    );
    const nextModules = new Set(nextEvaluation.activeModules.map((m) => m.code));

    const addedMods = Array.from(nextModules).filter((c) => !prevModules.has(c));
    const removedMods = Array.from(prevModules).filter((c) => !nextModules.has(c));

    if (addedMods.length > 0 || removedMods.length > 0) {
      setScopeChangeNotice({
        added: addedMods,
        removed: removedMods,
        previousAnswer: { questionId, value: previousAnswerVal },
      });
      const summaryParts: string[] = [];
      if (addedMods.length > 0) summaryParts.push(`${addedMods.length} section(s) added`);
      if (removedMods.length > 0) {
        summaryParts.push(`${removedMods.length} section(s) removed (answers preserved)`);
      }
      pushToast(
        'Checklist Scope Updated',
        summaryParts.join(' · '),
        'default',
        'Undo',
        () => {
          setScopeChangeNotice(null);
          handleAnswerQuestion(questionId, previousAnswerVal);
        }
      );
    }

    const nextSar: SARRecord = {
      ...activeSar,
      answers: nextAnswers,
      evaluation: nextEvaluation,
      updatedBy: currentPersona.name,
      updatedAt: now,
      lastActiveScreen: activeView,
      lastActiveStage: activePrelimStage,
      lastActiveModule: activeModuleCode,
    };
    persistSessionSar(nextSar);
  };

  const handleUndoScopeChange = () => {
    if (!scopeChangeNotice?.previousAnswer) return;
    const { questionId, value } = scopeChangeNotice.previousAnswer;
    setScopeChangeNotice(null);
    handleAnswerQuestion(questionId, value);
    pushToast('Scope Change Reverted', 'Restored your previous response.', 'default');
  };

  const handleUpdateManualCategories = (manual: {
    added: string[];
    removed: string[];
    fullReviewRequested: boolean;
    reason?: string;
  }) => {
    const def = getPinnedDefinition(activeSar);
    const nextEval = evaluateSAR(activeSar.answers, activeSar.tables, manual, def);
    const nextSar: SARRecord = {
      ...activeSar,
      manualCategories: manual,
      evaluation: nextEval,
      updatedBy: currentPersona.name,
      updatedAt: new Date().toISOString(),
    };
    persistSessionSar(nextSar);
    pushToast(
      'Review Scope Updated',
      manual.fullReviewRequested
        ? 'Full Security Architecture Review (all checklist sections) enabled.'
        : 'Manual category scope overrides applied.',
      'default'
    );
  };

  const handleUpdateTables = (tables: RepeaterTablesData) => {
    const def = getPinnedDefinition(activeSar);
    const nextEval = evaluateSAR(activeSar.answers, tables, activeSar.manualCategories, def);
    const nextSar: SARRecord = {
      ...activeSar,
      tables,
      evaluation: nextEval,
      updatedBy: currentPersona.name,
      updatedAt: new Date().toISOString(),
    };
    persistSessionSar(nextSar);
  };

  const handleUpdateAttachments = (attachments: AttachmentSlotState[]) => {
    const nextSar: SARRecord = {
      ...activeSar,
      attachments,
      updatedBy: currentPersona.name,
      updatedAt: new Date().toISOString(),
    };
    persistSessionSar(nextSar);
    pushToast(
      'Supporting Document Updated',
      'Document uploaded and verified.',
      'success'
    );
  };

  const handleDelegateModule = (
    moduleCode: ModuleCode,
    assigneeName: string,
    assigneeEmail: string,
    note: string
  ) => {
    const modDef = activeDefinition.modules.find((m) => m.code === moduleCode);
    const nextDelegations = {
      ...(activeSar.delegations || {}),
      [moduleCode]: {
        moduleCode,
        assigneeName,
        assigneeEmail,
        assignedBy: currentPersona.name,
        assignedAt: new Date().toISOString(),
        note,
        status: 'pending' as const,
      },
    };
    const nextSar: SARRecord = {
      ...activeSar,
      delegations: nextDelegations,
      updatedAt: new Date().toISOString(),
    };
    persistSessionSar(nextSar);
    pushToast(
      `${modDef?.shortTitle || 'Section'} Delegated`,
      `Assigned to ${assigneeName} (${assigneeEmail}).`,
      'success'
    );
  };

  const handleOverrideContradiction = (warningId: string, justification: string) => {
    const nextOverrides = {
      ...activeSar.contradictionOverrides,
      [warningId]: {
        warningId,
        acknowledgedBy: currentPersona.name,
        acknowledgedAt: new Date().toISOString(),
        justification,
      },
    };
    const nextSar: SARRecord = {
      ...activeSar,
      contradictionOverrides: nextOverrides,
      updatedAt: new Date().toISOString(),
    };
    persistSessionSar(nextSar);
    pushToast(
      'Explanation Recorded',
      `Explanation saved for review.`,
      'success'
    );
  };

  const handleSaveAiSummary = useCallback(
    (aiSummary: SarAiSummaryResult) => {
      setActiveSar((prev) => {
        const nextSar: SARRecord = {
          ...prev,
          aiSummary,
          updatedBy: currentPersona.name,
          updatedAt: new Date().toISOString(),
        };
        saveBrowserSessionForRequester(currentPersona, nextSar);
        return nextSar;
      });
      setLastSavedTime(getFormattedISTTime());
    },
    [currentPersona]
  );

  const handleSubmitSAR = async () => {
    const def = getPinnedDefinition(activeSar);
    const gates = evaluateFlowGates(activeSar, def);
    if (!gates.canSubmit) {
      const msg =
        gates.blockingReasons[0] ||
        'Submission blocked: Please complete all mandatory questions first.';
      pushToast('Submission Blocked', msg, 'warning');
      return;
    }

    const now = new Date().toISOString();
    const sha256 = await computeBrowserSha256(activeSar);
    const activeModuleCodes = activeSar.evaluation?.activeModules.map((m) => m.code) || [
      'M0',
      'M17',
    ];

    const lockedSar: SARRecord = {
      ...activeSar,
      status: 'submitted',
      submittedAt: now,
      submittedBy: currentPersona.name,
      updatedAt: now,
      submissionSha256: sha256,
      lastActiveScreen: 'submitted',
      reports: [
        ...activeSar.reports,
        {
          id: `rep-${Date.now()}`,
          revisionNo: activeSar.revisionNo,
          generatedAt: now,
          generatedBy: currentPersona.name,
          sha256,
          versionId: activeSar.pinnedVersionId,
          summaryText: `Official Revision ${activeSar.revisionNo} Package`,
        },
      ],
      revisionHistory: [
        ...activeSar.revisionHistory,
        {
          revisionNo: activeSar.revisionNo,
          submittedAt: now,
          submittedBy: currentPersona.name,
          sha256,
          basics: JSON.parse(JSON.stringify(activeSar.basics)),
          answers: JSON.parse(JSON.stringify(activeSar.answers)),
          tables: JSON.parse(JSON.stringify(activeSar.tables)),
          activeModuleCodes,
        },
      ],
    };

    persistSessionSar(lockedSar);

    // Synchronously learn the submitted SAR pattern genome (strictly status === 'submitted')
    const localIngestion = globalPatternLearningStore.ingestSubmittedSar(lockedSar, def);
    fetch('/api/patterns/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sar: lockedSar }),
    }).catch(() => {
      // Offline/local fallback already updated via globalPatternLearningStore
    });

    pushToast(
      `${lockedSar.displayId} Submitted & Pattern Learned`,
      `Locked with SHA-256 & indexed into Pattern Corpus (Genome ${localIngestion.genome?.genomeHash.slice(0, 8) || 'verified'}).`,
      'success'
    );
  };

  const handleReopenAsRevision = (reason: string) => {
    const prevRev = activeSar.revisionNo;
    const reopened: SARRecord = {
      ...activeSar,
      revisionNo: prevRev + 1,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      updatedBy: currentPersona.name,
      lastActiveScreen: 'preliminary',
      changeSummaryBanner: `Reopened from Revision ${prevRev}. Reason: "${reason}". Prior Revision ${prevRev} snapshot is preserved for comparison.`,
    };
    persistSessionSar(reopened);
    pushToast(
      `Reopened as Revision ${reopened.revisionNo}`,
      `Previous Revision ${prevRev} snapshot preserved for comparison.`,
      'default'
    );
  };

  const handleExportPDF = (sar: SARRecord) => {
    const def = getPinnedDefinition(sar);
    const html = generatePrintableReportHTML(sar, def);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(
      `${sar.displayId}_Rev${sar.revisionNo}_Security_Architecture_Report.html`
    );
    a.click();
    URL.revokeObjectURL(url);

    pushToast(
      'Archival Report Exported',
      `Downloaded ${sar.displayId} Revision ${sar.revisionNo} printable security report.`,
      'success'
    );
  };

  const handleExportExcel = (sar: SARRecord) => {
    const def = getPinnedDefinition(sar);
    const xml = generateExcelWorkbookXML(sar, def);
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeFilename(
      `${sar.displayId}_Rev${sar.revisionNo}_SAR_2Sheet_Report.xls`
    );
    a.click();
    URL.revokeObjectURL(url);

    pushToast(
      '2-Sheet Excel Workbook Exported',
      `Downloaded ${sar.displayId} Excel report (Sheet 1: Preliminary Questions & Options, Sheet 2: Security Questionnaire).`,
      'success'
    );
  };

  const readinessLabel =
    activeSar.status === 'submitted'
      ? '100% Locked'
      : `${activeSar.evaluation?.completionPercentage || 0}% Ready`;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* TOP NAVIGATION BAR (Streamlined & Clean with Seamless Continuous Checked Pattern) */}
      <header
        className={`sticky top-0 z-40 bg-studio-grid bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md transition-all duration-200 ${
          isScrolled
            ? 'border-b border-zinc-200/80 dark:border-zinc-800 shadow-2xs'
            : 'border-b border-transparent'
        }`}
      >
        <div className="w-full max-w-[1560px] mx-auto flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigatePhase(activeSar, 'basics')}
              className="font-display text-base sm:text-lg font-extrabold tracking-tight text-zinc-950 dark:text-white whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2.5"
            >
              <span
                aria-hidden="true"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-950 text-white border border-zinc-800 dark:border-zinc-700 inline-flex items-center justify-center shadow-xs shrink-0"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5.5 h-5.5 sm:w-6 sm:h-6"
                >
                  <rect
                    x="1.35"
                    y="1.35"
                    width="21.3"
                    height="21.3"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.85"
                  />
                  <rect
                    x="4.4"
                    y="4.4"
                    width="15.2"
                    height="15.2"
                    rx="0.6"
                    stroke="currentColor"
                    strokeWidth="1.45"
                  />
                  <rect x="6.7" y="6.7" width="10.6" height="2.45" rx="0.35" fill="currentColor" />
                  <rect x="6.7" y="10.75" width="7.1" height="2.45" rx="0.35" fill="currentColor" />
                  <rect x="6.7" y="14.8" width="3.45" height="2.45" rx="0.35" fill="currentColor" />
                </svg>
              </span>
              <span>SAR ASSIST</span>
            </button>
          </div>

          {/* Zone 2: Actions & Controls — Configure LLM, Sample & Excel, Reset Blank & Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Configure LLM Button */}
            <button
              type="button"
              onClick={() => setLlmConfigOpen(true)}
              title={llmProviderLabel ?? 'Configure OpenAI LLM API Key (Session Memory Only)'}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer border ${
                llmConfig
                  ? 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 hover:bg-amber-100'
              }`}
            >
              {llmConfig ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="hidden xl:inline">{llmProviderLabel}</span>
                  <span className="xl:hidden">LLM</span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Configure LLM</span>
                  <span className="sm:hidden">LLM</span>
                </>
              )}
            </button>

            {/* Sample & Excel Button */}
            <button
              type="button"
              onClick={handleFillRandomSample}
              title="Populate realistic random details across every step and open the 2-Sheet Excel Report preview"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Sample &amp; Excel</span>
              <span className="xl:hidden">Sample</span>
            </button>

            {/* Reset Blank Button — Always Visible */}
            <button
              type="button"
              onClick={handleResetCurrentSession}
              title="Clear temporary browser progress and start a fresh ServiceNow intake session"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-full shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Blank</span>
            </button>

            {/* Dark / Light Theme Toggle — Always Visible with High Contrast */}
            <button
              type="button"
              aria-label="Toggle dark or light theme"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="inline-flex items-center justify-center p-2 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-amber-300 hover:scale-105 transition-all cursor-pointer shrink-0"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-800" />
              )}
            </button>

            {/* Mobile & Tablet Drawer Menu Toggle (< sm) */}
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="sm:hidden p-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 cursor-pointer shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* RESPONSIVE MOBILE QUICK ACTIONS DRAWER (< sm) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.16 }}
              className="sm:hidden border-t border-zinc-200 dark:border-zinc-800 bg-studio-grid bg-white/95 dark:bg-zinc-900/95 px-4 py-3.5 space-y-3 overflow-hidden"
            >
              {/* Status & Timestamp Row */}
              <div className="flex items-center justify-between text-xs font-mono pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {activeSar.displayId} · {readinessLabel}
                  </span>
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">{lastSavedTime}</span>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setLlmConfigOpen(true);
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border cursor-pointer ${
                    llmConfig
                      ? 'border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>{llmProviderLabel ?? 'Configure LLM'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleFillRandomSample}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-full cursor-pointer"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Sample &amp; Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetCurrentSession}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-zinc-950 dark:bg-white dark:text-zinc-950 rounded-full cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* INTERACTIVE CYBERSECURITY SCROLL TRACE RAIL (Moves 1:1 with page scroll on wide viewports) */}
      <CyberScrollTrace
        activeView={activeView}
        completionPercentage={activeSar.evaluation?.completionPercentage || 0}
      />

      {/* COMPACT ARCHITECTURAL GRID TITLE HEADER WITH VECTOR NODE-TRACE ACCENT */}
      <div className="relative bg-studio-grid bg-white/90 dark:bg-zinc-950/90 border-b border-zinc-200/80 dark:border-zinc-800 py-3.5 sm:py-4 px-4 sm:px-6 text-center overflow-hidden">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="font-display text-lg sm:text-2xl font-extrabold tracking-tight leading-tight">
            <span className="block text-zinc-950 dark:text-white">Security Review Checklist</span>
            <span className="block text-zinc-400 dark:text-zinc-500">in minutes.</span>
          </h1>
          <CyberNodeUnderline className="mt-1" />
        </div>
      </div>

      {/* STRICTLY 1-ROW 4-PHASE INTAKE STEPPER DOCK (SAR Unique ID + 4 Phases in 1 Line) */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-4 pb-1">
        <div className="sar-glass-card rounded-full border border-zinc-200/90 dark:border-zinc-800 px-3 sm:px-4 py-2 flex flex-nowrap items-center justify-between gap-2 overflow-x-auto no-scrollbar text-xs">
          {/* SAR Unique ID on the same single line */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 tabular-nums whitespace-nowrap shrink-0">
              {activeSar.displayId}
            </span>
            <span
              aria-hidden="true"
              className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0"
            />
          </div>

          {/* 4-Step Tamperproof Intake Stepper on the same single line */}
          <div className="flex flex-nowrap items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveView('basics');
              }}
              className={`sar-glass-step-btn inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'basics'
                  ? 'sar-active border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-2xs'
                  : 'border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80'
              }`}
            >
              {activeFlowGates.basicsComplete && (
                <Check
                  className={`w-3 h-3 shrink-0 ${
                    activeView === 'basics'
                      ? 'text-white dark:text-zinc-950'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
              )}
              <span className="hidden sm:inline">1. Request Basics</span>
              <span className="sm:hidden">1. Basics</span>
            </button>

            <span className="text-zinc-300 dark:text-zinc-700 shrink-0">→</span>

            <button
              type="button"
              onClick={() => {
                if (!activeFlowGates.canAccessPreliminary) {
                  pushToast(
                    'Phase 2 Locked',
                    `Complete the ${activeFlowGates.missingBasicsFields.length} required fields in Request Basics first.`,
                    'warning'
                  );
                  setActiveView('basics');
                  return;
                }
                setActivePrelimStage(
                  Math.min(
                    activePrelimStage <= 6 ? activePrelimStage : 1,
                    activeFlowGates.maxUnlockedStage
                  )
                );
                setActiveView('preliminary');
              }}
              className={`sar-glass-step-btn inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'preliminary'
                  ? 'sar-active border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-2xs'
                  : activeFlowGates.canAccessPreliminary
                  ? 'border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80'
                  : 'border-transparent text-zinc-400 dark:text-zinc-600'
              }`}
            >
              {!activeFlowGates.canAccessPreliminary ? (
                <Lock className="w-3 h-3 shrink-0" />
              ) : activeFlowGates.preliminaryComplete ? (
                <Check
                  className={`w-3 h-3 shrink-0 ${
                    activeView === 'preliminary'
                      ? 'text-white dark:text-zinc-950'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
              ) : null}
              <span className="hidden md:inline">2. Preliminary Discovery</span>
              <span className="md:hidden">2. Preliminary</span>
            </button>

            <span className="text-zinc-300 dark:text-zinc-700 shrink-0">→</span>

            <button
              type="button"
              onClick={() => {
                if (!activeFlowGates.canAccessModules) {
                  if (!activeFlowGates.canAccessPreliminary) {
                    pushToast(
                      'Phase 3 Locked',
                      'Complete Phase 1 Request Basics first.',
                      'warning'
                    );
                    setActiveView('basics');
                  } else {
                    pushToast(
                      'Phase 3 Locked',
                      `Complete Preliminary Discovery (${activeFlowGates.missingPreliminaryCodes.length} remaining) to unlock Checklist.`,
                      'warning'
                    );
                    setActivePrelimStage(activeFlowGates.maxUnlockedStage);
                    setActiveView('preliminary');
                  }
                  return;
                }
                setActiveView('modules');
              }}
              className={`sar-glass-step-btn inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'modules'
                  ? 'sar-active border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-2xs'
                  : activeFlowGates.canAccessModules
                  ? 'border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80'
                  : 'border-transparent text-zinc-400 dark:text-zinc-600'
              }`}
            >
              {!activeFlowGates.canAccessModules ? (
                <Lock className="w-3 h-3 shrink-0" />
              ) : activeFlowGates.modulesComplete ? (
                <Check
                  className={`w-3 h-3 shrink-0 ${
                    activeView === 'modules'
                      ? 'text-white dark:text-zinc-950'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
              ) : null}
              <span className="hidden md:inline">
                3. Checklist ({activeSar.evaluation?.activeModules.filter((m) => m.code !== 'M0').length || 0} Sections)
              </span>
              <span className="md:hidden">
                3. Checklist
              </span>
            </button>

            <span className="text-zinc-300 dark:text-zinc-700 shrink-0">→</span>

            <button
              type="button"
              onClick={() => {
                if (!activeFlowGates.canAccessReview) {
                  if (!activeFlowGates.canAccessPreliminary) {
                    pushToast(
                      'Phase 4 Locked',
                      'Complete Phase 1 Request Basics first.',
                      'warning'
                    );
                    setActiveView('basics');
                  } else if (!activeFlowGates.canAccessModules) {
                    pushToast(
                      'Phase 4 Locked',
                      `Complete Preliminary Discovery (${activeFlowGates.missingPreliminaryCodes.length} remaining) first.`,
                      'warning'
                    );
                    setActivePrelimStage(activeFlowGates.maxUnlockedStage);
                    setActiveView('preliminary');
                  } else {
                    pushToast(
                      'Phase 4 Locked',
                      `Answer remaining ${activeFlowGates.missingDetailedQuestions.length} checklist questions before Review & Submit.`,
                      'warning'
                    );
                    if (activeFlowGates.missingDetailedQuestions[0]) {
                      setActiveModuleCode(activeFlowGates.missingDetailedQuestions[0].moduleId);
                    }
                    setActiveView('modules');
                  }
                  return;
                }
                setActiveView('review');
              }}
              className={`sar-glass-step-btn inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'review'
                  ? 'sar-active border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-2xs'
                  : activeFlowGates.canAccessReview
                  ? 'border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80'
                  : 'border-transparent text-zinc-400 dark:text-zinc-600'
              }`}
            >
              {!activeFlowGates.canAccessReview ? (
                <Lock className="w-3 h-3 shrink-0" />
              ) : activeFlowGates.canSubmit || activeSar.status === 'submitted' ? (
                <Check
                  className={`w-3 h-3 shrink-0 ${
                    activeView === 'review'
                      ? 'text-white dark:text-zinc-950'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
              ) : null}
              <span>
                4. {activeSar.status === 'submitted' ? 'Submitted Record' : 'Review & Submit'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT WITH SUBTLE COMPOSITOR ANIMATION */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
            style={{ willChange: 'opacity, transform' }}
          >
            {activeView === 'basics' && (
              <RequestBasicsView
                sar={activeSar}
                allSars={[activeSar]}
                onUpdateBasics={handleUpdateBasics}
                onContinueToPreliminary={() => {
                  setActivePrelimStage(1);
                  setActiveView('preliminary');
                  pushToast(
                    'Phase 2 Unlocked',
                    'Request Basics complete. Starting Stage 1 of the Preliminary Checklist.',
                    'success'
                  );
                }}
                onOpenExistingSAR={() => {}}
              />
            )}

            {activeView === 'preliminary' && (
              <PreliminaryChecklistView
                sar={activeSar}
                definition={getPinnedDefinition(activeSar)}
                activeStage={activePrelimStage}
                onChangeStage={(st) => setActivePrelimStage(st)}
                onAnswerQuestion={handleAnswerQuestion}
                onUpdateManualCategories={handleUpdateManualCategories}
                onOpenDetailedModule={(mCode) => {
                  if (mCode === 'M0') {
                    setActiveView('basics');
                  } else {
                    setActiveModuleCode(mCode);
                    setActiveView('modules');
                    pushToast(
                      'Security Checklist Ready',
                      'Opened your tailored security checklist sections.',
                      'success'
                    );
                  }
                }}
                onDelegateModule={handleDelegateModule}
                scopeChangeNotice={scopeChangeNotice}
                onUndoScopeChange={handleUndoScopeChange}
                onDismissScopeNotice={() => setScopeChangeNotice(null)}
              />
            )}

            {activeView === 'modules' && (
              <DetailedModulesView
                sar={activeSar}
                definition={getPinnedDefinition(activeSar)}
                currentPersona={currentPersona}
                activeModule={activeModuleCode}
                onSelectModule={(mCode) => {
                  if (mCode === 'M0') {
                    setActiveView('basics');
                  } else {
                    setActiveModuleCode(mCode);
                  }
                }}
                onAnswerQuestion={handleAnswerQuestion}
                onUpdateTables={handleUpdateTables}
                onUpdateAttachments={handleUpdateAttachments}
                onBackToPreliminary={() => {
                  setActivePrelimStage(4);
                  setActiveView('preliminary');
                }}
                onProceedToReview={() => {
                  setActiveView('review');
                  pushToast(
                    'Phase 4 Review & Submit Ready',
                    'All mandatory checklist questions are complete.',
                    'success'
                  );
                }}
              />
            )}

            {activeView === 'review' && (
              <ReviewAndSubmitView
                sar={activeSar}
                definition={getPinnedDefinition(activeSar)}
                currentPersona={currentPersona}
                llmConfig={llmConfig}
                onOpenLlmConfig={() => setLlmConfigOpen(true)}
                onSaveAiSummary={handleSaveAiSummary}
                onNotify={pushToast}
                onJumpToBasics={() => setActiveView('basics')}
                onJumpToPreliminary={(stage) => {
                  setActivePrelimStage(stage);
                  setActiveView('preliminary');
                }}
                onJumpToModule={(mCode) => {
                  setActiveModuleCode(mCode);
                  setActiveView('modules');
                }}
                onOverrideContradiction={handleOverrideContradiction}
                onSubmitSAR={handleSubmitSAR}
                onReopenAsRevision={handleReopenAsRevision}
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
                onFillRandomSample={handleFillRandomSample}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* OPENAI API CONFIGURATION MODAL (Session-Memory-Only Key Storage · GPT-5.5) */}
      <ApiConfigDialog
        open={llmConfigOpen}
        onOpenChange={setLlmConfigOpen}
        current={llmConfig}
        onSave={saveLlmConfig}
        onClear={clearLlmConfig}
        onNotify={pushToast}
      />

      {/* SINGLE-LINE FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 mt-12">
        <div className="max-w-[1360px] mx-auto text-center text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Built by Security Engineer&apos;s of ISG
        </div>
      </footer>

      {/* IN-APP POP-UP TOAST NOTIFICATIONS (Bottom-Right Animated Stack) */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-full pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto rounded-xl border border-zinc-800 dark:border-zinc-700 bg-zinc-900/95 dark:bg-zinc-900 text-zinc-100 p-3.5 shadow-xl backdrop-blur-xs flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {toast.tone === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : toast.tone === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <Bell className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="font-display text-xs font-bold text-white">{toast.title}</div>
                  <div className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                    {toast.message}
                  </div>
                  {toast.actionLabel && toast.onAction && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.onAction?.();
                        dismissToast(toast.id);
                      }}
                      className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-[11px] font-semibold text-white cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{toast.actionLabel}</span>
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-zinc-400 hover:text-white p-0.5 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* COMMAND PALETTE (Ctrl / Cmd + K) */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-20 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -8 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-xl w-full p-4 shadow-2xl"
            >
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-800">
                <Search className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={cmdQuery}
                  onChange={(e) => setCmdQuery(e.target.value)}
                  placeholder="Jump to phase, discovery stage, or checklist section..."
                  className="w-full text-sm bg-transparent focus:outline-none text-zinc-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-3 text-xs">
                <div>
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase px-2 mb-1">
                    Active Intake Actions &amp; Views
                  </div>
                  {[
                    {
                      label: 'Jump to Phase 1: Request Basics',
                      action: () => setActiveView('basics'),
                    },
                    {
                      label: 'Jump to Phase 2: Preliminary Discovery',
                      action: () => handleNavigatePhase(activeSar, 'preliminary'),
                    },
                    {
                      label: 'Jump to Phase 3: Checklist',
                      action: () => handleNavigatePhase(activeSar, 'modules'),
                    },
                    {
                      label: 'Jump to Phase 4: Review & Submit Screen',
                      action: () => handleNavigatePhase(activeSar, 'review'),
                    },
                    {
                      label: 'Download PDF Report',
                      action: () => handleExportPDF(activeSar),
                    },
                    {
                      label: 'Download 2-Sheet Excel (.xls)',
                      action: () => handleExportExcel(activeSar),
                    },
                    {
                      label: 'Reset Temporary Browser Session',
                      action: () => handleResetCurrentSession(),
                    },
                  ]
                    .filter((item) => item.label.toLowerCase().includes(cmdQuery.toLowerCase()))
                    .map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          item.action();
                          setCommandPaletteOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-between cursor-pointer"
                      >
                        <span>{item.label}</span>
                        <span className="font-mono text-[10px] text-zinc-400">Run →</span>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
