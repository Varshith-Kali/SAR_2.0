import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Layers,
  X,
  RotateCcw,
} from 'lucide-react';
import {
  SARRecord,
  DefinitionVersion,
  QuestionDefinition,
  AnswerEntry,
  ModuleCode,
} from '../shared/types';
import {
  PRELIMINARY_CHAIN_MAP,
  THREAD_DIMENSIONS,
  ThreadDimensionDefinition,
  resolveActiveUserThreads,
  CONNECTED_APP_FLOW_FIELDS,
  ConnectedAppFlowEntry,
  resolveConnectedAppFlows,
  APPLICATION_HOSTING_FIELDS,
  ApplicationHostingThreadEntry,
  resolveApplicationHostingThreads,
} from '../shared/checklistChains';
import { CMDB_APPLICATIONS } from '../shared/definitions';
import { CyberKickerTrace } from './CyberScrollTrace';

interface PreliminaryChecklistViewProps {
  sar: SARRecord;
  definition: DefinitionVersion;
  activeStage: number;
  onChangeStage: (stage: number) => void;
  onAnswerQuestion: (
    questionId: string,
    value: unknown,
    extra?: { comment?: string; naReason?: string; unknownOwner?: string; unknownNote?: string }
  ) => void;
  onOpenDetailedModule: (moduleCode: ModuleCode) => void;
  scopeChangeNotice?: {
    added: ModuleCode[];
    removed: ModuleCode[];
    previousAnswer?: { questionId: string; value: unknown };
  } | null;
  onUndoScopeChange?: () => void;
  onDismissScopeNotice?: () => void;
}

const STAGE_BUCKETS = [
  {
    stageNumber: 1,
    stageLabel: 'STAGE 1',
    shortLabel: 'WHAT',
    title: 'Scope, Data, Infrastructure & AI',
    subtitle: 'Change scope, data classification, encryption, infra, and AI.',
    questionIds: [
      'P1',
      'P2',
      'P3',
      'P4',
      'P19',
      'P20',
      'P21',
      'P22',
      'P23',
      'P25',
      'P26',
      'P27',
      'P28',
      'P30',
    ],
  },
  {
    stageNumber: 2,
    stageLabel: 'STAGE 2',
    shortLabel: 'WHO',
    title: 'Users, Platforms & Identity',
    subtitle: 'Who builds, operates, and logs into the system.',
    questionIds: ['P7', 'P8', 'P12', 'P29', 'P11'],
  },
  {
    stageNumber: 3,
    stageLabel: 'STAGE 3',
    shortLabel: 'HOW',
    title: 'Channels, Protocols & Connectivity',
    subtitle: 'Interfaces, integrations, API gateways, and firewall paths.',
    questionIds: ['P9', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18'],
  },
  {
    stageNumber: 4,
    stageLabel: 'STAGE 4',
    shortLabel: 'WHERE',
    title: 'Hosting, Environments & Network',
    subtitle: 'Hosting topology, target environments, and data residency.',
    questionIds: ['P5', 'P6', 'P10', 'P24'],
  },
];

function isQuestionAnswered(ans?: AnswerEntry): boolean {
  if (!ans || ans.state === 'inactive') return false;
  const val = ans.value;
  if (val === undefined || val === null || val === '') return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val as object).length > 0;
  return true;
}

function getShortOptionLabel(
  dimId: ThreadDimensionDefinition['id'],
  optionId: string
): string {
  const dim = THREAD_DIMENSIONS.find((d) => d.id === dimId);
  const opt = dim?.options.find((o) => o.id === optionId);
  return opt?.shortLabel || optionId;
}

function getCrispWhyText(rawText?: string, fallbackText?: string): string {
  const source = (rawText || fallbackText || '').trim();
  if (!source) return 'Helps scope the right security checklist questions for your system.';
  const firstSentence = source.split(/(?<=[.!?])\s+/)[0] || source;
  return firstSentence.length > 150 ? `${firstSentence.slice(0, 147)}...` : firstSentence;
}

/**
 * Contextualizes each Preliminary question title so the requester never wonders
 * "Which solution or application are you asking about?" when 2-3 connected apps exist.
 */
function getContextualQuestionTitle(
  q: QuestionDefinition,
  primaryApp: string,
  connectedApps: string[]
): string {
  const hasConnected = connectedApps.length > 0;
  const connectedLabel =
    connectedApps.length <= 2
      ? connectedApps.join(' & ')
      : `${connectedApps.slice(0, 2).join(', ')} +${connectedApps.length - 2} more`;

  switch (q.id) {
    // Stage 1: WHAT — Scope, Data, Assets & AI
    case 'P1':
      return `What is changing in ${primaryApp} for this request?`;
    case 'P2':
      return `Has ${primaryApp} been through a Security Architecture Review (SAR) before?`;
    case 'P3':
      return `What is the scope of this change to ${primaryApp} compared to its previous SAR?`;
    case 'P4':
      return hasConnected
        ? `Which technical components of ${primaryApp} (or its integration with ${connectedLabel}) are being changed or enhanced?`
        : `Which technical components of ${primaryApp} are being changed or enhanced in this request?`;
    case 'P19':
      return hasConnected
        ? `Does ${primaryApp} store, process, or transmit data (including data exchanged with ${connectedLabel})?`
        : `Does ${primaryApp} store, process, or transmit data?`;
    case 'P20':
      return `What is the highest applicable data classification for ${primaryApp}?`;
    case 'P21':
      return hasConnected
        ? `Which data types are handled by ${primaryApp} or exchanged with ${connectedLabel}?`
        : `Which data types are involved in ${primaryApp}?`;
    case 'P22':
      return `In which states does data exist across ${primaryApp}?`;
    case 'P23':
      return `Roughly how many customer records are involved in ${primaryApp}?`;
    case 'P25':
      return hasConnected
        ? `Is data being migrated, copied, or transformed into ${primaryApp} (or from ${connectedLabel})?`
        : `Is data being migrated, copied, or transformed in ${primaryApp}?`;
    case 'P26':
      return `Which regulatory drivers apply to ${primaryApp}?`;
    case 'P27':
      return `Is any new infrastructure being introduced for ${primaryApp} (new servers, cloud services, database servers, Kubernetes, or network components)?`;
    case 'P28':
      return `Does ${primaryApp} include an AI or LLM component?`;
    case 'P30':
      return `Which architecture artifacts & pre-release security readiness checks are confirmed for ${primaryApp}?`;

    // Stage 2: WHO — Users, Identities & Ownership
    case 'P7':
      return `Who builds and runs ${primaryApp}?`;
    case 'P8':
      return `Which human users will access or interact with ${primaryApp}? (Select all user types to configure their access side by side)`;
    case 'P12':
      return `Are user passwords stored directly in ${primaryApp} (instead of corporate AD / SSO)?`;
    case 'P29':
      return `Is third-party or external-vendor access to bank systems or data required for ${primaryApp}?`;
    case 'P11':
      return hasConnected
        ? `Which non-human or automated identities are involved in ${primaryApp} (including connections with ${connectedLabel})?`
        : `Which non-human or automated identities are involved in ${primaryApp}?`;

    // Stage 3: HOW — Channels, Protocols & Connectivity
    case 'P9':
      return `How will users interact with ${primaryApp}?`;
    case 'P13':
      return hasConnected
        ? `Does ${primaryApp} exchange data with ${connectedLabel} (or other internal/external systems)?`
        : `Does ${primaryApp} exchange data with connected bank systems or external parties?`;
    case 'P14':
      return hasConnected
        ? `How do ${primaryApp} and its connected systems (${connectedLabel}) exchange data?`
        : `How do ${primaryApp} and connected systems exchange data?`;
    case 'P15':
      return hasConnected
        ? `Will any connection between ${primaryApp} and ${connectedLabel} cross between the bank network and the internet or an external network?`
        : `Will any connection for ${primaryApp} cross between the bank network and the internet or an external network?`;
    case 'P16':
      return hasConnected
        ? `Will ${connectedLabel} or other systems call ${primaryApp}'s APIs (and are they routed through the API gateway)?`
        : `Will other systems call ${primaryApp}'s APIs (and are they routed through the API gateway)?`;
    case 'P17':
      return `Does this change to ${primaryApp} require any new or modified network connectivity (firewall rules, ports, or IP whitelisting)?`;
    case 'P18':
      return `Is there any third-party-managed portal accessed by the bank’s internal users for ${primaryApp}?`;

    // Stage 4: WHERE — Hosting, Environments & Locations
    case 'P5':
      return hasConnected
        ? `Where are ${primaryApp} and its in-scope connected systems (${connectedLabel}) hosted? (Select all environments that apply)`
        : `Where is ${primaryApp} hosted? (Select all environments that apply)`;
    case 'P6':
      return `Which bank environments are in scope for ${primaryApp} in this deployment?`;
    case 'P10':
      return hasConnected
        ? `From which network, device, or location will users (and ${connectedLabel}) access ${primaryApp}?`
        : `From which network, device, or location will users access ${primaryApp}?`;
    case 'P24':
      return `Will any data handled by ${primaryApp} be stored or processed outside India?`;
    default:
      return q.text;
  }
}

function getContextualQuestionHint(
  q: QuestionDefinition,
  primaryApp: string,
  connectedApps: string[]
): string | undefined {
  if (q.id === 'P5' && connectedApps.length > 0) {
    return `Select all hosting models used across ${primaryApp} and its ${connectedApps.length} connected system(s) (${connectedApps.join(', ')}). You can map each system's exact hosting side by side below.`;
  }
  if (q.id === 'P13' && connectedApps.length > 0) {
    return `${connectedApps.length} connected application(s) selected in Request Basics (${connectedApps.join(', ')}). Confirm the integration scope to configure each application's flow side by side.`;
  }
  return q.hint;
}

export const PreliminaryChecklistView: React.FC<PreliminaryChecklistViewProps> = ({
  sar,
  definition,
  activeStage,
  onChangeStage,
  onAnswerQuestion,
  onOpenDetailedModule,
  scopeChangeNotice,
  onUndoScopeChange,
  onDismissScopeNotice,
}) => {
  const [hoveredWhyId, setHoveredWhyId] = useState<string | null>(null);

  const normalizedStage = activeStage >= 1 && activeStage <= 4 ? activeStage : 1;

  // Resolve Primary Application name and Connected Application names from Request Basics
  const primaryAppName = useMemo(() => {
    const raw = (sar.basics.projectName || '').trim();
    if (!raw) return 'Primary Application';
    return raw.length > 42 ? `${raw.slice(0, 40)}...` : raw;
  }, [sar.basics.projectName]);

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

  const evaluation = sar.evaluation;
  const visibleSet = useMemo(
    () => new Set(evaluation?.visibleQuestionIds || []),
    [evaluation?.visibleQuestionIds]
  );

  const prelimQuestionsMap = useMemo(() => {
    const map = new Map<string, QuestionDefinition>();
    definition.questions.forEach((q) => {
      if (q.moduleId === 'M0' || q.stage !== undefined) {
        map.set(q.id, q);
      }
    });
    return map;
  }, [definition.questions]);

  const stageQuestionsMap = useMemo(() => {
    const result: Record<number, QuestionDefinition[]> = { 1: [], 2: [], 3: [], 4: [] };
    STAGE_BUCKETS.forEach((bucket) => {
      const list: QuestionDefinition[] = [];
      bucket.questionIds.forEach((qId) => {
        const qDef = prelimQuestionsMap.get(qId);
        if (qDef && visibleSet.has(qId)) {
          list.push(qDef);
        }
      });
      result[bucket.stageNumber] = list;
    });
    return result;
  }, [prelimQuestionsMap, visibleSet]);

  const allVisiblePrelimQuestions = useMemo(
    () => [
      ...stageQuestionsMap[1],
      ...stageQuestionsMap[2],
      ...stageQuestionsMap[3],
      ...stageQuestionsMap[4],
    ],
    [stageQuestionsMap]
  );

  const totalAnsweredCount = useMemo(
    () =>
      allVisiblePrelimQuestions.filter((q) => isQuestionAnswered(sar.answers[q.id])).length,
    [allVisiblePrelimQuestions, sar.answers]
  );

  const currentStageBucket =
    STAGE_BUCKETS.find((b) => b.stageNumber === normalizedStage) || STAGE_BUCKETS[0];
  const currentStageQuestions = stageQuestionsMap[currentStageBucket.stageNumber] || [];

  const { activeUserTypes, matrix: threadMatrix } = useMemo(
    () => resolveActiveUserThreads(sar.answers),
    [sar.answers]
  );

  const connectedFlowEntries = useMemo(
    () => resolveConnectedAppFlows(primaryAppName, connectedAppNames, sar.answers),
    [primaryAppName, connectedAppNames, sar.answers]
  );

  const hostingThreadEntries = useMemo(
    () => resolveApplicationHostingThreads(primaryAppName, connectedAppNames, sar.answers),
    [primaryAppName, connectedAppNames, sar.answers]
  );

  const activeChecklistModules = useMemo(
    () =>
      (evaluation?.activeModules || [])
        .filter((m) => m.code !== 'M0' && m.code !== 'M17')
        .sort(
          (a, b) =>
            Number(a.code.replace('M', '')) - Number(b.code.replace('M', ''))
        ),
    [evaluation?.activeModules]
  );

  /**
   * Smart Cross-Stage Propagation:
   * Since Stage 1 is WHAT (Scope, Data, Infra & AI), selections in Stage 1
   * intelligently pre-link downstream questions in Stage 2 (WHO), Stage 3 (HOW), and Stage 4 (WHERE)
   * using the exact canonical option IDs from definitions.ts.
   */
  const handleSmartAnswerQuestion = (qId: string, value: unknown) => {
    onAnswerQuestion(qId, value);

    // 1. P1 (Primary Objective in Stage 1 WHAT) -> pre-links P7 (WHO), P5 (WHERE), P11, P13, P17, P18, P19, P25, P27
    if (qId === 'P1' && Array.isArray(value)) {
      const p1Selected = value as string[];
      if (p1Selected.includes('saas_portal')) {
        if (!isQuestionAnswered(sar.answers['P7'])) {
          onAnswerQuestion('P7', 'vendor_builds_and_runs');
        }
        if (!isQuestionAnswered(sar.answers['P18'])) {
          onAnswerQuestion('P18', 'yes');
        }
        const currentP5 = Array.isArray(sar.answers['P5']?.value)
          ? (sar.answers['P5'].value as string[])
          : [];
        if (currentP5.length === 0) {
          onAnswerQuestion('P5', ['vendor_saas']);
        }
      }
      if (p1Selected.includes('infra_cloud_network')) {
        if (!isQuestionAnswered(sar.answers['P27'])) {
          onAnswerQuestion('P27', 'yes');
        }
        if (!isQuestionAnswered(sar.answers['P17'])) {
          onAnswerQuestion('P17', 'yes');
        }
      }
      if (p1Selected.includes('data_migration')) {
        if (!isQuestionAnswered(sar.answers['P25'])) {
          onAnswerQuestion('P25', 'yes');
        }
        if (!isQuestionAnswered(sar.answers['P19'])) {
          onAnswerQuestion('P19', 'yes');
        }
      }
      if (p1Selected.includes('new_integration') && !isQuestionAnswered(sar.answers['P13'])) {
        onAnswerQuestion('P13', connectedAppNames.length > 0 ? 'both' : 'internal_only');
      }
      if (p1Selected.includes('rpa_process') && !isQuestionAnswered(sar.answers['P11'])) {
        onAnswerQuestion('P11', ['rpa_bots']);
      }
    }

    // 2. P4 (Changed Components in Stage 1 WHAT) -> pre-links Stage 1 follow-ups, Stage 2 (WHO), Stage 3 (HOW), Stage 4 (WHERE)
    if (qId === 'P4' && Array.isArray(value)) {
      const selected = value as string[];
      if (
        (selected.includes('apis') ||
          selected.includes('integrations') ||
          selected.includes('third_party_connectivity')) &&
        !isQuestionAnswered(sar.answers['P13'])
      ) {
        onAnswerQuestion(
          'P13',
          selected.includes('third_party_connectivity') || connectedAppNames.length > 0
            ? 'both'
            : 'internal_only'
        );
      }
      if (selected.includes('third_party_connectivity') && !isQuestionAnswered(sar.answers['P15'])) {
        onAnswerQuestion('P15', 'yes');
      }
      const seededP14 = new Set<string>(
        Array.isArray(sar.answers['P14']?.value) ? (sar.answers['P14'].value as string[]) : []
      );
      if (selected.includes('apis') || selected.includes('integrations')) {
        seededP14.add('rest_api');
      }
      if (selected.includes('file_transfer_comp')) {
        seededP14.add('file_transfer');
      }
      if (selected.includes('queues_streaming_comp')) {
        seededP14.add('queues_streams');
      }
      if (seededP14.size > 0 && !isQuestionAnswered(sar.answers['P14'])) {
        onAnswerQuestion('P14', Array.from(seededP14));
      }
      if (selected.includes('ai_llm_comp') && !isQuestionAnswered(sar.answers['P28'])) {
        onAnswerQuestion('P28', 'yes_bank_hosted');
      }
      if (
        (selected.includes('cloud_k8s_containers') || selected.includes('servers_hosting')) &&
        !isQuestionAnswered(sar.answers['P27'])
      ) {
        onAnswerQuestion('P27', 'yes');
      }
      if (selected.includes('data_migration_comp')) {
        if (!isQuestionAnswered(sar.answers['P25'])) {
          onAnswerQuestion('P25', 'yes');
        }
        if (!isQuestionAnswered(sar.answers['P19'])) {
          onAnswerQuestion('P19', 'yes');
        }
      }
      if (
        (selected.includes('database') ||
          selected.includes('data_flows') ||
          selected.includes('reports')) &&
        !isQuestionAnswered(sar.answers['P19'])
      ) {
        onAnswerQuestion('P19', 'yes');
      }
      if (selected.includes('ui') && !isQuestionAnswered(sar.answers['P9'])) {
        onAnswerQuestion('P9', ['web_browser']);
      }
    }

    // 3. P8 (User Types in Stage 2 WHO) -> initialize side-by-side User × Platform threads and sync P9, P10, P12
    if (qId === 'P8' && Array.isArray(value)) {
      const { matrix: resolvedMatrix } = resolveActiveUserThreads({
        ...sar.answers,
        P8: {
          questionId: 'P8',
          value,
          state: 'active',
          updatedBy: sar.updatedBy,
          updatedAt: new Date().toISOString(),
          history: [],
        },
      });
      if (Object.keys(resolvedMatrix).length > 0) {
        onAnswerQuestion('P8_THREADS', resolvedMatrix);
        onAnswerQuestion('P_USER_THREADS', resolvedMatrix);
        syncDownstreamFromThreadMatrix(resolvedMatrix);
      }
    }

    // 4. P13 (Connected Systems in Stage 3 HOW) -> initialize side-by-side app flows when answered
    if (qId === 'P13' && typeof value === 'string' && value !== 'no') {
      const resolved = resolveConnectedAppFlows(primaryAppName, connectedAppNames, {
        ...sar.answers,
        P13: {
          questionId: 'P13',
          value,
          state: 'active',
          updatedBy: sar.updatedBy,
          updatedAt: new Date().toISOString(),
          history: [],
        },
      });
      const nextMap: Record<string, Partial<ConnectedAppFlowEntry>> = {};
      resolved.forEach((entry) => {
        nextMap[entry.appId] = {
          direction: entry.direction,
          protocol: entry.protocol,
          hostingTarget: entry.hostingTarget,
          encrypted: entry.encrypted,
        };
      });
      onAnswerQuestion('P13_APP_FLOWS', nextMap);
      syncDownstreamFromConnectedFlows(resolved, value);
    }

    // 5. P5 (Hosting Model in Stage 4 WHERE) -> initialize side-by-side application hosting breakdown
    if (qId === 'P5' && Array.isArray(value)) {
      const selectedP5 = value as string[];
      if (selectedP5.length > 0 && !selectedP5.includes('not_decided')) {
        const resolvedHosting = resolveApplicationHostingThreads(
          primaryAppName,
          connectedAppNames,
          {
            ...sar.answers,
            P5: {
              questionId: 'P5',
              value: selectedP5,
              state: 'active',
              updatedBy: sar.updatedBy,
              updatedAt: new Date().toISOString(),
              history: [],
            },
          }
        );
        const nextHostingMap: Record<string, Partial<ApplicationHostingThreadEntry>> = {};
        resolvedHosting.forEach((entry) => {
          nextHostingMap[entry.unitId] = {
            platform: entry.platform,
            role: entry.role,
            zone: entry.zone,
          };
        });
        onAnswerQuestion('P5_APP_HOSTING', nextHostingMap);
        if (
          !isQuestionAnswered(sar.answers['P6']) &&
          selectedP5.some((opt) => ['bank_dc', 'bank_aws', 'other_cloud', 'hybrid'].includes(opt))
        ) {
          onAnswerQuestion('P6', ['production', 'dr', 'uat']);
        }
      }
    }
  };

  const syncDownstreamFromThreadMatrix = (
    nextMatrix: Record<string, Record<string, string>>
  ) => {
    const platformToP9Map: Record<string, string> = {
      web_browser: 'web_browser',
      mobile_app: 'mobile_app',
      desktop_client: 'desktop_app',
      cli_ssh: 'cli',
      vdi_citrix: 'rdp_vdi',
      branch_pos_atm: 'kiosk',
    };
    const networkToP10Map: Record<string, string> = {
      corp_lan: 'corporate_network',
      corp_vpn: 'vpn',
      internet_public: 'internet',
      partner_vpn: 'partner_network',
      bastion_pam: 'isolated_subnet',
    };

    const platforms = new Set<string>(
      Array.isArray(sar.answers['P9']?.value)
        ? (sar.answers['P9'].value as string[]).filter((v) =>
            ['web_browser', 'mobile_app', 'desktop_app', 'cli', 'rdp_vdi', 'kiosk'].includes(v)
          )
        : []
    );
    const networks = new Set<string>(
      Array.isArray(sar.answers['P10']?.value)
        ? (sar.answers['P10'].value as string[]).filter((v) =>
            [
              'corporate_network',
              'branch_office',
              'vpn',
              'dmz_subnet',
              'internet',
              'partner_network',
              'isolated_subnet',
              'byod_unmanaged',
            ].includes(v)
          )
        : []
    );
    const authMechanisms = new Set<string>();

    Object.values(nextMatrix).forEach((row) => {
      if (row.platform) {
        const mappedP9 = platformToP9Map[row.platform] || row.platform;
        if (['web_browser', 'mobile_app', 'desktop_app', 'cli', 'rdp_vdi', 'kiosk'].includes(mappedP9)) {
          platforms.add(mappedP9);
        }
      }
      if (row.networkHow) {
        const mappedP10 = networkToP10Map[row.networkHow] || row.networkHow;
        if (
          [
            'corporate_network',
            'branch_office',
            'vpn',
            'dmz_subnet',
            'internet',
            'partner_network',
            'isolated_subnet',
            'byod_unmanaged',
          ].includes(mappedP10)
        ) {
          networks.add(mappedP10);
        }
      }
      if (row.authMechanism) {
        authMechanisms.add(row.authMechanism);
      }
    });

    if (platforms.size > 0) {
      onAnswerQuestion('P9', Array.from(platforms));
    }
    if (networks.size > 0) {
      onAnswerQuestion('P10', Array.from(networks));
    }
    if (authMechanisms.size > 0 && !isQuestionAnswered(sar.answers['P12'])) {
      onAnswerQuestion('P12', authMechanisms.has('local_password') ? 'yes' : 'no');
    }
  };

  const handleUpdateUserThreadCell = (
    userTypeId: string,
    dimId: ThreadDimensionDefinition['id'],
    optionId: string
  ) => {
    const nextMatrix: Record<string, Record<string, string>> = {};
    activeUserTypes.forEach((u) => {
      nextMatrix[u.userTypeId] = { ...(threadMatrix[u.userTypeId] || u.defaultValues) };
    });
    nextMatrix[userTypeId] = {
      ...(nextMatrix[userTypeId] || {}),
      [dimId]: optionId,
    };

    onAnswerQuestion('P8_THREADS', nextMatrix);
    onAnswerQuestion('P_USER_THREADS', nextMatrix);
    syncDownstreamFromThreadMatrix(nextMatrix);
  };

  const syncDownstreamFromConnectedFlows = (
    entries: ConnectedAppFlowEntry[],
    explicitP13Value?: string
  ) => {
    const protocolToP14Map: Record<string, string> = {
      rest_api: 'rest_api',
      graphql_grpc: 'graphql',
      soap_xml: 'soap',
      file_transfer: 'file_transfer',
      queues_streams: 'queues_streams',
      webhooks: 'webhooks',
      db_connection: 'db_connection',
    };
    const validP14Ids = new Set([
      'rest_api',
      'graphql',
      'soap',
      'websocket',
      'webhooks',
      'queues_streams',
      'file_transfer',
      'db_connection',
      'service_to_service',
      'vpn_ipsec_ssh_tunnel',
      'email_smtp',
      'other_custom',
    ]);

    const protocols = new Set<string>(
      Array.isArray(sar.answers['P14']?.value)
        ? (sar.answers['P14'].value as string[]).filter((v) => validP14Ids.has(v))
        : []
    );
    let hasExternalCrossing = false;
    let hasInboundApiCall = false;
    let hasAnyApiCall = false;

    entries.forEach((row) => {
      if (row.protocol) {
        const mappedProto = protocolToP14Map[row.protocol] || row.protocol;
        if (validP14Ids.has(mappedProto)) {
          protocols.add(mappedProto);
        }
        if (['rest_api', 'graphql', 'soap', 'webhooks'].includes(mappedProto)) {
          hasAnyApiCall = true;
          if (row.direction === 'inbound' || row.direction === 'bidirectional') {
            hasInboundApiCall = true;
          }
        }
      }
      if (row.hostingTarget === 'external_vendor') {
        hasExternalCrossing = true;
      }
    });

    if (protocols.size > 0) {
      onAnswerQuestion('P14', Array.from(protocols));
    }

    if (hasAnyApiCall && !isQuestionAnswered(sar.answers['P16'])) {
      onAnswerQuestion('P16', hasInboundApiCall ? 'yes_gateway' : 'no');
    }

    const effectiveP13 =
      explicitP13Value ??
      (typeof sar.answers['P13']?.value === 'string' ? sar.answers['P13'].value : '');
    if (
      hasExternalCrossing ||
      effectiveP13 === 'external_only' ||
      effectiveP13 === 'both'
    ) {
      onAnswerQuestion('P15', 'yes');
    } else if (entries.length > 0) {
      const currentP15 = sar.answers['P15']?.value;
      if (
        !isQuestionAnswered(sar.answers['P15']) ||
        (typeof currentP15 === 'string' && !['yes', 'no', 'not_sure'].includes(currentP15))
      ) {
        onAnswerQuestion('P15', 'no');
      }
    }
  };

  const handleUpdateConnectedFlowCell = (
    appId: string,
    fieldKey: 'direction' | 'protocol' | 'hostingTarget' | 'encrypted',
    optionId: string
  ) => {
    const nextMap: Record<string, Partial<ConnectedAppFlowEntry>> = {};
    const updatedEntries: ConnectedAppFlowEntry[] = connectedFlowEntries.map((entry) => {
      const nextEntry: ConnectedAppFlowEntry =
        entry.appId === appId
          ? ({ ...entry, [fieldKey]: optionId } as ConnectedAppFlowEntry)
          : entry;
      nextMap[nextEntry.appId] = {
        direction: nextEntry.direction,
        protocol: nextEntry.protocol,
        hostingTarget: nextEntry.hostingTarget,
        encrypted: nextEntry.encrypted,
      };
      return nextEntry;
    });

    onAnswerQuestion('P13_APP_FLOWS', nextMap);
    syncDownstreamFromConnectedFlows(updatedEntries);
  };

  const handleUpdateHostingThreadCell = (
    unitId: string,
    fieldKey: 'platform' | 'role' | 'zone',
    optionId: string
  ) => {
    const nextMap: Record<string, Partial<ApplicationHostingThreadEntry>> = {};
    const updatedEntries: ApplicationHostingThreadEntry[] = hostingThreadEntries.map(
      (entry) => {
        const nextEntry: ApplicationHostingThreadEntry =
          entry.unitId === unitId
            ? ({ ...entry, [fieldKey]: optionId } as ApplicationHostingThreadEntry)
            : entry;
        nextMap[nextEntry.unitId] = {
          platform: nextEntry.platform,
          role: nextEntry.role,
          zone: nextEntry.zone,
        };
        return nextEntry;
      }
    );

    onAnswerQuestion('P5_APP_HOSTING', nextMap);

    // Sync distinct hosting environments back into multi-select P5
    const distinctHosting = new Set<string>();
    updatedEntries.forEach((row) => {
      if (row.platform) distinctHosting.add(row.platform);
    });
    const hasOnPrem = distinctHosting.has('bank_dc');
    const hasCloud =
      distinctHosting.has('bank_aws') ||
      distinctHosting.has('other_cloud') ||
      distinctHosting.has('vendor_saas');
    if (hasOnPrem && hasCloud) {
      distinctHosting.add('hybrid');
    }
    if (distinctHosting.size > 0) {
      onAnswerQuestion('P5', Array.from(distinctHosting));
    }
  };

  /**
   * 1. Stage 2 (WHO): Side-by-Side User × Platform Threads inside P8
   */
  const renderUserPlatformThreads = () => {
    if (activeUserTypes.length === 0) return null;

    const count = activeUserTypes.length;
    const gridClass =
      count === 1
        ? 'grid-cols-1 max-w-xl'
        : count === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : count === 3
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : count === 4
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5';

    return (
      <div className="mt-5 pt-5 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-zinc-800 dark:text-zinc-200">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>
              SIDE-BY-SIDE USER × PLATFORM THREADS FOR {primaryAppName.toUpperCase()} ({count})
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Select the platform, access level, network, and login method for each selected user type side by side.
          </p>
        </div>

        <div className={`grid gap-4 ${gridClass}`}>
          {activeUserTypes.map((uMeta, uIdx) => {
            const rowState = threadMatrix[uMeta.userTypeId] || uMeta.defaultValues;

            return (
              <div
                key={uMeta.userTypeId}
                className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 flex flex-col space-y-4"
              >
                <div className="pb-3 border-b border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                      THREAD {uIdx + 1} · {uMeta.shortLabel.toUpperCase()}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white mt-0.5 leading-snug">
                      {uMeta.label}
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0 mt-0.5" />
                </div>

                <div className="space-y-4">
                  {THREAD_DIMENSIONS.map((dim) => {
                    const selectedVal = rowState[dim.id];
                    return (
                      <div key={dim.id} className="space-y-2">
                        <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
                          {dim.questionLabel}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {dim.options.map((opt) => {
                            const isSelected = selectedVal === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  handleUpdateUserThreadCell(
                                    uMeta.userTypeId,
                                    dim.id,
                                    opt.id
                                  )
                                }
                                className={`px-2.5 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                                  isSelected
                                    ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
                                    : 'border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-700'
                                }`}
                              >
                                <span className="text-[11px] leading-tight">
                                  {opt.shortLabel}
                                </span>
                                <span
                                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                                    isSelected
                                      ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                      : 'border-zinc-300 dark:border-zinc-600'
                                  }`}
                                >
                                  {isSelected && <CheckCircle2 className="w-2.5 h-2.5" />}
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
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * 2. Stage 3 (HOW): Side-by-Side Connected Application Integration Breakdown inside P13
   */
  const renderConnectedAppIntegrationThreads = () => {
    const p13Val = String(sar.answers['P13']?.value || '');
    if (!p13Val || p13Val === 'no' || connectedFlowEntries.length === 0) return null;

    const count = connectedFlowEntries.length;
    const gridClass =
      count === 1
        ? 'grid-cols-1 max-w-xl'
        : count === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : count === 3
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

    return (
      <div className="mt-5 pt-5 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-zinc-800 dark:text-zinc-200">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>
              CONNECTED APPLICATION INTEGRATION BREAKDOWN: {primaryAppName.toUpperCase()} ↔ ({count} SYSTEM{count > 1 ? 'S' : ''})
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Specify how {primaryAppName} connects to each interacting application side by side (automatically syncs P14 &amp; P15 below).
          </p>
        </div>

        <div className={`grid gap-4 ${gridClass}`}>
          {connectedFlowEntries.map((appMeta) => (
            <div
              key={appMeta.appId}
              className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 flex flex-col space-y-4"
            >
              <div className="pb-3 border-b border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                    {appMeta.badge}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white mt-0.5 leading-snug">
                    {primaryAppName} ↔ {appMeta.shortLabel}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0 mt-0.5" />
              </div>

              <div className="space-y-4">
                {CONNECTED_APP_FLOW_FIELDS.map((field) => {
                  const selectedVal = appMeta[field.key];
                  return (
                    <div key={field.key} className="space-y-2">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
                        {field.label}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {field.options.map((opt) => {
                          const isSelected = selectedVal === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                handleUpdateConnectedFlowCell(
                                  appMeta.appId,
                                  field.key,
                                  opt.id
                                )
                              }
                              className={`px-2.5 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
                                  : 'border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-700'
                              }`}
                            >
                              <span className="text-[11px] leading-tight">
                                {opt.shortLabel}
                              </span>
                              <span
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                                  isSelected
                                    ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                    : 'border-zinc-300 dark:border-zinc-600'
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-2.5 h-2.5" />}
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
          ))}
        </div>
      </div>
    );
  };

  /**
   * 3. Stage 4 (WHERE): Side-by-Side Per-Application Hosting Breakdown inside P5
   * Eliminates ambiguity when 2-3 applications interact or multiple hosting models are chosen.
   */
  const renderApplicationHostingThreads = () => {
    const p5Selected = Array.isArray(sar.answers['P5']?.value)
      ? (sar.answers['P5'].value as string[])
      : typeof sar.answers['P5']?.value === 'string' && sar.answers['P5'].value
      ? [sar.answers['P5'].value as string]
      : [];

    const shouldRenderBreakdown =
      hostingThreadEntries.length > 1 ||
      p5Selected.length > 1 ||
      p5Selected.includes('hybrid');

    if (!shouldRenderBreakdown) return null;

    const count = hostingThreadEntries.length;
    const gridClass =
      count === 1
        ? 'grid-cols-1 max-w-xl'
        : count === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : count === 3
        ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

    return (
      <div className="mt-5 pt-5 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold text-zinc-800 dark:text-zinc-200">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>
              PER-APPLICATION HOSTING &amp; ZONE BREAKDOWN ({count} APPLICATION{count > 1 ? 'S' : ''} IN SCOPE)
            </span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Clarify exactly where the Primary Application ({primaryAppName}) and each connected application run side by side.
          </p>
        </div>

        <div className={`grid gap-4 ${gridClass}`}>
          {hostingThreadEntries.map((appMeta) => (
            <div
              key={appMeta.unitId}
              className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 flex flex-col space-y-4"
            >
              <div className="pb-3 border-b border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                    {appMeta.badge}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white mt-0.5 leading-snug">
                    {appMeta.unitLabel}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-zinc-100 shrink-0 mt-0.5" />
              </div>

              <div className="space-y-4">
                {APPLICATION_HOSTING_FIELDS.map((field) => {
                  const selectedVal = appMeta[field.key];
                  return (
                    <div key={field.key} className="space-y-2">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
                        {field.label}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {field.options.map((opt) => {
                          const isSelected = selectedVal === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                handleUpdateHostingThreadCell(
                                  appMeta.unitId,
                                  field.key,
                                  opt.id
                                )
                              }
                              className={`px-2.5 py-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800 font-semibold text-zinc-950 dark:text-white'
                                  : 'border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-700'
                              }`}
                            >
                              <span className="text-[11px] leading-tight">
                                {opt.shortLabel}
                              </span>
                              <span
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                                  isSelected
                                    ? 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                                    : 'border-zinc-300 dark:border-zinc-600'
                                }`}
                              >
                                {isSelected && <CheckCircle2 className="w-2.5 h-2.5" />}
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
          ))}
        </div>
      </div>
    );
  };

  const renderQuestionInput = (q: QuestionDefinition) => {
    const ans = sar.answers[q.id];
    const currentVal = ans?.value;

    // 1. Single Select / Yes-No / Yes-No-Not-Sure with options (Option labels only, no sub-points)
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
                onClick={() => handleSmartAnswerQuestion(q.id, opt.id)}
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

    // 2. Boolean Yes/No without explicit options array
    if (q.answerType === 'yes_no' || q.answerType === 'yes_no_not_sure') {
      const fallbackOpts = [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
        ...(q.answerType === 'yes_no_not_sure' ? [{ id: 'not_sure', label: 'Not sure' }] : []),
      ];
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 sm:max-w-lg">
          {fallbackOpts.map((opt) => {
            const isSelected = currentVal === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSmartAnswerQuestion(q.id, opt.id)}
                className={`sar-glass-option px-3.5 py-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800/90'
                    : 'border-zinc-200/90 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
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

    // 3. Multi-Select (Option labels only, no sub-points)
    if (q.answerType === 'multi_select' && q.options) {
      const selectedArr: string[] = Array.isArray(currentVal)
        ? (currentVal as string[])
        : typeof currentVal === 'string' && currentVal
        ? [currentVal]
        : [];

      const toggleOption = (optId: string, exclusive?: boolean) => {
        if (exclusive || optId === 'none' || optId === 'none_headless' || optId === 'not_decided') {
          handleSmartAnswerQuestion(q.id, [optId]);
          return;
        }
        const exclusiveIds = new Set(
          q.options
            ?.filter(
              (o) =>
                o.exclusive ||
                o.id === 'none' ||
                o.id === 'none_headless' ||
                o.id === 'not_decided'
            )
            .map((o) => o.id) || []
        );
        const filtered = selectedArr.filter((id) => !exclusiveIds.has(id));
        const exists = filtered.includes(optId);
        const next = exists ? filtered.filter((id) => id !== optId) : [...filtered, optId];
        handleSmartAnswerQuestion(q.id, next);

        // If updating P8 with human users, auto-sync default platforms/networks into P9 and P10
        if (q.id === 'P8' && next.length > 0) {
          const tempAnswers: Record<string, AnswerEntry> = {
            ...sar.answers,
            P8: {
              questionId: 'P8',
              value: next,
              state: 'active',
              updatedBy: sar.updatedBy,
              updatedAt: new Date().toISOString(),
              history: [],
            },
          };
          const resolved = resolveActiveUserThreads(tempAnswers);
          syncDownstreamFromThreadMatrix(resolved.matrix);
        }
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

    // 4. Text fallback
    return (
      <div className="mt-3">
        <input
          type="text"
          value={typeof currentVal === 'string' ? currentVal : ''}
          placeholder={q.hint || 'Enter details...'}
          onChange={(e) => handleSmartAnswerQuestion(q.id, e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 outline-none transition-all"
        />
      </div>
    );
  };

  const firstDetailedModuleCode = activeChecklistModules[0]?.code || 'M1';

  // Dynamically expand container width when side-by-side threads are active in Stage 2 (WHO), Stage 3 (HOW), or Stage 4 (WHERE)
  const p13Val = String(sar.answers['P13']?.value || '');
  const activeSideBySideCount =
    normalizedStage === 2
      ? activeUserTypes.length
      : normalizedStage === 3 && p13Val && p13Val !== 'no'
      ? connectedFlowEntries.length
      : normalizedStage === 4
      ? hostingThreadEntries.length
      : 0;

  const isExpandedForSideBySide = activeSideBySideCount >= 2;
  const containerWidthClass =
    activeSideBySideCount >= 4
      ? 'max-w-[1440px]'
      : isExpandedForSideBySide
      ? 'max-w-7xl'
      : 'max-w-5xl';

  return (
    <div className={`${containerWidthClass} mx-auto px-4 sm:px-6 xl:pl-14 py-6 transition-all`}>
      {/* Phase 2 Header */}
      <div
        id="sec-prelim-origin"
        className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">
            <CyberKickerTrace />
            <span>PHASE 2 OF 5</span>
            <span>•</span>
            <span>PRELIMINARY CHECKLIST</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Preliminary Discovery
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Start with WHAT is changing, then confirm WHO accesses it, HOW systems connect, and WHERE each application runs.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 tabular-nums">
            {totalAnsweredCount}/{allVisiblePrelimQuestions.length}
          </span>
          <button
            type="button"
            onClick={() => onOpenDetailedModule(firstDetailedModuleCode)}
            className="sar-glass-primary-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <span>Open Checklist ({activeChecklistModules.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Application Architecture Scope Bar — Clarifies Primary Solution vs Connected Applications */}
      <div className="mb-5 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold">
            Primary Solution Under SAR
          </span>
          <span className="font-semibold text-zinc-900 dark:text-white">
            {primaryAppName}
          </span>
        </div>

        {connectedAppNames.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Connected Systems ({connectedAppNames.length}):
            </span>
            {connectedAppNames.map((app) => (
              <span
                key={app}
                className="px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
              >
                {app}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Standalone application scope (add connected systems in Request Basics if applicable)
          </span>
        )}
      </div>

      {/* Scope Change Banner */}
      {scopeChangeNotice &&
        (scopeChangeNotice.added.length > 0 || scopeChangeNotice.removed.length > 0) && (
          <div className="mb-5 sar-glass-card rounded-xl border border-zinc-300 dark:border-zinc-700 p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-zinc-950 dark:text-white">
                Checklist Scope Updated:{' '}
              </span>
              {scopeChangeNotice.added.length > 0 && (
                <span>Unlocked {scopeChangeNotice.added.join(', ')}. </span>
              )}
              {scopeChangeNotice.removed.length > 0 && (
                <span>Scoped out {scopeChangeNotice.removed.join(', ')}.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onUndoScopeChange && (
                <button
                  type="button"
                  onClick={onUndoScopeChange}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
              {onDismissScopeNotice && (
                <button
                  type="button"
                  onClick={onDismissScopeNotice}
                  className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

      {/* Main Responsive Grid: Left Stage Selector + Right Active Questions */}
      <div id="sec-prelim-stage" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Stage Selector */}
        <aside
          className={`${
            isExpandedForSideBySide ? 'lg:col-span-3 xl:col-span-2' : 'lg:col-span-3'
          } lg:sticky lg:top-20 space-y-2`}
        >
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
              Discovery Stages
            </span>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
              {normalizedStage}/{STAGE_BUCKETS.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-1 gap-2">
            {STAGE_BUCKETS.map((bucket) => {
              const qs = stageQuestionsMap[bucket.stageNumber] || [];
              const answered = qs.filter((q) => isQuestionAnswered(sar.answers[q.id])).length;
              const isSelected = normalizedStage === bucket.stageNumber;
              const isDone = qs.length > 0 && answered === qs.length;

              return (
                <button
                  key={bucket.stageNumber}
                  type="button"
                  onClick={() => onChangeStage(bucket.stageNumber)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950 text-white dark:border-white dark:ring-white dark:bg-white dark:text-zinc-950 shadow-2xs'
                      : 'sar-glass-card border-zinc-200/90 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-white/15 text-white dark:bg-zinc-900/15 dark:text-zinc-950 font-semibold'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {bucket.stageLabel} · {bucket.shortLabel}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-semibold flex items-center gap-1 tabular-nums ${
                        isSelected
                          ? 'text-zinc-200 dark:text-zinc-700'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {answered}/{qs.length}
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    </span>
                  </div>
                  <div
                    className={`text-xs font-semibold leading-snug ${
                      isSelected ? 'text-white dark:text-zinc-950' : 'text-zinc-900 dark:text-white'
                    }`}
                  >
                    {bucket.title}
                  </div>
                  <p
                    className={`hidden lg:block text-[11px] mt-0.5 leading-relaxed ${
                      isSelected
                        ? 'text-zinc-300 dark:text-zinc-600'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {bucket.subtitle}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active User Threads Summary in Sidebar */}
          {activeUserTypes.length > 0 && (
            <div className="hidden lg:block sar-glass-card rounded-xl border border-zinc-200/90 dark:border-zinc-800 p-3 mt-3">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  <span>Active User Threads</span>
                </span>
                <span>{activeUserTypes.length}</span>
              </div>
              <div className="space-y-1.5">
                {activeUserTypes.map((u) => {
                  const row = threadMatrix[u.userTypeId] || u.defaultValues;
                  return (
                    <div
                      key={u.userTypeId}
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-[11px]"
                    >
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {u.shortLabel}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {getShortOptionLabel('platform', row.platform)} ·{' '}
                        {getShortOptionLabel('networkHow', row.networkHow)} ·{' '}
                        {getShortOptionLabel('authMechanism', row.authMechanism)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Right Question Stream */}
        <motion.div
          key={normalizedStage}
          id="sec-prelim-rules"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className={`${
            isExpandedForSideBySide ? 'lg:col-span-9 xl:col-span-10' : 'lg:col-span-9'
          } space-y-4`}
        >
          {currentStageQuestions.map((q, idx) => {
            const ans = sar.answers[q.id];
            const answered = isQuestionAnswered(ans);
            const chainMeta = PRELIMINARY_CHAIN_MAP[q.id];
            const isWhyOpen = hoveredWhyId === q.id;
            const crispWhy = getCrispWhyText(q.whyWeAsk, chainMeta?.unlocksNextText);
            const contextualTitle = getContextualQuestionTitle(
              q,
              primaryAppName,
              connectedAppNames
            );
            const contextualHint = getContextualQuestionHint(
              q,
              primaryAppName,
              connectedAppNames
            );

            return (
              <div
                key={q.id}
                id={`prelim-q-${q.id}`}
                data-scroll-card="true"
                data-scroll-label={`${q.code} · Question ${idx + 1}`}
                className="sar-glass-card rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 sm:p-5 transition-all"
              >
                {/* Clean Top Row — Simple Question Number + Short Hovering Why We Ask */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-[10px] font-mono font-bold tabular-nums">
                      Question {idx + 1} of {currentStageQuestions.length}
                    </span>
                    {q.required && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Required
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {(q.whyWeAsk || chainMeta) && (
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

                {/* Contextual Question Title & Hint */}
                <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white leading-snug">
                  {contextualTitle}
                </h3>
                {contextualHint && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                    {contextualHint}
                  </p>
                )}

                {/* Interactive Answer Controls */}
                {renderQuestionInput(q)}

                {/* Stage 2 (WHO): Side-by-Side User × Platform Threads inside P8 */}
                {q.id === 'P8' && renderUserPlatformThreads()}

                {/* Stage 3 (HOW): Side-by-Side Connected Application Integration Threads inside P13 */}
                {q.id === 'P13' && renderConnectedAppIntegrationThreads()}

                {/* Stage 4 (WHERE): Side-by-Side Per-Application Hosting Breakdown inside P5 */}
                {q.id === 'P5' && renderApplicationHostingThreads()}
              </div>
            );
          })}

          {/* Stage Footer Navigation */}
          <div
            id="sec-prelim-next"
            className="sar-glass-card rounded-2xl border border-zinc-200/90 dark:border-zinc-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
              Stage {normalizedStage}/{STAGE_BUCKETS.length} ·{' '}
              {
                currentStageQuestions.filter((q) => isQuestionAnswered(sar.answers[q.id]))
                  .length
              }
              /{currentStageQuestions.length} Answered
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {normalizedStage > 1 ? (
                <button
                  type="button"
                  onClick={() => onChangeStage(normalizedStage - 1)}
                  className="sar-glass-btn px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  Previous Stage
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenDetailedModule('M0')}
                  className="sar-glass-btn px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  Back to Request Basics
                </button>
              )}

              {normalizedStage < STAGE_BUCKETS.length ? (
                <button
                  type="button"
                  onClick={() => onChangeStage(normalizedStage + 1)}
                  className="sar-glass-primary-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <span>
                    Next: {STAGE_BUCKETS[normalizedStage]?.shortLabel || 'Next Stage'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenDetailedModule(firstDetailedModuleCode)}
                  className="sar-glass-primary-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <span>Continue to Checklist ({activeChecklistModules.length})</span>
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
