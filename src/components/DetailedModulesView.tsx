import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck,
  FileWarning,
  Info,
  Lock,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import { evaluateFlowGates } from '../shared/rulesEngine';
import {
  AttachmentFile,
  AttachmentSlotState,
  DefinitionVersion,
  ModuleCode,
  QuestionDefinition,
  RepeaterTablesData,
  SARRecord,
  UserPersona,
} from '../shared/types';
import { RepeaterTableEditors } from './RepeaterTableEditors';

interface DetailedModulesViewProps {
  sar: SARRecord;
  definition: DefinitionVersion;
  currentPersona: UserPersona;
  activeModule: ModuleCode;
  onSelectModule: (code: ModuleCode) => void;
  onAnswerQuestion: (
    questionId: string,
    value: unknown,
    extra?: { naReason?: string; unknownOwner?: string; unknownNote?: string; comment?: string }
  ) => void;
  onUpdateTables: (tables: RepeaterTablesData) => void;
  onUpdateAttachments: (attachments: AttachmentSlotState[]) => void;
  onBackToPreliminary: () => void;
  onProceedToReview: () => void;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.vsdx', '.drawio', '.xml'];
const DANGEROUS_DOUBLE_EXT_REGEX =
  /\.(exe|dll|bat|cmd|sh|ps1|vbs|js|mjs|cjs|jsp|php|py|rb|pl|jar|msi|scr|com|pif|hta|svg|html|htm|xhtml|swf)\./i;

async function verifyMagicBytesAndHash(file: File): Promise<{
  sha256: string;
  magicBytesStatus: 'verified' | 'mismatch_quarantined';
}> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 16));
  const lowerName = file.name.toLowerCase();

  // Block executables (PE 'MZ' 0x4D 0x5A, ELF 0x7F 'E' 'L' 'F', Mach-O, shell scripts '#!')
  const isExeOrScript =
    (bytes[0] === 0x4d && bytes[1] === 0x5a) ||
    (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) ||
    (bytes[0] === 0x23 && bytes[1] === 0x21);

  let magicMismatch =
    isExeOrScript ||
    DANGEROUS_DOUBLE_EXT_REGEX.test(lowerName) ||
    lowerName.includes('malware') ||
    lowerName.includes('renamed_exe');

  // Positive magic-byte verification per file extension
  if (!magicMismatch && bytes.length >= 4) {
    if (lowerName.endsWith('.pdf')) {
      // Must begin with %PDF (0x25 0x50 0x44 0x46)
      if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
        magicMismatch = true;
      }
    } else if (lowerName.endsWith('.png')) {
      // Must begin with PNG signature 0x89 0x50 0x4E 0x47
      if (!(bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)) {
        magicMismatch = true;
      }
    } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      // Must begin with JPEG SOI 0xFF 0xD8 0xFF
      if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) {
        magicMismatch = true;
      }
    } else if (
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.xlsx') ||
      lowerName.endsWith('.vsdx')
    ) {
      // OOXML ZIP container must start with PK\x03\x04 (0x50 0x4B 0x03 0x04)
      if (!(bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04)) {
        magicMismatch = true;
      }
    } else if (lowerName.endsWith('.drawio') || lowerName.endsWith('.xml')) {
      // OWASP A05/A03 XXE & XSS check on XML/draw.io files
      const sampleText = new TextDecoder('utf-8', { fatal: false }).decode(
        buffer.slice(0, Math.min(buffer.byteLength, 65536))
      );
      if (
        /<!ENTITY\b|<!DOCTYPE\b|<\s*script\b|javascript\s*:/i.test(sampleText)
      ) {
        magicMismatch = true;
      }
    }
  }

  let sha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  try {
    if (window.crypto?.subtle) {
      const hashBuf = await window.crypto.subtle.digest('SHA-256', buffer);
      sha256 = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback deterministic hash
  }

  return {
    sha256,
    magicBytesStatus: magicMismatch ? 'mismatch_quarantined' : 'verified',
  };
}

export const DetailedModulesView: React.FC<DetailedModulesViewProps> = ({
  sar,
  definition,
  currentPersona,
  activeModule,
  onSelectModule,
  onAnswerQuestion,
  onUpdateTables,
  onUpdateAttachments,
  onBackToPreliminary,
  onProceedToReview,
}) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'mandatory' | 'unanswered'>('all');
  const [moduleGateError, setModuleGateError] = useState<string | null>(null);
  const [activeHelpQId, setActiveHelpQId] = useState<string | null>(null);

  const evalRes = sar.evaluation;
  const activeModules = evalRes?.activeModules || [];
  const isReadOnly = sar.status === 'submitted';
  const flowGates = useMemo(() => evaluateFlowGates(sar, definition), [sar, definition]);

  const checklistModules = useMemo(
    () => activeModules.filter((m) => m.code !== 'M0'),
    [activeModules]
  );
  const currentModInfo =
    checklistModules.find((m) => m.code === activeModule) ||
    checklistModules[0];

  // Smooth scroll to top and reset transient popovers when switching modules
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveHelpQId(null);
    setModuleGateError(null);
  }, [currentModInfo?.code]);

  const scrollToMissingQuestion = (questionId: string) => {
    window.setTimeout(() => {
      const el =
        document.getElementById(`question-${questionId}`) ||
        document.querySelector(`[data-question-code="${questionId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const tryProceedToReview = () => {
    if (!flowGates.modulesComplete && !isReadOnly) {
      const firstMissing = flowGates.missingDetailedQuestions[0];
      setModuleGateError(
        `${flowGates.missingDetailedQuestions.length} required checklist question(s) remaining before Review & Submit.`
      );
      setTimeout(() => setModuleGateError(null), 3500);
      if (firstMissing) {
        if (firstMissing.moduleId !== currentModInfo?.code) {
          onSelectModule(firstMissing.moduleId);
        }
        scrollToMissingQuestion(firstMissing.code);
      }
      return;
    }
    setModuleGateError(null);
    onProceedToReview();
  };

  const visibleQIds = useMemo(() => new Set(evalRes?.visibleQuestionIds || []), [evalRes?.visibleQuestionIds]);
  const requiredQIds = useMemo(() => new Set(evalRes?.requiredQuestionIds || []), [evalRes?.requiredQuestionIds]);
  const hardRequiredQIds = useMemo(() => new Set(evalRes?.hardRequiredQuestionIds || []), [evalRes?.hardRequiredQuestionIds]);

  const currentModDef = definition.modules.find((m) => m.code === currentModInfo?.code);
  const allModuleQuestions = useMemo(
    () =>
      definition.questions.filter(
        (q) => q.stage === undefined && q.moduleId === currentModInfo?.code
      ),
    [definition.questions, currentModInfo?.code]
  );
  const visibleModuleQuestions = useMemo(
    () => allModuleQuestions.filter((q) => visibleQIds.has(q.id)),
    [allModuleQuestions, visibleQIds]
  );
  const moduleQuestions = useMemo(
    () =>
      visibleModuleQuestions.filter((q) => {
        if (questionFilter === 'mandatory') {
          return requiredQIds.has(q.id) || hardRequiredQIds.has(q.id);
        }
        if (questionFilter === 'unanswered') {
          const v = sar.answers[q.id]?.value;
          return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
        }
        return true;
      }),
    [visibleModuleQuestions, questionFilter, requiredQIds, hardRequiredQIds, sar.answers]
  );

  // Filter options dynamically by hosting topology (On-Prem vs Cloud vs Hybrid) while preserving any active selection
  const filterOptionsByHosting = (q: QuestionDefinition) => {
    if (!q.options) return [];
    const onPrem = Boolean(evalRes?.flags.on_prem_hosted);
    const cloud = Boolean(evalRes?.flags.cloud_hosted);
    if (!onPrem && !cloud) return q.options;

    const currentRaw = sar.answers[q.id]?.value;
    const selectedSet = new Set(
      Array.isArray(currentRaw)
        ? currentRaw.map(String)
        : currentRaw !== undefined && currentRaw !== null && currentRaw !== ''
        ? [String(currentRaw)]
        : []
    );

    const filtered = q.options.filter((opt) => {
      if (!opt.hostingFilter || opt.hostingFilter.length === 0) return true;
      if (selectedSet.has(opt.id)) return true;
      if (onPrem && opt.hostingFilter.includes('on_prem')) return true;
      if (cloud && opt.hostingFilter.includes('cloud')) return true;
      if ((cloud || Boolean(evalRes?.flags.vendor_involved)) && opt.hostingFilter.includes('saas')) return true;
      return false;
    });

    return filtered.length > 0 ? filtered : q.options;
  };

  const handleFileUpload = async (
    slotId: AttachmentSlotState['slotId'],
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    const isAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!isAllowedExt || DANGEROUS_DOUBLE_EXT_REGEX.test(lower)) {
      setUploadError(
        `Blocked file "${file.name}". Allowed types: PDF, PNG, JPG, DOCX, XLSX, VSDX, draw.io (double extensions prohibited).`
      );
      e.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25 MB maximum upload size limit.');
      e.target.value = '';
      return;
    }

    const { sha256, magicBytesStatus } = await verifyMagicBytesAndHash(file);
    const nextAttachments = sar.attachments.map((slot) => {
      if (slot.slotId !== slotId) return slot;
      const nextVersion = slot.files.length + 1;
      const newFile: AttachmentFile = {
        id: `att-${Date.now()}`,
        slotId,
        filename: file.name.slice(0, 120),
        sanitizedName: file.name
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .replace(/\.{2,}/g, '_')
          .slice(0, 100),
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        sha256,
        magicBytesStatus,
        scanStatus: magicBytesStatus === 'mismatch_quarantined' ? 'quarantined' : 'clean',
        version: nextVersion,
        uploadedBy: currentPersona.name,
        uploadedAt: new Date().toISOString(),
      };
      return {
        ...slot,
        files: [newFile, ...slot.files],
      };
    });

    onUpdateAttachments(nextAttachments);
    e.target.value = '';
  };

  const handleSimulateQuarantinedFile = (slotId: AttachmentSlotState['slotId']) => {
    const nextAttachments = sar.attachments.map((slot) => {
      if (slot.slotId !== slotId) return slot;
      const newFile: AttachmentFile = {
        id: `att-quar-${Date.now()}`,
        slotId,
        filename: 'renamed_exe_payload.pdf',
        sanitizedName: 'renamed_exe_payload.pdf',
        mimeType: 'application/x-msdownload',
        sizeBytes: 412800,
        sha256: 'deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb',
        magicBytesStatus: 'mismatch_quarantined',
        scanStatus: 'quarantined',
        version: slot.files.length + 1,
        uploadedBy: currentPersona.name,
        uploadedAt: new Date().toISOString(),
      };
      return { ...slot, files: [newFile, ...slot.files] };
    });
    onUpdateAttachments(nextAttachments);
  };

  const modIndex = checklistModules.findIndex((m) => m.code === currentModInfo?.code);
  const prevMod = modIndex > 0 ? checklistModules[modIndex - 1] : null;
  const nextMod = modIndex < checklistModules.length - 1 ? checklistModules[modIndex + 1] : null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-5">
      {/* MOBILE & TABLET HORIZONTAL MODULE STRIP (< lg) */}
      <div className="lg:hidden mb-4">
        <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 shadow-2xs">
          <div className="flex items-center justify-between px-1 mb-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={onBackToPreliminary}
              className="font-semibold text-zinc-900 dark:text-zinc-200 hover:underline cursor-pointer"
            >
              ← Preliminary Discovery
            </button>
            <span>Checklist Sections ({checklistModules.length})</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {checklistModules.map((mod) => {
              const qs = definition.questions.filter(
                (q) => q.stage === undefined && q.moduleId === mod.code && visibleQIds.has(q.id)
              );
              const answered = qs.filter((q) => {
                const v = sar.answers[q.id]?.value;
                return (
                  v !== undefined &&
                  v !== null &&
                  v !== '' &&
                  !(Array.isArray(v) && v.length === 0)
                );
              }).length;
              const isComplete =
                mod.code === 'M17'
                  ? sar.attachments.some((s) => s.files.length > 0)
                  : qs.length > 0 && answered === qs.length;
              const isSelected = currentModInfo?.code === mod.code;

              return (
                <button
                  key={mod.code}
                  type="button"
                  onClick={() => onSelectModule(mod.code)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-2xs'
                      : 'bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {isComplete && (
                    <Check
                      className={`w-3 h-3 shrink-0 ${
                        isSelected ? 'text-white dark:text-zinc-900' : 'text-emerald-600'
                      }`}
                    />
                  )}
                  <span>{mod.shortTitle}</span>
                  {mod.code !== 'M17' && (
                    <span className="font-mono text-[10px] opacity-75">
                      ({answered}/{qs.length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div id="sec-mod-origin" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT NAVIGATION RAIL: Unlocked Modules (Desktop lg+) */}
        <aside className="hidden lg:block lg:col-span-3 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 lg:sticky lg:top-20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between px-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Checklist Sections ({checklistModules.length})
            </span>
            <button
              type="button"
              onClick={onBackToPreliminary}
              className="text-[11px] font-semibold text-zinc-950 dark:text-zinc-200 hover:underline cursor-pointer"
            >
              ← Discovery
            </button>
          </div>

          <nav className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
            {checklistModules.map((mod) => {
              const qs = definition.questions.filter(
                (q) => q.stage === undefined && q.moduleId === mod.code && visibleQIds.has(q.id)
              );
              const answered = qs.filter((q) => {
                const v = sar.answers[q.id]?.value;
                return (
                  v !== undefined &&
                  v !== null &&
                  v !== '' &&
                  !(Array.isArray(v) && v.length === 0)
                );
              }).length;
              const isComplete =
                mod.code === 'M17'
                  ? sar.attachments.some((s) => s.files.length > 0)
                  : qs.length > 0 && answered === qs.length;
              const isSelected = currentModInfo?.code === mod.code;

              return (
                <button
                  key={mod.code}
                  type="button"
                  onClick={() => onSelectModule(mod.code)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 font-semibold shadow-xs'
                      : 'border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 hover:border-zinc-200 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">
                      {mod.shortTitle}
                    </div>
                    {sar.delegations?.[mod.code] && (
                      <div
                        className={`text-[10px] truncate ${
                          isSelected
                            ? 'text-emerald-300 dark:text-emerald-700'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        Delegated: {sar.delegations[mod.code].assigneeName}
                      </div>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[11px] shrink-0 tabular-nums px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/15 text-white dark:bg-zinc-900/15 dark:text-zinc-900 font-semibold'
                        : isComplete
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 font-semibold'
                        : 'text-zinc-400'
                    }`}
                  >
                    {mod.code === 'M17'
                      ? isComplete
                        ? 'Done'
                        : 'Open'
                      : `${answered}/${qs.length}`}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
            <button
              type="button"
              onClick={tryProceedToReview}
              className={`w-full py-2.5 px-3.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                flowGates.modulesComplete || isReadOnly
                  ? 'bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {!flowGates.modulesComplete && !isReadOnly && <Lock className="w-3.5 h-3.5" />}
              <span>Review &amp; Submit SAR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* MAIN MODULE WORKSPACE */}
        <main className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentModInfo?.code || 'M1'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
              style={{ willChange: 'opacity, transform' }}
              className="space-y-6"
            >
          {moduleGateError && (
            <div className="px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{moduleGateError}</span>
              </div>
              <button
                type="button"
                onClick={() => setModuleGateError(null)}
                className="p-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Module Header */}
          <div id="sec-mod-controls" className="p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[11px] font-semibold">
                Section {modIndex + 1} of {checklistModules.length}
              </span>
              {!flowGates.modulesComplete && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    const nextMissing = flowGates.missingDetailedQuestions[0];
                    if (nextMissing) {
                      if (nextMissing.moduleId !== currentModInfo?.code) {
                        onSelectModule(nextMissing.moduleId);
                      }
                      setQuestionFilter('all');
                      scrollToMissingQuestion(nextMissing.code);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>
                    Next Required Control ({flowGates.missingDetailedQuestions.length} left):{' '}
                    {definition.modules.find((m) => m.code === flowGates.missingDetailedQuestions[0]?.moduleId)?.shortTitle || 'Checklist'}
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold text-zinc-950 dark:text-white tracking-tight">
              {currentModInfo?.title}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {currentModDef?.description}
            </p>
          </div>

          {/* MODULE M17: SUPPORTING DOCUMENTS & ATTACHMENTS */}
          {currentModInfo?.code === 'M17' ? (
            <div className="space-y-4">
              {uploadError && (
                <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {sar.attachments.map((slot) => (
                  <div
                    key={slot.slotId}
                    className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-display font-bold text-base text-zinc-950 dark:text-white">
                          {slot.title}
                        </h3>
                        <span className="font-mono text-xs text-zinc-400">
                          {slot.files.length} version(s)
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                        {slot.description}
                      </p>

                      {/* Uploaded file version list */}
                      {slot.files.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {slot.files.map((f) => (
                            <div
                              key={f.id}
                              className={`p-3 rounded-xl border text-xs ${
                                f.scanStatus === 'quarantined'
                                  ? 'border-rose-300 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 font-semibold">
                                <span className="truncate">{f.sanitizedName}</span>
                                <span className="font-mono text-[11px] shrink-0">v{f.version}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                                <span>{(f.sizeBytes / 1024).toFixed(1)} KB</span>
                                <span>·</span>
                                {f.scanStatus === 'quarantined' ? (
                                  <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                                    <FileWarning className="w-3.5 h-3.5" />
                                    <span>Blocked File Format</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                                    <FileCheck className="w-3.5 h-3.5" />
                                    <span>Verified</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isReadOnly && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          <span>
                            {slot.files.length > 0 ? 'Upload New Version' : 'Upload Document'}
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.vsdx,.drawio,.xml"
                            onChange={(e) => handleFileUpload(slot.slotId, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* DETAILED MODULE QUESTIONS (M1–M16) */
            <div className="space-y-6">
              {/* Question Filter Toolbar */}
              {visibleModuleQuestions.length > 0 && (
                <div className="p-3.5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3 text-xs shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="text-zinc-600 dark:text-zinc-300 font-mono">
                    Showing <strong>{moduleQuestions.length}</strong> of{' '}
                    <strong>{visibleModuleQuestions.length}</strong> question(s) in {currentModInfo?.title}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: `All (${visibleModuleQuestions.length})` },
                        {
                          id: 'mandatory',
                          label: `Mandatory (${
                            visibleModuleQuestions.filter(
                              (q) => requiredQIds.has(q.id) || hardRequiredQIds.has(q.id)
                            ).length
                          })`,
                        },
                        {
                          id: 'unanswered',
                          label: `Unanswered (${
                            visibleModuleQuestions.filter((q) => {
                              const v = sar.answers[q.id]?.value;
                              return (
                                v === undefined ||
                                v === null ||
                                v === '' ||
                                (Array.isArray(v) && v.length === 0)
                              );
                            }).length
                          })`,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setQuestionFilter(tab.id)}
                        className={`px-3 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                          questionFilter === tab.id
                            ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {moduleQuestions.length === 0 && visibleModuleQuestions.length > 0 && (
                <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-sm text-zinc-950 dark:text-white">
                      {questionFilter === 'unanswered'
                        ? `All ${visibleModuleQuestions.length} question(s) in ${currentModInfo?.shortTitle} are answered!`
                        : `No matching questions for "${questionFilter}" filter in this section.`}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Switch back to All Questions to review or edit your responses, or continue to the next section.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setQuestionFilter('all')}
                      className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                    >
                      Show All Questions ({visibleModuleQuestions.length})
                    </button>
                    {nextMod && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionFilter('all');
                          onSelectModule(nextMod.code);
                        }}
                        className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:border-zinc-950 cursor-pointer"
                      >
                        <span>Next: {nextMod.shortTitle}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {moduleQuestions.map((q, qIdx) => {
                const ans = sar.answers[q.id];
                const rawVal = ans?.value;
                const filteredOptions = filterOptionsByHosting(q);
                const isHardReq = hardRequiredQIds.has(q.id);
                const isReq = requiredQIds.has(q.id);
                const isHelpOpen = activeHelpQId === q.id;

                return (
                  <div
                    key={q.id}
                    id={`question-${q.id}`}
                    data-question-code={q.code}
                    className="sar-glass-card p-5 sm:p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-[11px] font-bold">
                          {q.code} · Question {qIdx + 1}
                        </span>
                        <span>
                          {q.answerType === 'multi_select'
                            ? 'Select all that apply'
                            : q.answerType === 'long_text'
                            ? 'Free-text response'
                            : 'Select one option'}
                        </span>
                      </div>
                      {Boolean(
                        typeof rawVal === 'string'
                          ? rawVal.trim().length > 0
                          : Array.isArray(rawVal) && rawVal.length > 0
                      ) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                          <Check className="w-3 h-3" />
                          <span>Recorded</span>
                        </span>
                      )}
                    </div>

                    {/* Question Title + Red Asterisk + Floating Small Info Icon Tooltip */}
                    <div className="flex items-start justify-between gap-3 mb-2 relative">
                      <div className="space-y-1">
                        <h2 className="font-display text-base sm:text-lg font-bold text-zinc-950 dark:text-white leading-snug">
                          {q.text}
                          {(isHardReq || isReq) && (
                            <span className="text-red-500 ml-1" aria-label="Required">
                              *
                            </span>
                          )}
                        </h2>
                        {q.hint && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {q.hint}
                          </p>
                        )}
                      </div>

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
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Free-Text Input Box or Option Selector */}
                    {q.answerType === 'long_text' ? (
                      <div className="space-y-2.5 mt-3">
                        <textarea
                          rows={3}
                          disabled={isReadOnly}
                          value={
                            typeof rawVal === 'string'
                              ? q.options?.find((o) => o.id === rawVal)?.label || rawVal
                              : ''
                          }
                          onChange={(e) =>
                            onAnswerQuestion(q.id, e.target.value, { comment: ans?.comment })
                          }
                          placeholder={
                            q.hint ||
                            'Type your response here in plain words...'
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-950 dark:focus:border-zinc-300 transition-colors leading-relaxed"
                        />

                        {!isReadOnly && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mr-1">
                              Sample answers (click to fill &amp; edit):
                            </span>
                            {(
                              filteredOptions.length > 0
                                ? filteredOptions.map((opt, idx) => ({
                                    label: `Sample ${idx + 1}: ${
                                      opt.label.length > 52
                                        ? opt.label.slice(0, 52).trim() + '…'
                                        : opt.label
                                    }`,
                                    text: opt.label,
                                  }))
                                : (
                                    {
                                      M2_Q3: [
                                        {
                                          label: 'Sample 1: Maker / Checker / Admin Roles',
                                          text: 'User roles are separated into Viewer (read-only), Maker (create/initiate), Checker (approve), and Admin. Roles are assigned via Active Directory / SSO after manager approval, and admin sessions are recorded via CyberArk PAM.',
                                        },
                                        {
                                          label: 'Sample 2: Standard Employee & Admin Roles',
                                          text: 'Standard employees only access their own records, while System Administrators require ticket approval and two-person (Maker-Checker) review for configuration changes.',
                                        },
                                      ],
                                      M3_Q2: [
                                        {
                                          label: 'Sample 1: Web -> App -> Database Flow',
                                          text: '1. User or client connects over HTTPS (TLS 1.2+) to the Web Load Balancer / WAF in the DMZ.\n2. Requests pass through the API Gateway / Reverse Proxy to the Application servers in the private App Zone.\n3. Application servers query the encrypted Database in the isolated Database Zone over restricted firewall ports.',
                                        },
                                        {
                                          label: 'Sample 2: Internal Staff Intranet Flow',
                                          text: '1. Bank employees log in with Bank Single Sign-On (AD + MFA) over the internal corporate network.\n2. The internal Application tier processes requests and stores records in the isolated Database tier.',
                                        },
                                      ],
                                      M5_Q5: [
                                        {
                                          label: 'Sample 1: ISO 8583 / Socket over TLS',
                                          text: 'Custom ISO 8583 / TCP payment messages are wrapped inside an encrypted TLS 1.2+ / IPsec VPN tunnel, restricted to specific partner IPs, and validated for message format and MAC checksums.',
                                        },
                                      ],
                                      M5_Q6: [
                                        {
                                          label: 'Sample 1: Internal Low-Latency mTLS Link',
                                          text: 'Direct internal service-to-service call required for sub-10ms latency; protected by two-way certificates (mTLS), strict firewall IP allowlisting, schema validation, and rate limiting.',
                                        },
                                      ],
                                      M16_Q2: [
                                        {
                                          label: 'Sample 1: Mumbai Primary + Hyderabad DR',
                                          text: 'Primary environment runs in Mumbai (ap-south-1) with Active-Passive Disaster Recovery in Hyderabad (ap-south-2). Automated encrypted backups run daily with Object Lock/Vault Lock, and DR failover drills are tested twice a year.',
                                        },
                                        {
                                          label: 'Sample 2: Data Center HA + Daily Encrypted Backups',
                                          text: 'Deployed across redundant servers in Primary Data Center with real-time database replication to the DR site. Encrypted backups are taken daily and verified during semi-annual DR drills.',
                                        },
                                      ],
                                    }[q.id] || []
                                  )
                            ).map((tpl) => (
                              <button
                                key={tpl.label}
                                type="button"
                                title={tpl.text}
                                onClick={() =>
                                  onAnswerQuestion(q.id, tpl.text, { comment: ans?.comment })
                                }
                                className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-left"
                              >
                                + {tpl.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : q.answerType === 'multi_select' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {filteredOptions.map((opt) => {
                          const selectedArr = Array.isArray(rawVal)
                            ? rawVal.map(String)
                            : typeof rawVal === 'string' && rawVal
                            ? [rawVal]
                            : [];
                          const isSelected = selectedArr.includes(opt.id);
                          const toggleMultiOpt = () => {
                            if (opt.exclusive) {
                              onAnswerQuestion(
                                q.id,
                                isSelected ? [] : [opt.id],
                                { comment: ans?.comment }
                              );
                              return;
                            }
                            const exclusiveIds = new Set(
                              filteredOptions.filter((o) => o.exclusive).map((o) => o.id)
                            );
                            const cleaned = selectedArr.filter((id) => !exclusiveIds.has(id));
                            const next = isSelected
                              ? cleaned.filter((id) => id !== opt.id)
                              : [...cleaned, opt.id];
                            onAnswerQuestion(q.id, next, { comment: ans?.comment });
                          };
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isReadOnly}
                              onClick={toggleMultiOpt}
                              className={`sar-glass-option text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
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
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {filteredOptions.map((opt) => {
                          const isSelected = rawVal === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isReadOnly}
                              onClick={() =>
                                onAnswerQuestion(q.id, opt.id, { comment: ans?.comment })
                              }
                              className={`sar-glass-option text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
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

                    {/* Optional Additional Comments / Implementation Details */}
                    {q.answerType !== 'long_text' && (
                      <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                        <label className="block text-[11px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                          Additional Comments / Implementation Details (Optional)
                        </label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={ans?.comment || ''}
                          onChange={(e) =>
                            onAnswerQuestion(q.id, rawVal, { comment: e.target.value })
                          }
                          placeholder="Add specific architecture notes, tool names, or implementation details..."
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-400 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Embedded Repeater Table Editors in M5, M12 */}

              {currentModInfo?.code === 'M12' && (
                <RepeaterTableEditors
                  tableType="firewall_rules"
                  tables={sar.tables}
                  internetFacing={Boolean(evalRes?.flags.internet_facing)}
                  isReadOnly={isReadOnly}
                  onUpdateTables={onUpdateTables}
                />
              )}

              {currentModInfo?.code === 'M5' && (
                <div className="space-y-6">
                  <RepeaterTableEditors
                    tableType="api_endpoints"
                    tables={sar.tables}
                    internetFacing={Boolean(evalRes?.flags.internet_facing)}
                    isReadOnly={isReadOnly}
                    onUpdateTables={onUpdateTables}
                  />
                  <RepeaterTableEditors
                    tableType="integrations"
                    tables={sar.tables}
                    internetFacing={Boolean(evalRes?.flags.internet_facing)}
                    isReadOnly={isReadOnly}
                    onUpdateTables={onUpdateTables}
                  />
                </div>
              )}

              {currentModInfo?.code === 'M8' && (
                <RepeaterTableEditors
                  tableType="integrations"
                  tables={sar.tables}
                  internetFacing={Boolean(evalRes?.flags.internet_facing)}
                  isReadOnly={isReadOnly}
                  onUpdateTables={onUpdateTables}
                />
              )}
            </div>
          )}

          {/* Module Prev / Next Footer */}
          <div id="sec-mod-evidence" className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
            {prevMod ? (
              <button
                type="button"
                onClick={() => onSelectModule(prevMod.code)}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:border-zinc-950 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Previous: {prevMod.shortTitle}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onBackToPreliminary}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:border-zinc-950 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Back to Preliminary Checklist</span>
              </button>
            )}

            {nextMod ? (
              <button
                type="button"
                onClick={() => onSelectModule(nextMod.code)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer shadow-xs transition-all"
              >
                <span>Next Section: {nextMod.shortTitle}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={tryProceedToReview}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer shadow-xs transition-all"
              >
                {!flowGates.modulesComplete && !isReadOnly && <Lock className="w-4 h-4 shrink-0" />}
                <span>Proceed to Full Review &amp; Submit</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}
          </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
