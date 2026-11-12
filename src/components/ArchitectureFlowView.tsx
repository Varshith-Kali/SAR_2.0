import React, { useMemo } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  Edit3,
  Globe,
  KeyRound,
  Layers,
  Lock,
  Network,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  APPLICATION_HOSTING_FIELDS,
  CONNECTED_APP_FLOW_FIELDS,
  resolveActiveUserThreads,
  resolveApplicationHostingThreads,
  resolveConnectedAppFlows,
  THREAD_DIMENSIONS,
  ThreadDimensionDefinition,
} from '../shared/checklistChains';
import { CMDB_APPLICATIONS } from '../shared/definitions';
import { CyberKickerTrace } from './CyberScrollTrace';
import { DefinitionVersion, SARRecord } from '../shared/types';

interface ArchitectureFlowViewProps {
  sar: SARRecord;
  definition: DefinitionVersion;
  onJumpToPreliminaryStage: (stage: number) => void;
  onBackToModules: () => void;
  onProceedToReview: () => void;
}

function getUserDimensionShortLabel(
  dimId: ThreadDimensionDefinition['id'],
  optionId: string
): string {
  const dim = THREAD_DIMENSIONS.find((d) => d.id === dimId);
  const opt = dim?.options.find((o) => o.id === optionId);
  return opt?.shortLabel || opt?.label || optionId;
}

function getConnectedFlowShortLabel(
  key: 'direction' | 'protocol' | 'hostingTarget' | 'encrypted',
  optionId: string
): string {
  const field = CONNECTED_APP_FLOW_FIELDS.find((f) => f.key === key);
  const opt = field?.options.find((o) => o.id === optionId);
  return opt?.shortLabel || opt?.label || optionId;
}

function getHostingFieldShortLabel(
  key: 'platform' | 'role' | 'zone',
  optionId: string
): string {
  const field = APPLICATION_HOSTING_FIELDS.find((f) => f.key === key);
  const opt = field?.options.find((o) => o.id === optionId);
  return opt?.shortLabel || opt?.label || optionId;
}

interface FlowCardGroup {
  id: string;
  title: string;
  subtitle?: string;
  badges: string[];
  metaNote?: string;
}

export const ArchitectureFlowView: React.FC<ArchitectureFlowViewProps> = ({
  sar,
  definition,
  onJumpToPreliminaryStage,
  onBackToModules,
  onProceedToReview,
}) => {
  const qMap = useMemo(() => {
    return new Map(definition.questions.map((q) => [q.id, q]));
  }, [definition.questions]);

  // Resolve Connected Application names from CMDB IDs + custom connected apps
  const connectedAppNames = useMemo(() => {
    const names: string[] = [];
    (sar.basics.connectedAppIds || []).forEach((id) => {
      const found = CMDB_APPLICATIONS.find((a) => a.id === id);
      if (found) {
        names.push(
          found.code ? `${found.canonicalName} (${found.code})` : found.canonicalName
        );
      }
    });
    (sar.basics.customConnectedApps || []).forEach((custom) => {
      const trimmed = custom.trim();
      if (trimmed && !names.includes(trimmed)) {
        names.push(trimmed);
      }
    });
    return names;
  }, [sar.basics.connectedAppIds, sar.basics.customConnectedApps]);

  // Helper to resolve clean human-readable labels for any question ID (strictly answers only, no question text)
  const getAnswerBadges = (questionId: string): string[] => {
    const entry = sar.answers[questionId];
    if (!entry || entry.state === 'inactive') return [];
    const val = entry.value;
    if (val === undefined || val === null || val === '') return [];

    const qDef = qMap.get(questionId);
    const resolveSingle = (token: string): string => {
      const opt = qDef?.options?.find((o) => o.id === token);
      if (opt) return opt.label;
      return token
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    if (Array.isArray(val)) {
      return val
        .map((v) => resolveSingle(String(v)))
        .filter(
          (v) =>
            Boolean(v) &&
            v !== 'None' &&
            !v.toLowerCase().startsWith('no ') &&
            !v.toLowerCase().startsWith('none ')
        );
    }

    if (typeof val === 'string') {
      const label = resolveSingle(val);
      if (!label) return [];
      return [label];
    }

    return [];
  };

  const getRawOptionIds = (questionId: string): string[] => {
    const entry = sar.answers[questionId];
    if (!entry || entry.state === 'inactive') return [];
    const val = entry.value;
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string' && val.trim() !== '') return [val.trim()];
    return [];
  };

  // Resolve structured sub-threads from Preliminary Checklist
  const userThreadsState = useMemo(
    () => resolveActiveUserThreads(sar.answers),
    [sar.answers]
  );

  const connectedAppFlows = useMemo(
    () =>
      resolveConnectedAppFlows(
        sar.basics.projectName,
        connectedAppNames,
        sar.answers
      ),
    [sar.basics.projectName, connectedAppNames, sar.answers]
  );

  const appHostingThreads = useMemo(
    () =>
      resolveApplicationHostingThreads(
        sar.basics.projectName,
        connectedAppNames,
        sar.answers
      ),
    [sar.basics.projectName, connectedAppNames, sar.answers]
  );

  // ============================================================================
  // COLUMN 1: WHAT (Scope, Architecture Components, Data, Storage, AI & Infra)
  // ============================================================================
  const whatGroups = useMemo<FlowCardGroup[]>(() => {
    const groups: FlowCardGroup[] = [];

    // 1. Release & Change Scope (P1, P2, P3)
    const releaseBadges = [
      ...getAnswerBadges('P1'),
      ...getAnswerBadges('P2'),
      ...getAnswerBadges('P3'),
    ];
    const priorSarNote = sar.answers.P2?.comment?.trim()
      ? `Ref: ${sar.answers.P2.comment.trim()}`
      : undefined;
    if (releaseBadges.length > 0) {
      groups.push({
        id: 'what-release',
        title: 'Release & Change Nature',
        badges: releaseBadges,
        metaNote: priorSarNote,
      });
    }

    // 2. Solution Components in Scope (P4)
    const componentBadges = getAnswerBadges('P4');
    if (componentBadges.length > 0) {
      groups.push({
        id: 'what-components',
        title: 'Components in Scope',
        badges: componentBadges,
      });
    }

    // 3. Data Classification, Types & Storage (P20, P21, P19, P22, P23)
    const sensitivityBadges = getAnswerBadges('P20');
    const dataTypesBadges =
      getAnswerBadges('P21').length > 0
        ? getAnswerBadges('P21')
        : sar.basics.preliminaryDataTypes || [];
    const storageBadges = [
      ...getAnswerBadges('P19'),
      ...getAnswerBadges('P22'),
      ...getAnswerBadges('P23'),
    ].filter((b) => !b.toLowerCase().startsWith('no '));

    const combinedDataBadges = [...dataTypesBadges, ...storageBadges];
    if (sensitivityBadges.length > 0 || combinedDataBadges.length > 0) {
      groups.push({
        id: 'what-data',
        title: 'Data, Storage & Volume',
        subtitle: sensitivityBadges[0] ? sensitivityBadges[0] : undefined,
        badges:
          combinedDataBadges.length > 0
            ? combinedDataBadges
            : sensitivityBadges,
      });
    }

    // 4. Compliance, Runtime Infra & AI (P25, P26, P27, P28, P30)
    const complianceAndInfraBadges = [
      ...getAnswerBadges('P25'),
      ...getAnswerBadges('P26'),
      ...getAnswerBadges('P27'),
      ...getAnswerBadges('P28'),
      ...getAnswerBadges('P30'),
    ].filter(
      (b) =>
        !b.toLowerCase().startsWith('no ') &&
        !b.toLowerCase().startsWith('none ')
    );

    if (complianceAndInfraBadges.length > 0) {
      groups.push({
        id: 'what-infra-compliance',
        title: 'Secrets, Crypto & AI',
        badges: complianceAndInfraBadges,
      });
    }

    return groups;
  }, [sar.answers, sar.basics.preliminaryDataTypes, qMap]);

  // ============================================================================
  // COLUMN 2: WHO (Ownership, Human Users x Platforms, Privileged & Machine IDs)
  // ============================================================================
  const whoOwnershipBadges = useMemo(() => getAnswerBadges('P7'), [sar.answers, qMap]);
  const whoUserBadges = useMemo(() => getAnswerBadges('P8'), [sar.answers, qMap]);
  const whoPrivilegedAndVendorBadges = useMemo(() => {
    return [...getAnswerBadges('P12'), ...getAnswerBadges('P29')].filter(
      (b) => !b.toLowerCase().startsWith('no ')
    );
  }, [sar.answers, qMap]);
  const whoMachineIdentityBadges = useMemo(() => {
    return getAnswerBadges('P11').filter((b) => !b.toLowerCase().startsWith('no '));
  }, [sar.answers, qMap]);

  // ============================================================================
  // COLUMN 3: HOW (Entry Channels, Connected System Flows, Edge & Network Controls)
  // ============================================================================
  const howChannelBadges = useMemo(() => getAnswerBadges('P9'), [sar.answers, qMap]);
  const howIntegrationSummaryBadges = useMemo(
    () => getAnswerBadges('P13').filter((b) => !b.toLowerCase().startsWith('no ')),
    [sar.answers, qMap]
  );
  const howEdgeAndTrafficBadges = useMemo(() => {
    return [
      ...getAnswerBadges('P14'),
      ...getAnswerBadges('P15'),
      ...getAnswerBadges('P16'),
      ...getAnswerBadges('P17'),
      ...getAnswerBadges('P18'),
    ].filter(
      (b) =>
        !b.toLowerCase().startsWith('no ') &&
        !b.toLowerCase().startsWith('none ')
    );
  }, [sar.answers, qMap]);

  // ============================================================================
  // COLUMN 4: WHERE (Hosting Platforms, Per-System Zones, Environments & Residency)
  // ============================================================================
  const whereHostingBadges = useMemo(() => getAnswerBadges('P5'), [sar.answers, qMap]);
  const whereEnvironmentBadges = useMemo(() => getAnswerBadges('P6'), [sar.answers, qMap]);
  const whereOriginNetworkBadges = useMemo(() => getAnswerBadges('P10'), [sar.answers, qMap]);
  const whereResidencyBadges = useMemo(() => getAnswerBadges('P24'), [sar.answers, qMap]);

  const primaryProjectName =
    sar.basics.projectName?.trim() || 'Primary Application Under Review';
  const totalConnectedSystems = connectedAppNames.length;

  const isInternetFacing = useMemo(() => {
    const p14 = getRawOptionIds('P14');
    const p10 = getRawOptionIds('P10');
    return (
      p14.includes('yes_public') ||
      p14.includes('partner_whitelisted') ||
      p10.includes('internet') ||
      p10.includes('public_internet')
    );
  }, [sar.answers]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 xl:pl-14 py-4 space-y-3.5">
      {/* =====================================================================
          1. COMPACT SINGLE-BAR HEADER (Matches Preliminary & Checklist views)
         ===================================================================== */}
      <section
        id="sec-flow-header"
        className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-3 border-b border-zinc-200 dark:border-zinc-800"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <CyberKickerTrace />
            <span className="font-bold text-zinc-900 dark:text-zinc-100">PHASE 4 OF 5</span>
            <span>•</span>
            <span>ARCHITECTURE FLOW (WHAT · WHO · HOW · WHERE)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-zinc-950 dark:text-white truncate max-w-xl">
              {primaryProjectName}
            </h1>

            {/* Compact Inline Context Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {sar.basics.businessUnit || 'Enterprise Banking'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold">
                {getAnswerBadges('P20')[0] || 'Internal'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-700 dark:text-zinc-300">
                {isInternetFacing ? 'Internet Facing' : 'Internal Only'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-mono text-zinc-700 dark:text-zinc-300">
                {totalConnectedSystems > 0
                  ? `${totalConnectedSystems} Connected App${totalConnectedSystems > 1 ? 's' : ''}`
                  : 'Standalone'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={onBackToModules}
            className="sar-glass-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Checklist</span>
          </button>

          <button
            type="button"
            onClick={onProceedToReview}
            className="sar-glass-primary-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <span>Review &amp; Submit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* =====================================================================
          2. COMPACT 4-COLUMN ARCHITECTURE BOARD (WHAT ➔ WHO ➔ HOW ➔ WHERE)
         ===================================================================== */}
      <section id="sec-flow-board">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5 items-start">
          {/* =================================================================
              COLUMN 1: 01 · WHAT
             ================================================================= */}
          <div
            id="sec-flow-what"
            className="relative sar-glass-card rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-3 flex flex-col gap-2"
          >
            {/* Desktop Connector Arrow to Column 2 */}
            <div
              aria-hidden="true"
              className="hidden xl:flex absolute -right-3 top-4 z-10 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 items-center justify-center shadow-2xs"
            >
              <ArrowRight className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
            </div>

            {/* Integrated Compact Column Header */}
            <div className="rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex items-baseline gap-1.5">
                  <span className="font-mono text-xs font-bold tracking-wider uppercase">
                    01 · WHAT
                  </span>
                  <span className="text-[10px] opacity-75 truncate">
                    Scope &amp; Data
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onJumpToPreliminaryStage(1)}
                title="Edit Stage 1 (WHAT)"
                className="p-1 rounded hover:bg-white/15 dark:hover:bg-zinc-950/10 transition-colors cursor-pointer shrink-0"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>

            {/* Primary System Node */}
            <div className="rounded-lg bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800 px-2.5 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                  Primary System
                </div>
                <div className="font-display text-xs font-bold text-zinc-950 dark:text-white truncate">
                  {primaryProjectName}
                </div>
              </div>
              <Cpu className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            </div>

            {whatGroups.map((group) => (
              <React.Fragment key={group.id}>
                <div className="flex justify-center" aria-hidden="true">
                  <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                </div>

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {group.title}
                    </span>
                    {group.subtitle ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[10px] font-semibold">
                        <Shield className="w-2.5 h-2.5" />
                        <span>{group.subtitle}</span>
                      </span>
                    ) : (
                      <Database className="w-3 h-3 text-zinc-400 shrink-0" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {group.badges.map((badge, i) => (
                      <span
                        key={`${group.id}-${i}`}
                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 leading-tight"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {group.metaNote && (
                    <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                      {group.metaNote}
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* =================================================================
              COLUMN 2: 02 · WHO
             ================================================================= */}
          <div
            id="sec-flow-who"
            className="relative sar-glass-card rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-3 flex flex-col gap-2"
          >
            {/* Desktop Connector Arrow to Column 3 */}
            <div
              aria-hidden="true"
              className="hidden xl:flex absolute -right-3 top-4 z-10 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 items-center justify-center shadow-2xs"
            >
              <ArrowRight className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
            </div>

            {/* Integrated Compact Column Header */}
            <div className="rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex items-baseline gap-1.5">
                  <span className="font-mono text-xs font-bold tracking-wider uppercase">
                    02 · WHO
                  </span>
                  <span className="text-[10px] opacity-75 truncate">
                    Users &amp; Identity
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onJumpToPreliminaryStage(2)}
                title="Edit Stage 2 (WHO)"
                className="p-1 rounded hover:bg-white/15 dark:hover:bg-zinc-950/10 transition-colors cursor-pointer shrink-0"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>

            {/* 1. Delivery & Operations Ownership (P7) */}
            {whoOwnershipBadges.length > 0 && (
              <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Build &amp; Operations
                  </span>
                  <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {whoOwnershipBadges.map((b, idx) => (
                    <span
                      key={`own-${idx}`}
                      className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 leading-tight"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Compact 2-Line User Identity × Platform Access Flows (P8 & P8_THREADS) */}
            {(userThreadsState.activeUserTypes.length > 0 || whoUserBadges.length > 0) && (
              <>
                {whoOwnershipBadges.length > 0 && (
                  <div className="flex justify-center" aria-hidden="true">
                    <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      User × Platform Access Flows
                    </span>
                    <Users className="w-3 h-3 text-zinc-400 shrink-0" />
                  </div>

                  {userThreadsState.activeUserTypes.length > 0 ? (
                    <div className="space-y-1.5">
                      {userThreadsState.activeUserTypes.map((ut) => {
                        const row = userThreadsState.matrix[ut.userTypeId] || ut.defaultValues;
                        const medium = getUserDimensionShortLabel('platform', row.platform);
                        const scope = getUserDimensionShortLabel('accessScope', row.accessScope);
                        const net = getUserDimensionShortLabel('networkHow', row.networkHow);
                        const auth = getUserDimensionShortLabel('authMechanism', row.authMechanism);
                        return (
                          <div
                            key={ut.userTypeId}
                            className="rounded-lg bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/70 dark:border-zinc-800 px-2.5 py-1.5 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-display text-[11px] font-bold text-zinc-950 dark:text-white truncate">
                                {ut.shortLabel}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-mono text-[9px] font-semibold shrink-0">
                                {auth}
                                {row.mfaEnforced === 'yes' ? ' + MFA' : ''}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">
                              <span>{medium}</span>
                              <span className="text-zinc-400">→</span>
                              <span>{scope}</span>
                              <span className="text-zinc-400">→</span>
                              <span>{net}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {whoUserBadges.map((b, i) => (
                        <span
                          key={`usr-${i}`}
                          className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 3. Privileged & Vendor Access (P12, P29) */}
            {whoPrivilegedAndVendorBadges.length > 0 && (
              <>
                <div className="flex justify-center" aria-hidden="true">
                  <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                </div>

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Privileged &amp; Vendor Access
                    </span>
                    <KeyRound className="w-3 h-3 text-zinc-400 shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {whoPrivilegedAndVendorBadges.map((b, idx) => (
                      <span
                        key={`priv-${idx}`}
                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 leading-tight"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 4. Non-Human / Machine Identities (P11) */}
            {whoMachineIdentityBadges.length > 0 && (
              <>
                <div className="flex justify-center" aria-hidden="true">
                  <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                </div>

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Machine Identities
                    </span>
                    <Sparkles className="w-3 h-3 text-zinc-400 shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {whoMachineIdentityBadges.map((b, idx) => (
                      <span
                        key={`mach-${idx}`}
                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 leading-tight"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* =================================================================
              COLUMN 3: 03 · HOW
             ================================================================= */}
          <div
            id="sec-flow-how"
            className="relative sar-glass-card rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-3 flex flex-col gap-2"
          >
            {/* Desktop Connector Arrow to Column 4 */}
            <div
              aria-hidden="true"
              className="hidden xl:flex absolute -right-3 top-4 z-10 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 items-center justify-center shadow-2xs"
            >
              <ArrowRight className="w-3 h-3 text-zinc-700 dark:text-zinc-300" />
            </div>

            {/* Integrated Compact Column Header */}
            <div className="rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Network className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex items-baseline gap-1.5">
                  <span className="font-mono text-xs font-bold tracking-wider uppercase">
                    03 · HOW
                  </span>
                  <span className="text-[10px] opacity-75 truncate">
                    Channels &amp; Flows
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onJumpToPreliminaryStage(3)}
                title="Edit Stage 3 (HOW)"
                className="p-1 rounded hover:bg-white/15 dark:hover:bg-zinc-950/10 transition-colors cursor-pointer shrink-0"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>

            {/* 1. Entry Interfaces & Channels (P9) */}
            {howChannelBadges.length > 0 && (
              <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Entry Channels
                  </span>
                  <Network className="w-3 h-3 text-zinc-400 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {howChannelBadges.map((b, idx) => (
                    <span
                      key={`chan-${idx}`}
                      className="px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] font-semibold leading-tight"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Compact 2-Line Connected System Integration Flows (P13 & P13_APP_FLOWS) */}
            {(connectedAppFlows.length > 0 || howIntegrationSummaryBadges.length > 0) && (
              <>
                {howChannelBadges.length > 0 && (
                  <div className="flex justify-center" aria-hidden="true">
                    <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Connected System Flows ({connectedAppFlows.length})
                    </span>
                  </div>

                  {connectedAppFlows.length > 0 ? (
                    <div className="space-y-1.5">
                      {connectedAppFlows.map((flow) => {
                        const dir = getConnectedFlowShortLabel('direction', flow.direction);
                        const proto = getConnectedFlowShortLabel('protocol', flow.protocol);
                        const host = getConnectedFlowShortLabel(
                          'hostingTarget',
                          flow.hostingTarget
                        );
                        return (
                          <div
                            key={flow.appId}
                            className="rounded-lg bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/70 dark:border-zinc-800 px-2.5 py-1.5 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                title={flow.appLabel}
                                className="font-display text-[11px] font-bold text-zinc-950 dark:text-white truncate"
                              >
                                {flow.shortLabel}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-mono text-[9px] font-semibold shrink-0">
                                {dir}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">
                              <span>{proto}</span>
                              <span className="text-zinc-400">→</span>
                              <span>{host}</span>
                              <span className="text-zinc-400">→</span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {flow.encrypted === 'yes' ? 'TLS / mTLS' : 'Plaintext'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {howIntegrationSummaryBadges.map((b, idx) => (
                        <span
                          key={`int-sum-${idx}`}
                          className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 3. Edge Exposure, API Gateway & Firewall Controls (P14, P15, P16, P17, P18) */}
            {howEdgeAndTrafficBadges.length > 0 && (
              <>
                <div className="flex justify-center" aria-hidden="true">
                  <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                </div>

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Edge, Gateway &amp; Firewall
                    </span>
                    <Lock className="w-3 h-3 text-zinc-400 shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {howEdgeAndTrafficBadges.map((b, idx) => (
                      <span
                        key={`edge-${idx}`}
                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 leading-tight"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* =================================================================
              COLUMN 4: 04 · WHERE
             ================================================================= */}
          <div
            id="sec-flow-where"
            className="sar-glass-card rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-3 flex flex-col gap-2"
          >
            {/* Integrated Compact Column Header */}
            <div className="rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <div className="min-w-0 flex items-baseline gap-1.5">
                  <span className="font-mono text-xs font-bold tracking-wider uppercase">
                    04 · WHERE
                  </span>
                  <span className="text-[10px] opacity-75 truncate">
                    Hosting &amp; Zones
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onJumpToPreliminaryStage(4)}
                title="Edit Stage 4 (WHERE)"
                className="p-1 rounded hover:bg-white/15 dark:hover:bg-zinc-950/10 transition-colors cursor-pointer shrink-0"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>

            {/* 1. Hosting Platforms Selected (P5) */}
            {whereHostingBadges.length > 0 && (
              <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Hosting Models
                  </span>
                  <Cloud className="w-3 h-3 text-zinc-400 shrink-0" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {whereHostingBadges.map((b, idx) => (
                    <span
                      key={`host-${idx}`}
                      className="px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] font-semibold leading-tight"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Compact 2-Line Per-Application Hosting Topology (P5_APP_HOSTING) */}
            {appHostingThreads.length > 0 && (
              <>
                {whereHostingBadges.length > 0 && (
                  <div className="flex justify-center" aria-hidden="true">
                    <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                  </div>
                )}

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      System Placement &amp; Zones ({appHostingThreads.length})
                    </span>
                    <Server className="w-3 h-3 text-zinc-400 shrink-0" />
                  </div>

                  <div className="space-y-1.5">
                    {appHostingThreads.map((node) => {
                      const plat = getHostingFieldShortLabel('platform', node.platform);
                      const role = getHostingFieldShortLabel('role', node.role);
                      const zone = getHostingFieldShortLabel('zone', node.zone);
                      return (
                        <div
                          key={node.unitId}
                          className="rounded-lg bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/70 dark:border-zinc-800 px-2.5 py-1.5 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              title={node.unitLabel}
                              className="font-display text-[11px] font-bold text-zinc-950 dark:text-white truncate"
                            >
                              {node.shortLabel}
                            </span>
                            <span
                              className={`font-mono text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                                node.isPrimary
                                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                                  : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                              }`}
                            >
                              {node.isPrimary ? 'Primary' : 'Connected'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-600 dark:text-zinc-300 font-medium">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {plat}
                            </span>
                            <span className="text-zinc-400">→</span>
                            <span>{zone}</span>
                            <span className="text-zinc-400">·</span>
                            <span>{role}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* 3. Target Environments & Source Networks (P6 & P10) */}
            {(whereEnvironmentBadges.length > 0 || whereOriginNetworkBadges.length > 0) && (
              <>
                <div className="flex justify-center" aria-hidden="true">
                  <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                </div>

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Environments &amp; Origins
                    </span>
                    <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {whereEnvironmentBadges.map((b, idx) => (
                      <span
                        key={`env-${idx}`}
                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 leading-tight"
                      >
                        {b}
                      </span>
                    ))}
                    {whereOriginNetworkBadges.map((b, idx) => (
                      <span
                        key={`orig-${idx}`}
                        className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 leading-tight"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 4. Data Residency & Cross-Border Boundary (P24) */}
            {whereResidencyBadges.length > 0 && (
              <>
                <div className="flex justify-center" aria-hidden="true">
                  <ArrowDown className="w-3 h-3 text-zinc-300 dark:text-zinc-700" />
                </div>

                <div className="rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Data Residency
                    </span>
                    <ShieldCheck className="w-3 h-3 text-zinc-400 shrink-0" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {whereResidencyBadges.map((b, idx) => (
                      <span
                        key={`res-${idx}`}
                        className="px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[11px] font-semibold leading-tight"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. COMPACT BOTTOM NAVIGATION BAR
         ===================================================================== */}
      <section
        id="sec-flow-footer"
        className="sar-glass-card rounded-xl border border-zinc-200/90 dark:border-zinc-800 px-3.5 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5"
      >
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0" />
          <span>
            <strong>WHAT · WHO · HOW · WHERE</strong> flow synthesized from your Preliminary
            Checklist responses.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={onBackToModules}
            className="sar-glass-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Checklist</span>
          </button>

          <button
            type="button"
            onClick={onProceedToReview}
            className="sar-glass-primary-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <span>Proceed to Review &amp; Submit</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
};
