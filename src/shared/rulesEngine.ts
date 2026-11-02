import { DEFAULT_DEFINITION_VERSION } from './definitions';
import { evaluateSarV5, mapWizardAnswersToSarV5Input } from './sarV5Engine';
import {
  AnswerEntry,
  ApiEndpointRow,
  ConditionNode,
  ContradictionWarning,
  DefinitionVersion,
  DerivedFlagId,
  EvaluationResult,
  FirewallRuleRow,
  IntegrationRow,
  ModuleCode,
  ModuleDefinition,
  OpenItemEntry,
  QuestionDefinition,
  RepeaterTablesData,
  RowValidationIssue,
  SARRecord,
  ScenarioTestCase,
  ServerRow,
  UnlockedModuleInfo,
} from './types';

interface DefinitionIndex {
  questionById: Map<string, QuestionDefinition>;
  moduleByCode: Map<ModuleCode, ModuleDefinition>;
  prelimQuestions: QuestionDefinition[];
  prelimIds: Set<string>;
  questionsByStage: Map<number, QuestionDefinition[]>;
  questionsByModule: Map<ModuleCode, QuestionDefinition[]>;
}

const definitionIndexCache = new WeakMap<DefinitionVersion, DefinitionIndex>();

function getDefinitionIndex(definition: DefinitionVersion): DefinitionIndex {
  const cached = definitionIndexCache.get(definition);
  if (cached) return cached;

  const questionById = new Map<string, QuestionDefinition>();
  const moduleByCode = new Map<ModuleCode, ModuleDefinition>();
  const prelimQuestions: QuestionDefinition[] = [];
  const prelimIds = new Set<string>();
  const questionsByStage = new Map<number, QuestionDefinition[]>();
  const questionsByModule = new Map<ModuleCode, QuestionDefinition[]>();

  for (const m of definition.modules) {
    moduleByCode.set(m.code, m);
    questionsByModule.set(m.code, []);
  }

  for (const q of definition.questions) {
    questionById.set(q.id, q);
    if (q.stage !== undefined) {
      prelimQuestions.push(q);
      prelimIds.add(q.id);
      const stList = questionsByStage.get(q.stage) || [];
      stList.push(q);
      questionsByStage.set(q.stage, stList);
    } else {
      const modList = questionsByModule.get(q.moduleId) || [];
      modList.push(q);
      questionsByModule.set(q.moduleId, modList);
    }
  }

  const index: DefinitionIndex = {
    questionById,
    moduleByCode,
    prelimQuestions,
    prelimIds,
    questionsByStage,
    questionsByModule,
  };
  definitionIndexCache.set(definition, index);
  return index;
}

// ============================================================================
// IP, CIDR & PORT VALIDATION UTILITIES
// ============================================================================

export function isValidIPv4OrCIDR(input: string): boolean {
  const trimmed = input.trim().replace(/\s*\(.*\)$/, '').trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase() === 'any') return true;
  const parts = trimmed.split('/');
  if (parts.length > 2) return false;
  const ip = parts[0];
  const octets = ip.split('.');
  if (octets.length !== 4) return false;
  for (const octet of octets) {
    if (!/^\d+$/.test(octet)) return false;
    const num = Number(octet);
    if (num < 0 || num > 255) return false;
  }
  if (parts.length === 2) {
    if (!/^\d+$/.test(parts[1])) return false;
    const mask = Number(parts[1]);
    if (mask < 0 || mask > 32) return false;
  }
  return true;
}

export function isPrivateIPv4(input: string): boolean {
  const cleaned = input.trim().replace(/\s*\(.*\)$/, '').trim();
  const trimmed = cleaned.split('/')[0];
  const octets = trimmed.split('.').map(Number);
  if (octets.length !== 4 || octets.some(isNaN)) return false;
  if (octets[0] === 10) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;
  if (octets[0] === 127) return true;
  return false;
}

export function isAnyCidr(input: string): boolean {
  const t = input.trim().replace(/\s*\(.*\)$/, '').trim().toLowerCase();
  return t === '0.0.0.0/0' || t === 'any' || t === '*';
}

export function isValidPortOrRange(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const segments = trimmed.split(',').map((s) => s.trim());
  for (const seg of segments) {
    if (seg.includes('-')) {
      const [startStr, endStr] = seg.split('-').map((s) => s.trim());
      if (!/^\d+$/.test(startStr) || !/^\d+$/.test(endStr)) return false;
      const start = Number(startStr);
      const end = Number(endStr);
      if (start < 1 || end > 65535 || start > end) return false;
    } else {
      if (!/^\d+$/.test(seg)) return false;
      const p = Number(seg);
      if (p < 1 || p > 65535) return false;
    }
  }
  return true;
}

export function validateServerRow(row: ServerRow, allRows: ServerRow[], internetFacing: boolean): RowValidationIssue[] {
  const issues: RowValidationIssue[] = [];
  if (!row.hostname.trim()) {
    issues.push({ field: 'hostname', severity: 'error', message: 'Hostname is required.' });
  }
  if (!isValidIPv4OrCIDR(row.ip)) {
    issues.push({ field: 'ip', severity: 'error', message: 'Invalid IPv4 or CIDR format (e.g. 10.42.10.15).' });
  } else {
    if (!isPrivateIPv4(row.ip) && !internetFacing) {
      issues.push({
        field: 'ip',
        severity: 'warning',
        message: 'Public IP address entered, but request declared no Internet exposure in P10.',
      });
    }
    const duplicate = allRows.find(
      (r) => r.id !== row.id && r.ip.trim() === row.ip.trim() && r.environment === row.environment
    );
    if (duplicate) {
      issues.push({
        field: 'ip',
        severity: 'warning',
        message: `Duplicate IP ${row.ip} in ${row.environment} environment (matches ${duplicate.hostname}).`,
      });
    }
  }
  return issues;
}

export function validateFirewallRuleRow(
  row: FirewallRuleRow,
  allRows: FirewallRuleRow[],
  internetFacing: boolean
): RowValidationIssue[] {
  const issues: RowValidationIssue[] = [];
  if (!isValidIPv4OrCIDR(row.source)) {
    issues.push({ field: 'source', severity: 'error', message: 'Malformed source IP or CIDR.' });
  }
  if (!isValidIPv4OrCIDR(row.destination)) {
    issues.push({ field: 'destination', severity: 'error', message: 'Malformed destination IP or CIDR.' });
  }
  if (isAnyCidr(row.source) && isAnyCidr(row.destination)) {
    issues.push({
      field: 'source',
      severity: 'warning',
      message: 'Unrestricted "any-to-any" (0.0.0.0/0 -> 0.0.0.0/0) firewall rule flagged for SAR analyst review.',
    });
  } else if (isAnyCidr(row.destination) && row.direction === 'Outbound') {
    issues.push({
      field: 'destination',
      severity: 'warning',
      message: 'Unrestricted outbound 0.0.0.0/0 destination; prefer specific partner CIDR or FQDN proxy.',
    });
  }
  if (!internetFacing && (isValidIPv4OrCIDR(row.destination) && !isPrivateIPv4(row.destination) && !isAnyCidr(row.destination))) {
    issues.push({
      field: 'destination',
      severity: 'warning',
      message: 'Public destination IP specified while preliminary answers indicate internal-only network scope.',
    });
  }
  if (!isValidPortOrRange(row.port)) {
    issues.push({ field: 'port', severity: 'error', message: 'Port must be between 1 and 65535 (or a valid range like 8000-8080).' });
  } else {
    const portNum = Number(row.port.trim());
    if (row.protocol === 'SFTP' && portNum !== 22 && portNum !== 2222) {
      issues.push({
        field: 'port',
        severity: 'warning',
        message: `Protocol-port mismatch: SFTP typically uses TCP port 22 (found ${row.port}).`,
      });
    }
    if (row.protocol === 'HTTPS' && portNum === 80) {
      issues.push({
        field: 'port',
        severity: 'warning',
        message: 'Protocol-port mismatch: HTTPS selected on plaintext port 80.',
      });
    }
    if (row.protocol === 'SSH' && portNum !== 22) {
      issues.push({
        field: 'port',
        severity: 'warning',
        message: `Protocol-port mismatch: SSH on non-standard port ${row.port}.`,
      });
    }
  }
  const dup = allRows.find(
    (r) =>
      r.id !== row.id &&
      r.source.trim() === row.source.trim() &&
      r.destination.trim() === row.destination.trim() &&
      r.port.trim() === row.port.trim() &&
      r.protocol === row.protocol &&
      r.environment === row.environment
  );
  if (dup) {
    issues.push({
      field: 'port',
      severity: 'warning',
      message: 'Duplicate firewall rule detected for the same source, destination, port, and environment.',
    });
  }
  return issues;
}

export function validateApiEndpointRow(row: ApiEndpointRow): RowValidationIssue[] {
  const issues: RowValidationIssue[] = [];
  if (!row.name.trim() || !row.name.trim().startsWith('/')) {
    issues.push({
      field: 'name',
      severity: 'warning',
      message: 'Endpoint path should start with "/" (e.g., /api/v1/payments/initiate).',
    });
  }
  if (
    row.authType === 'None (Public)' &&
    (row.dataClassification === 'Confidential' || row.dataClassification === 'Sensitive')
  ) {
    issues.push({
      field: 'authType',
      severity: 'warning',
      message: `${row.dataClassification} data endpoint has "None (Public)" authentication selected.`,
    });
  }
  if (row.exposure === 'Direct Internet' && row.authType === 'Basic Auth') {
    issues.push({
      field: 'exposure',
      severity: 'warning',
      message: 'Direct internet endpoint using Basic Auth; bank standard requires API Gateway + OAuth2/mTLS.',
    });
  }
  return issues;
}

export function validateIntegrationRow(row: IntegrationRow): RowValidationIssue[] {
  const issues: RowValidationIssue[] = [];
  if (!row.counterparty.trim()) {
    issues.push({ field: 'counterparty', severity: 'error', message: 'Counterparty / system name is required.' });
  }
  return issues;
}

// ============================================================================
// CONDITION EVALUATOR (Fixed Deterministic Interpreter — No eval, Fail-Open)
// ============================================================================

function getRawAnswerValue(
  answers: Record<string, AnswerEntry | unknown>,
  questionId: string
): unknown {
  const entry = answers[questionId];
  if (entry === undefined || entry === null) return undefined;
  if (typeof entry === 'object' && entry !== null && 'value' in entry) {
    const typed = entry as AnswerEntry;
    if (typed.state === 'inactive') return undefined;
    return typed.value;
  }
  return entry;
}

function getStoredAnswerValue(
  answers: Record<string, AnswerEntry | unknown>,
  questionId: string
): unknown {
  const entry = answers[questionId];
  if (entry === undefined || entry === null) return undefined;
  if (typeof entry === 'object' && entry !== null && 'value' in entry) {
    return (entry as AnswerEntry).value;
  }
  return entry;
}

export function evaluateCondition(
  node: ConditionNode | undefined,
  answers: Record<string, AnswerEntry | unknown>,
  facts: Record<string, string[]>,
  flags: Record<DerivedFlagId, boolean>
): boolean {
  if (!node) return true;
  try {
    if (node.kind === 'all') {
      return node.conditions.every((c) => evaluateCondition(c, answers, facts, flags));
    }
    if (node.kind === 'any') {
      return node.conditions.some((c) => evaluateCondition(c, answers, facts, flags));
    }
    if (node.kind === 'not') {
      return !node.conditions.every((c) => evaluateCondition(c, answers, facts, flags));
    }
    if (node.kind !== 'leaf') {
      return true;
    }

    // Leaf condition
    let targetVal: unknown;
    if (node.source === 'answer') {
      targetVal = getRawAnswerValue(answers, node.key);
    } else if (node.source === 'fact') {
      targetVal = facts[node.key] || [];
    } else if (node.source === 'flag') {
      targetVal = flags[node.key as DerivedFlagId] ?? false;
    }

    const op = node.operator;
    const expected = node.value;

    // Fail-open handling if user explicitly answered 'not_sure'
    if (targetVal === 'not_sure' && op !== 'equals' && op !== 'notEquals') {
      return true;
    }

    switch (op) {
      case 'isAnswered': {
        if (targetVal === undefined || targetVal === null || targetVal === '') return false;
        if (Array.isArray(targetVal)) return targetVal.length > 0 && !targetVal.includes('none');
        return true;
      }
      case 'isUnknown': {
        return targetVal === undefined || targetVal === null || targetVal === '' || targetVal === 'not_sure';
      }
      case 'equals': {
        if (Array.isArray(targetVal)) return targetVal.includes(expected as string);
        return targetVal === expected;
      }
      case 'notEquals': {
        if (targetVal === undefined || targetVal === null) return true;
        if (Array.isArray(targetVal)) return !targetVal.includes(expected as string);
        return targetVal !== expected;
      }
      case 'in': {
        const list = Array.isArray(expected) ? expected : [expected];
        if (Array.isArray(targetVal)) {
          return targetVal.some((v) => list.includes(v));
        }
        return list.includes(targetVal);
      }
      case 'containsAny': {
        const list = Array.isArray(expected) ? expected : [expected];
        const actualArr = Array.isArray(targetVal)
          ? targetVal
          : targetVal !== undefined && targetVal !== null
          ? [targetVal]
          : [];
        return actualArr.some((v) => list.includes(v));
      }
      case 'containsAll': {
        const list = Array.isArray(expected) ? expected : [expected];
        const actualArr = Array.isArray(targetVal)
          ? targetVal
          : targetVal !== undefined && targetVal !== null
          ? [targetVal]
          : [];
        return list.every((v) => actualArr.includes(v));
      }
      case 'greaterThan': {
        return Number(targetVal) > Number(expected);
      }
      default:
        return true; // Fail open
    }
  } catch {
    // Design Principle #2: Fail open, never silently hide a security question on error
    return true;
  }
}

// ============================================================================
// MAIN EVALUATION PIPELINE (Section 6.1 Steps 1 to 7 + Granular Question Wiring)
// ============================================================================

const MODULE_ORDER: ModuleCode[] = [
  'M0',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'M6',
  'M7',
  'M8',
  'M9',
  'M10',
  'M11',
  'M12',
  'M13',
  'M14',
  'M15',
  'M16',
  'M17',
];

export function evaluateSAR(
  answersInput: Record<string, AnswerEntry | unknown>,
  tables?: RepeaterTablesData,
  manualCategories?: { added: string[]; removed: string[]; fullReviewRequested: boolean },
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): EvaluationResult {
  const facts: Record<string, string[]> = {};
  const addFact = (dim: string, val: string | string[] | boolean) => {
    const strVals = Array.isArray(val) ? val.map(String) : [String(val)];
    if (!facts[dim]) facts[dim] = [];
    for (const s of strVals) {
      if (!facts[dim].includes(s)) {
        facts[dim].push(s);
      }
    }
  };

  // Initialize derived flags (16 baseline flags + 7 SAR Checklist v5 canonical flags)
  const flags: Record<DerivedFlagId, boolean> = {
    internet_facing: false,
    external_party_involved: false,
    new_trust_boundary_crossing: false,
    external_file_transfer: false,
    pii_or_pci_in_scope: false,
    customer_facing_with_sensitive_data: false,
    non_human_identity_present: false,
    cloud_hosted: false,
    on_prem_hosted: false,
    hybrid: false,
    scope_narrowed: false,
    outside_india_data: false,
    unknown_count_high: false,
    vendor_involved: false,
    api_exposed: false,
    external_ai_present: false,
    public_facing: false,
    sensitive_data_v5: false,
    data_migration_v5: false,
    third_party_access_v5: false,
    portal_access_v5: false,
    file_transfer_v5: false,
    pattern_started: false,
  };

  // Track module unlock reasons & granular question unlock / requirement reasons
  const moduleReasonsMap = new Map<ModuleCode, Set<string>>();
  const triggerModule = (code: ModuleCode, reason: string) => {
    if (!moduleReasonsMap.has(code)) {
      moduleReasonsMap.set(code, new Set());
    }
    moduleReasonsMap.get(code)!.add(reason);
  };

  const questionReasonsMap = new Map<string, Set<string>>();
  const triggerQuestion = (qId: string, reason: string) => {
    if (!questionReasonsMap.has(qId)) {
      questionReasonsMap.set(qId, new Set());
    }
    questionReasonsMap.get(qId)!.add(reason);
  };

  const ruleRequiredQuestionMap = new Map<string, string>();

  // Always include M0 and M17
  triggerModule('M0', 'Always required: project context, ownership, and connected applications.');
  triggerModule('M17', 'Always included: supporting architecture and data-flow diagrams.');

  // Step 1: Collect facts, module triggers, and question triggers from Preliminary Answers
  // Resolve visibility in topological order into `effectiveAnswers` so any re-unlocked child/grandchild
  // question immediately restores its stored answer in a single pass while hidden questions are excluded.
  let unknownCount = 0;
  const effectiveAnswers: Record<string, unknown> = {};
  const defIndex = getDefinitionIndex(definition);
  const { prelimQuestions, prelimIds, questionById, moduleByCode, questionsByModule } = defIndex;

  for (const key of Object.keys(answersInput)) {
    if (!prelimIds.has(key) && !key.includes('_Q')) {
      const directVal = getStoredAnswerValue(answersInput, key);
      if (directVal !== undefined) {
        effectiveAnswers[key] = directVal;
      }
    }
  }

  for (const q of prelimQuestions) {
    const isVisible = evaluateCondition(q.showOnlyIf, effectiveAnswers, facts, flags);
    if (!isVisible) continue;

    const val = getStoredAnswerValue(answersInput, q.id);
    if (val === undefined || val === null || val === '') continue;

    effectiveAnswers[q.id] = val;

    if (val === 'not_sure') {
      unknownCount++;
    }

    const selectedIds = Array.isArray(val) ? val.map(String) : [String(val)];
    if (selectedIds.includes('not_sure') || selectedIds.includes('not_decided')) {
      unknownCount++;
    }

    if (q.options) {
      for (const opt of q.options) {
        if (selectedIds.includes(opt.id)) {
          if (opt.setsFacts) {
            for (const [fKey, fVal] of Object.entries(opt.setsFacts)) {
              addFact(fKey, fVal);
            }
          }
          if (opt.triggersModules) {
            for (const mCode of opt.triggersModules) {
              triggerModule(mCode, `${q.code} (${q.text}) → "${opt.label}"`);
            }
          }
          if (opt.unlocksQuestions) {
            for (const targetQId of opt.unlocksQuestions) {
              triggerQuestion(targetQId, `${q.code}: "${opt.label}"`);
            }
          }
        }
      }
    }
  }

  // Also check repeater tables for facts (e.g. firewall rule to external IP sets new_trust_boundary_crossing)
  if (tables) {
    const hasPublicFirewallRule = tables.firewall_rules.some(
      (r) =>
        (isValidIPv4OrCIDR(r.destination) && !isPrivateIPv4(r.destination) && !isAnyCidr(r.destination)) ||
        (isValidIPv4OrCIDR(r.source) && !isPrivateIPv4(r.source) && !isAnyCidr(r.source))
    );
    if (hasPublicFirewallRule) {
      addFact('boundary_crossing', 'yes');
      triggerModule('M12', 'Firewall table includes a public/external IP address.');
      triggerQuestion('M12_Q1', 'Firewall table includes a public/external IP address.');
      triggerQuestion('M12_Q2', 'Firewall table includes an external destination.');
    }
    const hasExternalApi = tables.api_endpoints.some(
      (e) => e.exposure === 'API Gateway (External)' || e.exposure === 'Direct Internet' || e.exposure === 'Partner VPN'
    );
    if (hasExternalApi) {
      addFact('api_exposed', 'external');
      triggerModule('M5', 'API Endpoints table includes externally exposed endpoints.');
      triggerQuestion('M5_Q1', 'API Endpoints table includes externally exposed endpoints.');
      triggerQuestion('M5_Q2', 'API Endpoints table includes externally exposed endpoints.');
    }
  }

  // Step 2: Compute Derived Flags in DAG Dependency Order
  const p5 = effectiveAnswers['P5'];
  const p7 = effectiveAnswers['P7'];
  const p8 = (effectiveAnswers['P8'] as string[]) || [];
  const p10 = (effectiveAnswers['P10'] as string[]) || [];
  const p11 = (effectiveAnswers['P11'] as string[]) || [];
  const p13 = effectiveAnswers['P13'];
  const p14 = (effectiveAnswers['P14'] as string[]) || [];
  const p15 = effectiveAnswers['P15'];
  const p16 = effectiveAnswers['P16'];
  const p18 = effectiveAnswers['P18'];
  const p20 = effectiveAnswers['P20'];
  const p21 = (effectiveAnswers['P21'] as string[]) || [];
  const p24 = effectiveAnswers['P24'];
  const p26 = (effectiveAnswers['P26'] as string[]) || [];
  const p28 = effectiveAnswers['P28'];
  const p29 = effectiveAnswers['P29'];

  flags.on_prem_hosted = p5 === 'bank_dc' || p5 === 'hybrid' || p5 === 'not_decided';
  flags.cloud_hosted =
    p5 === 'bank_aws' || p5 === 'other_cloud' || p5 === 'vendor_saas' || p5 === 'hybrid' || p5 === 'not_decided';
  flags.hybrid = p5 === 'hybrid' || (flags.on_prem_hosted && flags.cloud_hosted && p5 !== 'not_decided');

  flags.internet_facing =
    (Array.isArray(p10) && p10.includes('internet')) ||
    (facts['internet_facing']?.includes('true') ?? false);

  flags.vendor_involved =
    (facts['vendor_involved']?.includes('true') ?? false) ||
    p5 === 'vendor_saas' ||
    p7 === 'vendor_builds_bank_runs' ||
    p7 === 'vendor_builds_and_runs' ||
    p18 === 'yes' ||
    p29 === 'yes';

  flags.external_party_involved =
    p13 === 'external_only' ||
    p13 === 'both' ||
    flags.vendor_involved ||
    (Array.isArray(p8) && p8.includes('partner_vendor_staff')) ||
    p28 === 'yes_third_party';

  flags.new_trust_boundary_crossing =
    p15 === 'yes' ||
    p15 === 'not_sure' ||
    flags.internet_facing ||
    (Array.isArray(p10) && p10.includes('partner_network')) ||
    (facts['boundary_crossing']?.includes('yes') ?? false);

  flags.external_file_transfer =
    Array.isArray(p14) && p14.includes('file_transfer') && flags.external_party_involved;

  flags.pii_or_pci_in_scope =
    (Array.isArray(p21) && (p21.includes('pii') || p21.includes('employee_data') || p21.includes('pci'))) ||
    (Array.isArray(p26) && p26.includes('pci_dss')) ||
    (facts['pii_or_pci']?.includes('true') ?? false);

  flags.customer_facing_with_sensitive_data =
    Array.isArray(p8) &&
    (p8.includes('customers') || p8.includes('corporates_bc')) &&
    (flags.pii_or_pci_in_scope || p20 === 'sensitive' || p20 === 'confidential');

  flags.non_human_identity_present =
    Array.isArray(p11) && p11.length > 0 && !p11.includes('none');

  flags.outside_india_data = p24 === 'yes' || p24 === 'not_sure';
  flags.api_exposed = p16 === 'yes_gateway' || p16 === 'yes_directly';
  flags.external_ai_present = p28 === 'yes_third_party' || p28 === 'not_sure';

  // Count 'not_sure' across detailed checklist answers (preliminary already counted above)
  for (const key of Object.keys(answersInput)) {
    if (prelimIds.has(key)) continue;
    const v = getStoredAnswerValue(answersInput, key);
    if (v === 'not_sure') unknownCount++;
  }
  flags.unknown_count_high = unknownCount >= 3;

  // Compute deterministic SAR Checklist v5 evaluation (Level 0 -> Level 4) and bind the 7 v5 flags
  const v5BridgeAnswers: Record<string, unknown> = { ...effectiveAnswers };
  if (flags.cloud_hosted) {
    const m11q3Val = getStoredAnswerValue(answersInput, 'M11_Q3');
    if (m11q3Val !== undefined) v5BridgeAnswers['M11_Q3'] = m11q3Val;
  }
  const v5InputState = mapWizardAnswersToSarV5Input(v5BridgeAnswers);
  const v5Evaluation = evaluateSarV5(v5InputState);
  flags.public_facing = v5Evaluation.flags.PublicFacing.value;
  flags.sensitive_data_v5 = v5Evaluation.flags.SensitiveData.value;
  flags.data_migration_v5 = v5Evaluation.flags.DataMigration.value;
  flags.third_party_access_v5 = v5Evaluation.flags.ThirdPartyAccess.value;
  flags.portal_access_v5 = v5Evaluation.flags.Portal.value;
  flags.file_transfer_v5 = v5Evaluation.flags.FileTransfer.value;
  flags.pattern_started = v5Evaluation.flags.PatternStarted.value;

  // Step 3: Evaluate declarative RuleDefinitions (including multi-path converged question rules)
  const detectedCategoriesMap = new Map<string, { label: string; reason: string; isPrimary: boolean; sourceQuestionIds: string[] }>();

  for (const rule of definition.rules) {
    if (evaluateCondition(rule.condition, effectiveAnswers, facts, flags)) {
      if (rule.includeModules) {
        for (const mCode of rule.includeModules) {
          triggerModule(mCode, rule.reasonTemplate);
        }
      }
      if (rule.setFlags) {
        for (const fl of rule.setFlags) {
          flags[fl] = true;
        }
      }
      if (rule.showQuestions) {
        for (const qId of rule.showQuestions) {
          triggerQuestion(qId, rule.reasonTemplate);
        }
      }
      if (rule.requireQuestions) {
        for (const qId of rule.requireQuestions) {
          if (!ruleRequiredQuestionMap.has(qId)) {
            ruleRequiredQuestionMap.set(qId, rule.reasonTemplate);
          }
        }
      }
      if (rule.categoryLabel) {
        detectedCategoriesMap.set(rule.id, {
          label: rule.categoryLabel,
          reason: rule.reasonTemplate,
          isPrimary: detectedCategoriesMap.size === 0,
          sourceQuestionIds: ['P1'],
        });
      }
    }
  }

  // Step 3b: Enhancement Scope Narrowing & Override Triggers (Section 6.4 — Highest-Risk Logic)
  const p1 = (effectiveAnswers['P1'] as string[]) || [];
  const p3 = effectiveAnswers['P3'];
  const p4 = (effectiveAnswers['P4'] as string[]) || [];
  const p12 = effectiveAnswers['P12'];
  const p25 = effectiveAnswers['P25'];
  const p27 = effectiveAnswers['P27'];

  const isPureEnhancement = Array.isArray(p1) && p1.length === 1 && p1[0] === 'enhancement';
  const isMinorChange = p3 === 'minor';

  const overrideTriggersFired: string[] = [];
  const suppressedByNarrowing: ModuleCode[] = [];

  if (isPureEnhancement && isMinorChange) {
    if (flags.pii_or_pci_in_scope) {
      overrideTriggersFired.push('Sensitive PII or PCI card data in scope (P21/P26)');
    }
    if (flags.external_party_involved || flags.new_trust_boundary_crossing) {
      overrideTriggersFired.push('External party or network trust boundary crossing detected (P10/P13/P15)');
    }
    if (p12 === 'yes' || (Array.isArray(p4) && p4.includes('login_access'))) {
      overrideTriggersFired.push('Change to authentication, login, or access control (P4/P12)');
    }
    if (flags.internet_facing) {
      overrideTriggersFired.push('Internet-facing exposure detected (P10)');
    }
    if (p25 === 'yes' || p27 === 'yes' || (Array.isArray(p4) && p4.includes('data_migration_comp'))) {
      overrideTriggersFired.push('New servers/databases (P27) or data migration (P4/P25) introduced');
    }
    if (flags.vendor_involved || (Array.isArray(p4) && p4.includes('third_party_connectivity'))) {
      overrideTriggersFired.push('Third-party vendor or SaaS component involved (P4/P5/P7/P18/P29)');
    }
    if ((p28 && p28 !== 'no') || (Array.isArray(p4) && p4.includes('ai_llm_comp'))) {
      overrideTriggersFired.push('New AI or LLM component introduced (P4/P28)');
    }

    if (overrideTriggersFired.length === 0 && !manualCategories?.fullReviewRequested) {
      flags.scope_narrowed = true;
      // Map P4 changed parts to allowed modules
      const p9 = (effectiveAnswers['P9'] as string[]) || [];
      const allowedByNarrowing = new Set<ModuleCode>(['M0', 'M1', 'M17']);
      if (
        p4.includes('ui') &&
        Array.isArray(p9) &&
        (p9.includes('mobile_app') || p9.includes('desktop_app') || p9.includes('kiosk'))
      ) {
        allowedByNarrowing.add('M14');
      }
      if (p4.includes('apis') || p4.includes('integrations') || p4.includes('third_party_connectivity')) {
        allowedByNarrowing.add('M5');
      }
      if (p4.includes('integrations')) {
        if (Array.isArray(p14) && p14.includes('file_transfer')) allowedByNarrowing.add('M6');
        if (Array.isArray(p14) && (p14.includes('queues_streams') || p14.includes('webhooks'))) {
          allowedByNarrowing.add('M7');
        }
      }
      if (p4.includes('third_party_connectivity')) {
        allowedByNarrowing.add('M8');
      }
      if (p4.includes('database') || p4.includes('reports') || p4.includes('data_migration_comp')) {
        allowedByNarrowing.add('M4');
      }
      if (p4.includes('data_migration_comp')) {
        allowedByNarrowing.add('M13');
      }
      if (p4.includes('file_transfer_comp')) {
        allowedByNarrowing.add('M6');
      }
      if (p4.includes('queues_streaming_comp')) {
        allowedByNarrowing.add('M7');
      }
      if (p4.includes('cloud_k8s_containers')) {
        allowedByNarrowing.add('M11');
        if (flags.on_prem_hosted) allowedByNarrowing.add('M10');
      }
      if (p4.includes('ai_llm_comp')) {
        allowedByNarrowing.add('M15');
      }
      if (p4.includes('login_access')) allowedByNarrowing.add('M2');
      if (p4.includes('servers_hosting')) {
        if (flags.on_prem_hosted) allowedByNarrowing.add('M10');
        if (flags.cloud_hosted) allowedByNarrowing.add('M11');
        allowedByNarrowing.add('M12');
      }
      if (p4.includes('data_flows')) {
        allowedByNarrowing.add('M3');
        allowedByNarrowing.add('M4');
      }
      if (p4.includes('other')) {
        allowedByNarrowing.add('M3');
      }

      for (const mCode of Array.from(moduleReasonsMap.keys())) {
        if (!allowedByNarrowing.has(mCode)) {
          moduleReasonsMap.delete(mCode);
          suppressedByNarrowing.push(mCode);
        }
      }
    } else {
      flags.scope_narrowed = false;
    }
  }

  // Apply manual category/module overrides from Category Confirmation screen
  if (manualCategories?.fullReviewRequested) {
    for (const mod of definition.modules) {
      triggerModule(mod.code, 'Full review explicitly requested by user on Category Confirmation screen.');
    }
  }
  if (manualCategories?.added) {
    for (const addedCode of manualCategories.added) {
      triggerModule(addedCode as ModuleCode, 'Manually added by requester during Category Confirmation.');
    }
  }
  if (manualCategories?.removed) {
    for (const remCode of manualCategories.removed) {
      if (remCode !== 'M0' && remCode !== 'M17') {
        moduleReasonsMap.delete(remCode as ModuleCode);
      }
    }
  }

  // Step 4: Resolve visible, required, and hard-required questions across active modules
  const activeModuleCodes = new Set(Array.from(moduleReasonsMap.keys()));
  const visibleQuestionIds: string[] = [];
  const requiredQuestionIds: string[] = [];
  const hardRequiredQuestionIds: string[] = [];
  const questionReasons: Record<string, string[]> = {};
  const questionRequirementReasons: Record<string, string> = {};
  const openItems: OpenItemEntry[] = [];
  const missingRequiredQuestionIds: string[] = [];

  for (const q of definition.questions) {
    if (q.stage !== undefined) {
      // Preliminary question (P1..P30)
      if (evaluateCondition(q.showOnlyIf, effectiveAnswers, facts, flags)) {
        visibleQuestionIds.push(q.id);
        const isReq =
          q.required ||
          (q.requireIf ? evaluateCondition(q.requireIf, effectiveAnswers, facts, flags) : false);
        if (isReq) {
          requiredQuestionIds.push(q.id);
        }
        if (q.showOnlyIfText) {
          questionReasons[q.id] = [q.showOnlyIfText];
        } else {
          questionReasons[q.id] = [`Stage ${q.stage} baseline discovery question`];
        }
        questionRequirementReasons[q.id] = isReq
          ? q.requireIfReason || 'Mandatory preliminary scope question'
          : 'Optional context note';
      }
    } else {
      // Detailed module question (M1..M16)
      if (!activeModuleCodes.has(q.moduleId)) continue;

      const isManuallyAddedModule = Boolean(manualCategories?.added?.includes(q.moduleId));
      const conditionPassed = evaluateCondition(q.showOnlyIf, effectiveAnswers, facts, flags);
      const explicitlyTriggered = questionReasonsMap.has(q.id);

      // A detailed question is visible if its showOnlyIf passes, or an option/rule explicitly unlocked it,
      // or the user requested a full review, or the user manually added the module and the question has no restrictive condition
      const isVisible =
        Boolean(manualCategories?.fullReviewRequested) ||
        conditionPassed ||
        explicitlyTriggered ||
        (isManuallyAddedModule && !q.showOnlyIf);

      if (!isVisible) continue;

      visibleQuestionIds.push(q.id);
      const dVal = getStoredAnswerValue(answersInput, q.id);
      if (dVal !== undefined && dVal !== null && dVal !== '') {
        effectiveAnswers[q.id] = dVal;
      }

      // Collect converged reasons for why this specific question was unlocked
      const reasonsSet = new Set<string>();
      if (questionReasonsMap.has(q.id)) {
        for (const r of questionReasonsMap.get(q.id)!) {
          reasonsSet.add(r);
        }
      }
      if (q.showOnlyIfText) {
        reasonsSet.add(q.showOnlyIfText);
      }
      if (reasonsSet.size === 0) {
        const modReasons = moduleReasonsMap.get(q.moduleId);
        if (modReasons && modReasons.size > 0) {
          reasonsSet.add(Array.from(modReasons)[0]);
        } else {
          reasonsSet.add(`Core question in Module ${q.moduleId}`);
        }
      }
      questionReasons[q.id] = Array.from(reasonsSet);

      // Evaluate dynamic requirement & hard-requirement status based on risk permutation
      const isHardReq =
        Boolean(q.hardRequired) ||
        (q.hardRequireIf ? evaluateCondition(q.hardRequireIf, effectiveAnswers, facts, flags) : false);

      const isReq =
        isHardReq ||
        Boolean(q.required) ||
        (q.requireIf ? evaluateCondition(q.requireIf, effectiveAnswers, facts, flags) : false) ||
        ruleRequiredQuestionMap.has(q.id);

      if (isHardReq) {
        hardRequiredQuestionIds.push(q.id);
      }
      if (isReq) {
        requiredQuestionIds.push(q.id);
      }

      if (isHardReq) {
        questionRequirementReasons[q.id] =
          q.hardRequireIfReason ||
          q.requireIfReason ||
          ruleRequiredQuestionMap.get(q.id) ||
          'Hard-Required: Must be answered (cannot remain "I don\'t know yet") before final submission.';
      } else if (isReq) {
        questionRequirementReasons[q.id] =
          q.requireIfReason ||
          ruleRequiredQuestionMap.get(q.id) ||
          'Mandatory control for your selected architecture permutation.';
      } else {
        questionRequirementReasons[q.id] =
          q.requireIfReason
            ? `Contextual / Optional (Becomes mandatory only if: ${q.requireIfReason})`
            : 'Contextual / Optional — captures helpful design detail without blocking submission.';
      }
    }
  }

  // Fail-Safe Guard (Design Principle #2): Ensure no unlocked module M1..M16 ever renders with 0 visible questions
  const visibleQuestionSet = new Set(visibleQuestionIds);
  for (const code of MODULE_ORDER) {
    if (code === 'M0' || code === 'M17' || !moduleReasonsMap.has(code)) continue;
    const modQs = questionsByModule.get(code) || [];
    const hasVisibleInMod = modQs.some((q) => visibleQuestionSet.has(q.id));
    if (!hasVisibleInMod) {
      const isManualMod = Boolean(manualCategories?.added?.includes(code));
      const fallbackQs = isManualMod
        ? modQs.filter((q) => code !== 'M11' || ['M11_Q1', 'M11_Q2', 'M11_Q3', 'M11_Q4', 'M11_Q5', 'M11_Q6'].includes(q.id))
        : modQs.slice(0, 1);
      const modReasons = Array.from(moduleReasonsMap.get(code)!);
      for (const fq of fallbackQs) {
        visibleQuestionIds.push(fq.id);
        visibleQuestionSet.add(fq.id);
        questionReasons[fq.id] = [
          modReasons[0] || `Baseline question for unlocked module ${code}`,
        ];
        if (fq.required) {
          requiredQuestionIds.push(fq.id);
        }
        questionRequirementReasons[fq.id] =
          fq.requireIfReason ||
          'Baseline control question for this unlocked security module.';
      }
    }
  }

  // Build ordered activeModules list with accurate visible & required question counts
  const requiredQuestionSet = new Set(requiredQuestionIds);
  const hardRequiredQuestionSet = new Set(hardRequiredQuestionIds);
  const activeModules: UnlockedModuleInfo[] = [];
  for (const code of MODULE_ORDER) {
    if (moduleReasonsMap.has(code)) {
      const modDef = moduleByCode.get(code);
      if (modDef) {
        const modQs = questionsByModule.get(code) || [];
        const modVisibleQs = modQs.filter((q) => visibleQuestionSet.has(q.id));
        const modRequiredQs = modVisibleQs.filter((q) => requiredQuestionSet.has(q.id));
        activeModules.push({
          code: modDef.code,
          title: modDef.title,
          shortTitle: modDef.shortTitle,
          estimatedMinutes: modDef.estimatedMinutes,
          reasons: Array.from(moduleReasonsMap.get(code)!),
          isManuallyAdded: manualCategories?.added?.includes(code),
          visibleQuestionCount: modVisibleQs.length,
          requiredQuestionCount: modRequiredQs.length,
        });
      }
    }
  }

  // Check completion, missing required, and 'I don't know yet' open items
  let answeredCount = 0;
  for (const qId of visibleQuestionIds) {
    const qDef = questionById.get(qId);
    if (!qDef) continue;
    const rawEntry = answersInput[qId];
    const val = effectiveAnswers[qId] ?? getStoredAnswerValue(answersInput, qId);
    const isAnswered =
      val !== undefined &&
      val !== null &&
      val !== '' &&
      !(Array.isArray(val) && val.length === 0);

    const isQuestionHardReq = hardRequiredQuestionSet.has(qId);
    const isQuestionReq = requiredQuestionSet.has(qId);

    if (isAnswered) {
      answeredCount++;
      if (val === 'not_sure') {
        const entryObj = typeof rawEntry === 'object' && rawEntry !== null ? (rawEntry as AnswerEntry) : undefined;
        openItems.push({
          questionId: qDef.id,
          questionCode: qDef.code,
          questionText: qDef.text,
          moduleCode: qDef.moduleId,
          hardRequired: isQuestionHardReq,
          owner: entryObj?.unknownOwner,
          note: entryObj?.unknownNote,
        });
        if (isQuestionHardReq) {
          missingRequiredQuestionIds.push(qDef.id);
        }
      }
    } else if (isQuestionReq) {
      missingRequiredQuestionIds.push(qDef.id);
    }
  }

  // Step 6: Run Consistency & Contradiction Checks (Section 6.6 & Page 32)
  const contradictions: ContradictionWarning[] = [];

  // Contradiction 1: Internet exposure selected with no external boundary crossing
  if (flags.internet_facing && p15 === 'no') {
    contradictions.push({
      id: 'CONTRA_INTERNET_NO_BOUNDARY',
      code: 'CHK-01',
      severity: 'warning',
      title: 'Internet reachability declared without trust boundary crossing',
      explanation:
        'You selected "Internet" for user network access, but answered "No" to whether any connection crosses between the bank network and the internet.',
      involvedQuestions: ['P10', 'P15'],
      moduleCode: 'M12',
    });
  }

  // Contradiction 2: PII, PCI, or Secrets selected while classification is Public or Internal
  if (
    (p20 === 'public' || p20 === 'internal') &&
    Array.isArray(p21) &&
    (p21.includes('pii') || p21.includes('pci') || p21.includes('secrets_keys') || p21.includes('financial'))
  ) {
    contradictions.push({
      id: 'CONTRA_PII_LOW_CLASSIFICATION',
      code: 'CHK-02',
      severity: 'critical',
      title: 'Regulated PII/PCI/Financial data paired with Public or Internal classification',
      explanation:
        'You selected Personal Data (PII), Card Data (PCI), Financial records, or Secrets, which require at least "Confidential" or "Sensitive" classification under bank data policy.',
      involvedQuestions: ['P20', 'P21'],
      moduleCode: 'M4',
    });
  }

  // Contradiction 3: External users selected with only Corporate LAN network reachability
  if (
    Array.isArray(p8) &&
    (p8.includes('customers') || p8.includes('public_visitors')) &&
    Array.isArray(p10) &&
    p10.length > 0 &&
    !p10.includes('internet') &&
    !p10.includes('partner_network')
  ) {
    contradictions.push({
      id: 'CONTRA_CUSTOMERS_LAN_ONLY',
      code: 'CHK-03',
      severity: 'warning',
      title: 'External customers selected with Corporate LAN-only network access',
      explanation:
        'You indicated Retail Customers or Public Visitors use the system, but only selected internal Corporate LAN/VPN for network reachability.',
      involvedQuestions: ['P8', 'P10'],
      moduleCode: 'M2',
    });
  }

  // Contradiction 4: Production hosting in scope without DR environment on Tier 1/2 app
  const p6 = (effectiveAnswers['P6'] as string[]) || [];
  const m1q1 = effectiveAnswers['M1_Q1'];
  if (
    Array.isArray(p6) &&
    p6.includes('production') &&
    !p6.includes('dr') &&
    (m1q1 === 'tier_1' || m1q1 === 'tier_2' || p1.includes('new_app'))
  ) {
    contradictions.push({
      id: 'CONTRA_PROD_WITHOUT_DR',
      code: 'CHK-04',
      severity: 'warning',
      title: 'Production environment in scope without Disaster Recovery (DR)',
      explanation:
        'Production is selected without Disaster Recovery (DR). Bank resilience standards require a DR topology for new and critical production systems.',
      involvedQuestions: ['P6', 'M1_Q1'],
      moduleCode: 'M16',
    });
  }

  // Contradiction 5: Minor enhancement marked while introducing new external party, PII/PCI, or AI
  if (isPureEnhancement && isMinorChange && overrideTriggersFired.length > 0) {
    contradictions.push({
      id: 'CONTRA_MINOR_WITH_HIGH_RISK_TRIGGER',
      code: 'CHK-05',
      severity: 'warning',
      title: 'Enhancement marked "Minor" while introducing high-risk architectural scope',
      explanation:
        'You selected "Minor" change size, but high-risk architectural scope was detected. Relevant security checklist sections have been retained.',
      involvedQuestions: ['P3', 'P21', 'P28'],
      moduleCode: 'M1',
    });
  }

  // Contradiction 6: Card / Payment (PCI) data selected in P21 while P24 indicates outside-India processing/storage
  if (Array.isArray(p21) && p21.includes('pci') && p24 === 'yes') {
    contradictions.push({
      id: 'CONTRA_PCI_CROSS_BORDER',
      code: 'CHK-06',
      severity: 'critical',
      title: 'Card / payment system data (PCI) indicated as leaving India (RBI Data Localization Alert)',
      explanation:
        'You selected Card / payment data (PCI) in P21 AND "Yes" for data leaving India in P24. Under RBI Storage of Payment System Data directives, end-to-end payment transaction data must reside exclusively in India.',
      involvedQuestions: ['P21', 'P24'],
      moduleCode: 'M4',
    });
  }

  // Contradiction 7: Direct API exposure without API Gateway on Internet or Sensitive PII/PCI scope
  if (p16 === 'yes_directly' && (flags.internet_facing || flags.pii_or_pci_in_scope)) {
    contradictions.push({
      id: 'CONTRA_DIRECT_API_NO_GATEWAY',
      code: 'CHK-07',
      severity: 'critical',
      title: 'Direct API exposure bypassing Enterprise API Gateway on high-risk scope',
      explanation:
        'You selected "Yes — directly (without a gateway)" while Internet reachability or PII/PCI data is in scope. Bank architecture standards mandate terminating external or regulated APIs on the Enterprise API Gateway.',
      involvedQuestions: ['P16', 'P10', 'P21'],
      moduleCode: 'M5',
    });
  }

  // Minimal Path Gaming Indicator (Section 6.7)
  const minimalPathIndicator =
    p13 === 'no' &&
    effectiveAnswers['P17'] === 'no' &&
    effectiveAnswers['P19'] === 'no' &&
    effectiveAnswers['P27'] === 'no' &&
    p28 === 'no';

  const estimatedMinutes = activeModules.reduce((acc, m) => acc + m.estimatedMinutes, 0);
  const completionPercentage =
    visibleQuestionIds.length > 0 ? Math.min(100, Math.round((answeredCount / visibleQuestionIds.length) * 100)) : 0;

  const detectedCategories = Array.from(detectedCategoriesMap.entries()).map(([id, item], idx) => ({
    id,
    label: item.label,
    isPrimary: idx === 0,
    reason: item.reason,
    sourceQuestionIds: item.sourceQuestionIds,
  }));

  if (detectedCategories.length === 0) {
    detectedCategories.push({
      id: 'CAT_GENERAL',
      label: 'General Security Architecture Review',
      isPrimary: true,
      reason: 'Default baseline security architecture assessment.',
      sourceQuestionIds: ['P1'],
    });
  }

  return {
    facts,
    flags,
    activeModules,
    suppressedByNarrowing,
    overrideTriggersFired,
    detectedCategories,
    visibleQuestionIds,
    requiredQuestionIds,
    hardRequiredQuestionIds,
    questionReasons,
    questionRequirementReasons,
    contradictions,
    openItems,
    missingRequiredQuestionIds,
    estimatedMinutes,
    completionPercentage,
    minimalPathIndicator,
    evaluatedAt: new Date().toISOString(),
    versionId: definition.versionId,
    v5Evaluation,
  };
}

// ============================================================================
// SCENARIO RUNNER & LINTER (Section 6.10 & Section 12 Rules Admin Lite)
// ============================================================================

export interface ScenarioRunResult {
  scenario: ScenarioTestCase;
  passed: boolean;
  actualModules: ModuleCode[];
  missingExpectedModules: ModuleCode[];
  unexpectedForbiddenModules: ModuleCode[];
  flagMismatches: string[];
  questionMismatches: string[];
  evaluationMs: number;
}

export function runScenarioSuite(
  scenarios: ScenarioTestCase[],
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): ScenarioRunResult[] {
  return scenarios.map((scenario) => {
    const t0 = performance.now();
    const res = evaluateSAR(scenario.answers, undefined, undefined, definition);
    const elapsed = Number((performance.now() - t0).toFixed(2));
    const actualModules = res.activeModules.map((m) => m.code);

    const missingExpectedModules = scenario.expectedModules.filter((m) => !actualModules.includes(m));
    const unexpectedForbiddenModules = (scenario.mustNotIncludeModules || []).filter((m) =>
      actualModules.includes(m)
    );

    const flagMismatches: string[] = [];
    for (const [fKey, expectedVal] of Object.entries(scenario.expectedFlags)) {
      const actualVal = res.flags[fKey as DerivedFlagId];
      if (actualVal !== expectedVal) {
        flagMismatches.push(`Flag "${fKey}": expected ${expectedVal}, got ${actualVal}`);
      }
    }

    const questionMismatches: string[] = [];
    for (const expectedQ of scenario.expectedVisibleQuestions || []) {
      if (!res.visibleQuestionIds.includes(expectedQ)) {
        questionMismatches.push(`Expected question ${expectedQ} to be visible, but it was hidden`);
      }
    }
    for (const hiddenQ of scenario.expectedHiddenQuestions || []) {
      if (res.visibleQuestionIds.includes(hiddenQ)) {
        questionMismatches.push(`Expected question ${hiddenQ} to stay hidden, but it was unlocked`);
      }
    }

    const passed =
      missingExpectedModules.length === 0 &&
      unexpectedForbiddenModules.length === 0 &&
      flagMismatches.length === 0 &&
      questionMismatches.length === 0;

    return {
      scenario,
      passed,
      actualModules,
      missingExpectedModules,
      unexpectedForbiddenModules,
      flagMismatches,
      questionMismatches,
      evaluationMs: elapsed,
    };
  });
}

// Section 7 Import Format:
// Module | Question ID | Question text | Hint/example | Answer type | Options | Required | Show only if | Applies to intents | Sets facts | Why-asked text
const ALLOWED_ANSWER_TYPES: QuestionDefinition['answerType'][] = [
  'single_select',
  'multi_select',
  'yes_no',
  'yes_no_not_sure',
  'short_text',
  'long_text',
  'number',
  'date',
  'ip_cidr',
  'port_range',
  'url_fqdn',
  'email',
  'app_picker',
];

const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function parseSpreadsheetQuestionImport(tsvText: string): {
  importedQuestions: QuestionDefinition[];
  errors: string[];
  warnings: string[];
} {
  const importedQuestions: QuestionDefinition[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof tsvText !== 'string' || tsvText.length > 100_000) {
    errors.push('Import payload exceeds maximum allowed size (100 KB).');
    return { importedQuestions, errors, warnings };
  }

  const lines = tsvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    errors.push('Import payload is empty.');
    return { importedQuestions, errors, warnings };
  }
  if (lines.length > 200) {
    errors.push('Import payload exceeds maximum row limit (200 rows).');
    return { importedQuestions, errors, warnings };
  }

  const seenIds = new Set<string>();

  lines.forEach((line, idx) => {
    const secretOrThreat = detectLiveSecretInText(line);
    if (secretOrThreat) {
      errors.push(`Row ${idx + 1}: Blocked by security filter — ${secretOrThreat}`);
      return;
    }

    const cols = line.includes('\t') ? line.split('\t') : line.split('|').map((c) => c.trim());
    // Skip header row if present
    if (idx === 0 && cols[0].toLowerCase().includes('module') && cols[1]?.toLowerCase().includes('question')) {
      return;
    }
    if (cols.length < 5) {
      errors.push(`Row ${idx + 1}: Expected at least 5 columns (Module | Question ID | Question text | Hint | Answer type), found ${cols.length}.`);
      return;
    }

    const [
      moduleRaw,
      qIdRaw,
      qTextRaw,
      hintRaw,
      answerTypeRaw,
      optionsRaw = '',
      requiredRaw = 'true',
      showOnlyIfRaw = '',
      appliesToIntentsRaw = '',
      setsFactsRaw = '',
      whyWeAskRaw = '',
    ] = cols;

    const moduleId = moduleRaw.toUpperCase() as ModuleCode;
    if (!MODULE_ORDER.includes(moduleId)) {
      errors.push(`Row ${idx + 1}: Invalid module code "${moduleRaw}". Must be M0 through M17.`);
      return;
    }

    const sanitizedQId = qIdRaw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
    if (!sanitizedQId || FORBIDDEN_OBJECT_KEYS.has(sanitizedQId.toLowerCase())) {
      errors.push(`Row ${idx + 1}: Question ID is missing or invalid.`);
      return;
    }
    if (seenIds.has(sanitizedQId)) {
      errors.push(`Row ${idx + 1}: Duplicate Question ID "${sanitizedQId}". Question IDs must be unique and permanent.`);
      return;
    }
    seenIds.add(sanitizedQId);

    if (!whyWeAskRaw) {
      warnings.push(`Row ${idx + 1} (${sanitizedQId}): Missing "Why-asked text"; using default explanation.`);
    }

    const options = optionsRaw
      ? optionsRaw
          .split(';')
          .slice(0, 20)
          .map((optStr) => {
            const clean = optStr.trim().slice(0, 160);
            const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 64) || 'option';
            return { id, label: clean };
          })
      : undefined;

    const setsFacts: Record<string, string> = Object.create(null);
    if (setsFactsRaw) {
      setsFactsRaw.split(';').forEach((pair) => {
        const [k, v] = pair.split('=').map((s) => s.trim());
        if (k && v && !FORBIDDEN_OBJECT_KEYS.has(k) && /^[a-zA-Z0-9_]+$/.test(k)) {
          setsFacts[k] = v.slice(0, 100);
        }
      });
    }

    const normalizedAnswerType = ALLOWED_ANSWER_TYPES.includes(
      answerTypeRaw as QuestionDefinition['answerType']
    )
      ? (answerTypeRaw as QuestionDefinition['answerType'])
      : 'single_select';

    importedQuestions.push({
      id: sanitizedQId,
      code: sanitizedQId,
      moduleId,
      text: qTextRaw.slice(0, 500),
      hint: (hintRaw || 'Provide specific architectural details.').slice(0, 400),
      whyWeAsk: (whyWeAskRaw || `Required to verify security controls for module ${moduleId}.`).slice(0, 400),
      answerType: normalizedAnswerType,
      options,
      required: requiredRaw.toLowerCase() !== 'false' && requiredRaw.toLowerCase() !== 'no',
      allowNotSure: true,
      allowNotApplicable: true,
      showOnlyIfText: showOnlyIfRaw ? showOnlyIfRaw.slice(0, 240) : undefined,
      appliesToIntents: appliesToIntentsRaw
        ? appliesToIntentsRaw.split(';').map((s) => s.trim().slice(0, 60))
        : undefined,
      setsFacts: Object.keys(setsFacts).length > 0 ? { ...setsFacts } : undefined,
    });
  });

  return { importedQuestions, errors, warnings };
}

// ============================================================================
// TAMPERPROOF PHASE & SUBMISSION GATE VALIDATOR (Client + Authoritative Server)
// ============================================================================

export interface StageGateInfo {
  stage: number;
  complete: boolean;
  unlocked: boolean;
  totalRequired: number;
  answeredRequired: number;
  missingCodes: string[];
}

export interface FlowGateStatus {
  basicsComplete: boolean;
  missingBasicsFields: string[];
  stages: Record<number, StageGateInfo>;
  maxUnlockedStage: number;
  preliminaryComplete: boolean;
  missingPreliminaryCodes: string[];
  modulesComplete: boolean;
  missingDetailedQuestions: { code: string; moduleId: ModuleCode; reason: string }[];
  unresolvedContradictionCodes: string[];
  canAccessPreliminary: boolean;
  canAccessModules: boolean;
  canAccessReview: boolean;
  canSubmit: boolean;
  blockingReasons: string[];
}

/**
 * Comprehensive OWASP Web Top 10, API Top 10 & LLM Top 10 Input Threat Detector:
 * Detects live cloud/API secrets, private keys, JWTs, database connection credentials,
 * XSS/XXE injection vectors, and indirect LLM prompt injection strings.
 */
export function detectLiveSecretInText(text: string): string | null {
  if (!text) return null;
  if (/(AKIA|ASIA)[0-9A-Z]{16}/.test(text)) {
    return 'AWS Access Key ID pattern (AKIA/ASIA...) detected. Never paste live cloud credentials.';
  }
  if (/-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/.test(text)) {
    return 'Cryptographic Private Key header detected. Remove any private key material immediately.';
  }
  if (/(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{15,}|sk_live_[A-Za-z0-9]{20,})/.test(text)) {
    return 'Live PAT / API token signature (GitHub/GitLab/Slack/Stripe) detected. Redact live tokens.';
  }
  if (/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(text)) {
    return 'Raw JSON Web Token (JWT) detected in text. Never paste bearer tokens into SAR records.';
  }
  if (/(mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp):\/\/[^/\s:@]+:[^@\s]+@/i.test(text)) {
    return 'Database/broker connection URI with embedded password detected. Redact credentials.';
  }
  if (
    /(password|passwd|secret|api_key|apikey|bearer|client_secret|private_key)\s*[:=]\s*['"]?[A-Za-z0-9_\-!@#$%^&*+=]{8,}/i.test(
      text
    )
  ) {
    return 'Credential or API secret assignment pattern detected. Please redact sensitive secrets.';
  }
  if (/(<\s*script\b|<\s*iframe\b|<\s*object\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|on(?:error|load|mouseover|focus|click)\s*=|<!ENTITY\b|<!DOCTYPE\b)/i.test(text)) {
    return 'Executable HTML/Script or XML Entity (XSS/XXE) payload detected and blocked.';
  }
  if (
    /(?:'|")\s*(?:OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+|(?:'|")\s*;\s*(?:DROP|ALTER|TRUNCATE|DELETE|INSERT|UPDATE|EXEC|EXECUTE)\s+(?:TABLE|DATABASE|SCHEMA|USER|INTO|FROM)|\bUNION\s+(?:ALL\s+)?SELECT\b[\s\S]{1,120}\bFROM\b|\b(?:WAITFOR\s+DELAY|PG_SLEEP\s*\(|BENCHMARK\s*\(\s*\d+|XP_CMDSHELL|LOAD_FILE\s*\(|INTO\s+(?:OUTFILE|DUMPFILE))\b/i.test(
      text
    )
  ) {
    return 'OWASP A03 SQL Injection (SQLi) attack signature detected and blocked.';
  }
  if (
    /(?:\$(?:where|gt|gte|lt|lte|ne|nin|regex|expr|function)['"]?\s*:|;\s*(?:rm\s+-rf|curl\s+http|wget\s+http|bash\s+-i|nc\s+-e|powershell\s+-enc)\b|(?:\.\.[/\\]){2,}|\/etc\/(?:passwd|shadow)|169\.254\.169\.254|metadata\.google\.internal)/i.test(
      text
    )
  ) {
    return 'OWASP NoSQL / Command Injection / SSRF / Path Traversal payload detected and blocked.';
  }
  if (
    /(ignore\s+(?:all\s+)?(?:previous|prior|above|system)\s+instructions|system\s+prompt\s+override|<\|im_start\|>|\[INST\]|you\s+are\s+now\s+in\s+developer\s+mode)/i.test(
      text
    )
  ) {
    return 'OWASP LLM01 Indirect Prompt Injection / instruction-override pattern detected and blocked.';
  }
  return null;
}

export function redactSensitivePatterns(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/(AKIA|ASIA)[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]')
    .replace(/(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|glpat-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{15,}|sk_live_[A-Za-z0-9]{20,})/g, '[REDACTED_API_TOKEN]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
    .replace(/((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp):\/\/[^/\s:@]+:)[^@\s]+(@)/gi, '$1[REDACTED]$2')
    .replace(/((?:password|passwd|secret|api_key|apikey|bearer|client_secret|private_key)\s*[:=]\s*['"]?)[A-Za-z0-9_\-!@#$%^&*+=]{8,}/gi, '$1[REDACTED_SECRET]')
    .replace(/<\s*\/?\s*(?:script|iframe|object|embed)\b[^>]*>/gi, '[BLOCKED_XSS_TAG]')
    .replace(/(?:javascript|vbscript)\s*:/gi, '[BLOCKED_URI_SCHEME]:')
    .replace(/<!(?:ENTITY|DOCTYPE)\b[^>]*>/gi, '[BLOCKED_XXE]')
    .replace(/(?:'|")\s*(?:OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi, '[BLOCKED_SQLI]')
    .replace(/(?:'|")\s*;\s*(?:DROP|ALTER|TRUNCATE|DELETE)\s+(?:TABLE|DATABASE|SCHEMA)\b/gi, '[BLOCKED_SQLI_DDL]')
    .replace(/\bUNION\s+(?:ALL\s+)?SELECT\b/gi, '[BLOCKED_SQLI_UNION]')
    .replace(/\b(?:PG_SLEEP\s*\(|WAITFOR\s+DELAY|XP_CMDSHELL)/gi, '[BLOCKED_SQLI_PROC]');
}

export function evaluateFlowGates(
  sar: SARRecord,
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): FlowGateStatus {
  const evalRes =
    sar.evaluation ||
    evaluateSAR(sar.answers, sar.tables, sar.manualCategories, definition);

  const isSubmitted = sar.status === 'submitted';

  // 1. Phase 1: Request Basics (M0) Mandatory Checks
  const missingBasicsFields: string[] = [];
  const b = sar.basics;
  if (!b.projectName?.trim()) missingBasicsFields.push('Project Name');
  if (!b.businessRequirement?.trim()) missingBasicsFields.push('Business Requirement & Purpose');
  if (!b.targetGoLiveDate?.trim()) missingBasicsFields.push('Target Go-Live Date');
  if ((b.connectedAppIds?.length || 0) === 0 && (b.customConnectedApps?.length || 0) === 0) {
    missingBasicsFields.push('At least 1 Connected Application (CMDB or Custom)');
  }
  const ticketTrimmed = (b.ticketNo || '').trim();
  if (ticketTrimmed !== '' && !/^(INC|RITM|CHG|REQ|SAR)[0-9]{5,10}$/i.test(ticketTrimmed)) {
    missingBasicsFields.push('Valid ServiceNow Ticket Format (or leave blank)');
  }
  if (detectLiveSecretInText(b.projectName) || detectLiveSecretInText(b.businessRequirement)) {
    missingBasicsFields.push('Remove flagged secrets or injection patterns in Request Basics');
  }

  const basicsComplete = missingBasicsFields.length === 0;

  // 2. Phase 2: Preliminary Checklist Stages 1..4 (WHO, HOW, WHERE, WHAT) Sequential Gate
  const defIndex = getDefinitionIndex(definition);
  const visibleSet = new Set(evalRes.visibleQuestionIds);
  const requiredSet = new Set(evalRes.requiredQuestionIds);
  const hardRequiredSet = new Set(evalRes.hardRequiredQuestionIds);

  const stages: Record<number, StageGateInfo> = {};
  const missingPreliminaryCodes: string[] = [];
  let maxUnlockedStage = 1;
  let allPreviousStagesComplete = basicsComplete;

  for (let s = 1; s <= 4; s++) {
    const stageQs = defIndex.questionsByStage.get(s) || [];
    const reqQsInStage = stageQs.filter(
      (q) => visibleSet.has(q.id) && requiredSet.has(q.id)
    );
    const missingInStage: string[] = [];
    let answeredReq = 0;

    for (const q of reqQsInStage) {
      const val = getStoredAnswerValue(sar.answers, q.id);
      const isAns =
        val !== undefined &&
        val !== null &&
        val !== '' &&
        !(Array.isArray(val) && val.length === 0);
      if (isAns) {
        answeredReq++;
      } else {
        missingInStage.push(q.code);
        missingPreliminaryCodes.push(q.code);
      }
    }

    const stageComplete = missingInStage.length === 0;
    const stageUnlocked = isSubmitted || allPreviousStagesComplete;
    if (stageUnlocked && s > maxUnlockedStage) {
      maxUnlockedStage = s;
    }

    stages[s] = {
      stage: s,
      complete: stageComplete,
      unlocked: stageUnlocked,
      totalRequired: reqQsInStage.length,
      answeredRequired: answeredReq,
      missingCodes: missingInStage,
    };

    if (!stageComplete) {
      allPreviousStagesComplete = false;
    }
  }

  const preliminaryComplete = basicsComplete && missingPreliminaryCodes.length === 0;

  // 3. Phase 3: Detailed Modules (M1..M16) Mandatory & Hard-Required Gate
  const missingDetailedQuestions: { code: string; moduleId: ModuleCode; reason: string }[] = [];
  const activeModSet = new Set(evalRes.activeModules.map((m) => m.code));

  for (const q of definition.questions) {
    if (q.stage !== undefined) continue;
    if (!activeModSet.has(q.moduleId) || !visibleSet.has(q.id)) continue;

    const isReq = requiredSet.has(q.id);
    const isHardReq = hardRequiredSet.has(q.id);
    const entry = sar.answers[q.id];
    const val = getStoredAnswerValue(sar.answers, q.id);
    const isAns =
      val !== undefined &&
      val !== null &&
      val !== '' &&
      !(Array.isArray(val) && val.length === 0);

    if (!isAns && isReq) {
      missingDetailedQuestions.push({
        code: q.code,
        moduleId: q.moduleId,
        reason: isHardReq ? 'Hard-Required question unanswered' : 'Mandatory question unanswered',
      });
    } else if (val === 'not_sure' && isHardReq) {
      missingDetailedQuestions.push({
        code: q.code,
        moduleId: q.moduleId,
        reason: 'Hard-Required control cannot remain "I don\'t know yet" on submit',
      });
    } else if (val === 'not_applicable' && q.justificationRequired && !entry?.naReason?.trim()) {
      missingDetailedQuestions.push({
        code: q.code,
        moduleId: q.moduleId,
        reason: '"Not applicable" requires a written justification',
      });
    }
  }

  const modulesComplete = preliminaryComplete && missingDetailedQuestions.length === 0;

  // 4. Contradiction Overrides Gate
  const unresolvedContradictionCodes = evalRes.contradictions
    .filter((c) => !sar.contradictionOverrides?.[c.id]?.justification?.trim())
    .map((c) => c.code);

  const blockingReasons: string[] = [];
  if (!basicsComplete) {
    blockingReasons.push(`Request Basics: Missing ${missingBasicsFields.join(', ')}.`);
  }
  if (!preliminaryComplete && missingPreliminaryCodes.length > 0) {
    blockingReasons.push(
      `Preliminary Checklist: ${missingPreliminaryCodes.length} required question(s) unanswered.`
    );
  }
  if (missingDetailedQuestions.length > 0) {
    blockingReasons.push(
      `Security Checklist: ${missingDetailedQuestions.length} required question(s) incomplete.`
    );
  }
  if (unresolvedContradictionCodes.length > 0) {
    blockingReasons.push(
      `Consistency Checks: ${unresolvedContradictionCodes.length} warning(s) unacknowledged.`
    );
  }

  const canAccessPreliminary = isSubmitted || basicsComplete;
  const canAccessModules = isSubmitted || preliminaryComplete;
  const canAccessReview = isSubmitted || (preliminaryComplete && modulesComplete);
  const canSubmit =
    !isSubmitted &&
    basicsComplete &&
    preliminaryComplete &&
    modulesComplete &&
    unresolvedContradictionCodes.length === 0;

  return {
    basicsComplete,
    missingBasicsFields,
    stages,
    maxUnlockedStage,
    preliminaryComplete,
    missingPreliminaryCodes,
    modulesComplete,
    missingDetailedQuestions,
    unresolvedContradictionCodes,
    canAccessPreliminary,
    canAccessModules,
    canAccessReview,
    canSubmit,
    blockingReasons,
  };
}

