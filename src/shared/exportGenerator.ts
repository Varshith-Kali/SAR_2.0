import { CMDB_APPLICATIONS, DEFAULT_DEFINITION_VERSION } from './definitions';
import { redactSensitivePatterns } from './rulesEngine';
import { DefinitionVersion, QuestionDefinition, SARRecord } from './types';
import {
  THREAD_DIMENSIONS,
  CONNECTED_APP_FLOW_FIELDS,
  APPLICATION_HOSTING_FIELDS,
  resolveActiveUserThreads,
  resolveConnectedAppFlows,
  resolveApplicationHostingThreads,
} from './checklistChains';

// Escape cell content that starts with =, +, -, @, |, %, tab, CR/LF to prevent CSV/Excel formula injection
export function sanitizeSpreadsheetCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const rawStr = Array.isArray(value) ? value.join(', ') : String(value);
  const cleaned = redactSensitivePatterns(
    rawStr.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  ).slice(0, 4000);
  const trimmed = cleaned.trim();
  if (/^[=+\-@|%|\t\r\n]/.test(cleaned) || /^[=+\-@|%]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return redactSensitivePatterns(String(str))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeFilename(input: string): string {
  return (
    input
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[._-]+/, '')
      .slice(0, 80) || 'sar_export'
  );
}

export function hasRequesterResponse(rawVal: unknown): boolean {
  if (rawVal === undefined || rawVal === null || rawVal === '') return false;
  if (Array.isArray(rawVal)) return rawVal.length > 0;
  return String(rawVal).trim().length > 0;
}

export function formatAnswerForDisplay(q: QuestionDefinition, rawVal: unknown): string {
  if (!hasRequesterResponse(rawVal)) return 'Unanswered';
  if (rawVal === 'not_sure') return "I don't know yet (Open Item)";
  if (rawVal === 'not_applicable') return 'Not applicable';
  if (rawVal === 'no_exception_compensating') {
    return 'No — Exception / Alternative Compensating Control';
  }
  const vals = Array.isArray(rawVal) ? rawVal.map(String) : [String(rawVal)];
  if (q.options && q.options.length > 0) {
    return vals
      .map((v) => {
        const match = q.options?.find((o) => o.id === v);
        if (!match) return v;
        if (
          q.moduleId !== 'M0' &&
          q.answerType === 'yes_no' &&
          !/^(yes|no)\b/i.test(match.label)
        ) {
          return `Yes — ${match.label}`;
        }
        return match.label;
      })
      .join(' | ');
  }
  return vals.join(' | ');
}

export function formatAvailableOptionsForDisplay(q: QuestionDefinition): string {
  if (!q.options || q.options.length === 0) {
    return 'Yes | No';
  }
  return q.options
    .map((opt, idx) => `${idx + 1}. ${opt.label}`)
    .join(' | ');
}

export function formatQuestionTypeLabel(q: QuestionDefinition): string {
  switch (q.answerType) {
    case 'yes_no':
      return q.moduleId === 'M0' ? 'Yes / No' : 'Yes / No + Chained Follow-Up';
    case 'yes_no_not_sure':
      return 'Yes / No / Not Sure';
    case 'single_select':
      return 'Single-Select Option';
    case 'multi_select':
      return 'Multi-Select Options';
    default:
      return 'Structured Selection';
  }
}

export interface PreliminaryExcelRow {
  stageNumber: number;
  stageLabel: string;
  code: string;
  questionText: string;
  answerTypeLabel: string;
  inputFormat: string;
  availableOptions: string;
  selectedResponse: string;
  dateGenerated: string;
}

export interface DetailedSecurityExcelRow {
  moduleCode: string;
  moduleTitle: string;
  code: string;
  questionText: string;
  inputFormat: string;
  availableOptions: string;
  selectedResponse: string;
  dateGenerated: string;
}

export interface TwoSheetWorkbookPreviewData {
  dateGenerated: string;
  metadataRows: { field: string; value: string; category: string }[];
  preliminaryRows: PreliminaryExcelRow[];
  securityQuestionnaireRows: DetailedSecurityExcelRow[];
}

const CMDB_APP_BY_ID: ReadonlyMap<string, string> = new Map(
  CMDB_APPLICATIONS.map((a) => [a.id, a.canonicalName])
);

const HUMAN_TOKEN_LABELS: Record<string, string> = {
  // User types
  bank_employees: 'Internal Users (Bank Employees)',
  partner_vendor_staff: 'External Partner / Vendor Staff',
  customers: 'Retail Customers',
  corporates_bc: 'Corporates / Business Correspondents',
  anonymous_public: 'Anonymous / Public Visitors',
  vip_executives: 'Executive / Board Members',
  privileged_admins: 'Privileged Admins / DBAs',
  none_headless: 'Headless / System-to-System Only',
  // Platforms
  web_browser: 'Web Browser (HTTPS)',
  mobile_app: 'Mobile App (iOS / Android)',
  desktop_thick_client: 'Desktop Client',
  cli: 'CLI / SSH',
  cli_ssh: 'CLI / SSH',
  vdi_citrix: 'VDI / Citrix Session',
  branch_pos_terminal: 'Branch / POS Terminal',
  // Access scopes
  read_only: 'Read-Only Inquiry',
  maker: 'Maker (Transaction Entry)',
  maker_transactions: 'Maker (Transaction Entry)',
  checker: 'Checker (Approval & Sign-Off)',
  checker_approvals: 'Checker (Approval & Sign-Off)',
  partner_scoped: 'Scoped Partner / Vendor Access',
  vendor_scoped_ops: 'Scoped Partner / Vendor Access',
  privileged_admin: 'Privileged System / Security Admin',
  privileged_admin_config: 'Privileged System / Security Admin',
  // Network paths
  corp_lan: 'Corporate LAN',
  corporate_network: 'Corporate LAN',
  corp_vpn: 'Corporate VPN + MFA',
  vpn: 'Corporate VPN + MFA',
  public_internet: 'Public Internet (via WAF & DMZ)',
  internet: 'Public Internet (via WAF & DMZ)',
  partner_vpn: 'Partner Site-to-Site VPN',
  partner_network: 'Partner Site-to-Site VPN',
  pam_bastion: 'CyberArk PAM Jump Host',
  isolated_subnet: 'Isolated Admin Jump Subnet',
  // Auth mechanisms
  bank_sso_oidc: 'Bank Enterprise SSO (OIDC / SAML)',
  enterprise_oidc_saml: 'Bank Enterprise SSO (OIDC / SAML)',
  partner_sso: 'Partner Federated SSO',
  partner_federated_sso: 'Partner Federated SSO',
  customer_ciam: 'Customer CIAM (OAuth 2.0 + PKCE)',
  customer_ciam_pkce: 'Customer CIAM (OAuth 2.0 + PKCE)',
  pam_mfa: 'CyberArk PAM + Hardware MFA',
  cyberark_pam_bastion: 'CyberArk PAM + Hardware MFA',
  local_breakglass: 'Local Vaulted Break-Glass Account',
  // Integration directions & protocols
  inbound: 'Inbound to Primary App',
  outbound: 'Outbound from Primary App',
  bidirectional: 'Bidirectional (Two-Way)',
  rest_api: 'REST API (HTTPS)',
  webhooks: 'Webhooks / Callbacks',
  queues_streams: 'Message Queue / Kafka',
  file_transfer: 'Managed File Transfer (SFTP)',
  db_connection: 'Direct Database Link',
  email_smtp: 'Email / SMTP Relay',
  // Hosting & zones
  bank_dc: 'On-Premises Data Center (Bank DC)',
  bank_aws: 'Private Cloud (AWS)',
  other_cloud_paas: 'Other Cloud / PaaS (Azure, GCP, SFDC)',
  vendor_saas: 'Third-Party Vendor SaaS Tenant',
  external_vendor: 'External Partner / Vendor Environment',
  hybrid: 'Hybrid (On-Premises DC + Cloud)',
  primary_changed: 'Primary Solution Under SAR',
  connected_internal: 'Connected Internal Bank System',
  external_partner: 'External Partner / Counterparty',
  app_db_internal: 'Internal App / Database Zone',
  dmz_edge: 'DMZ / Edge Reverse-Proxy Zone',
  cloud_vpc_private: 'Private Cloud VPC Subnet',
  vendor_tenant: 'External Vendor Hosted Tenant',
  // Encryption
  mtls: 'Mutual TLS (mTLS 1.2+)',
  tls_1_2_plus: 'HTTPS / TLS 1.2+',
  ssh_pgp: 'SFTP SSH Key + PGP Encryption',
  yes: 'Encrypted (TLS 1.2+ / mTLS)',
  no: 'Unencrypted / Plaintext',
};

function humanizeToken(token: unknown): string {
  if (token === null || token === undefined) return '';
  const raw = String(token).trim();
  if (!raw) return '';
  if (HUMAN_TOKEN_LABELS[raw]) return HUMAN_TOKEN_LABELS[raw];
  for (const dim of THREAD_DIMENSIONS) {
    const found = dim.options.find((o) => o.id === raw);
    if (found) return found.shortLabel;
  }
  for (const field of CONNECTED_APP_FLOW_FIELDS) {
    const found = field.options.find((o) => o.id === raw);
    if (found) return found.shortLabel;
  }
  for (const field of APPLICATION_HOSTING_FIELDS) {
    const found = field.options.find((o) => o.id === raw);
    if (found) return found.shortLabel;
  }
  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const CANONICAL_STAGE_ORDER: Record<string, { stageNumber: number; stageLabel: string; order: number }> = {
  P1: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 1 },
  P2: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 2 },
  P3: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 3 },
  P4: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 4 },
  P19: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 5 },
  P20: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 6 },
  P21: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 7 },
  P22: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 8 },
  P23: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 9 },
  P25: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 10 },
  P26: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 11 },
  P27: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 12 },
  P28: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 13 },
  P30: { stageNumber: 1, stageLabel: 'Stage 1 (WHAT): Scope, Data, Infrastructure & AI', order: 14 },
  P7: { stageNumber: 2, stageLabel: 'Stage 2 (WHO): Users, Platforms & Identity', order: 15 },
  P8: { stageNumber: 2, stageLabel: 'Stage 2 (WHO): Users, Platforms & Identity', order: 16 },
  P12: { stageNumber: 2, stageLabel: 'Stage 2 (WHO): Users, Platforms & Identity', order: 17 },
  P29: { stageNumber: 2, stageLabel: 'Stage 2 (WHO): Users, Platforms & Identity', order: 18 },
  P11: { stageNumber: 2, stageLabel: 'Stage 2 (WHO): Users, Platforms & Identity', order: 19 },
  P9: { stageNumber: 3, stageLabel: 'Stage 3 (HOW): Channels, Protocols & Connectivity', order: 20 },
  P13: { stageNumber: 3, stageLabel: 'Stage 3 (HOW): Channels, Protocols & Connectivity', order: 21 },
  P14: { stageNumber: 3, stageLabel: 'Stage 3 (HOW): Channels, Protocols & Connectivity', order: 22 },
  P15: { stageNumber: 3, stageLabel: 'Stage 3 (HOW): Channels, Protocols & Connectivity', order: 23 },
  P16: { stageNumber: 3, stageLabel: 'Stage 3 (HOW): Channels, Protocols & Connectivity', order: 24 },
  P17: { stageNumber: 3, stageLabel: 'Stage 3 (HOW): Channels, Protocols & Connectivity', order: 25 },
  P18: { stageNumber: 3, stageLabel: 'Stage 3 (HOW): Channels, Protocols & Connectivity', order: 26 },
  P5: { stageNumber: 4, stageLabel: 'Stage 4 (WHERE): Hosting, Environments & Network', order: 27 },
  P6: { stageNumber: 4, stageLabel: 'Stage 4 (WHERE): Hosting, Environments & Network', order: 28 },
  P10: { stageNumber: 4, stageLabel: 'Stage 4 (WHERE): Hosting, Environments & Network', order: 29 },
  P24: { stageNumber: 4, stageLabel: 'Stage 4 (WHERE): Hosting, Environments & Network', order: 30 },
};

function cleanModuleTitle(rawTitle: string): string {
  return rawTitle.replace(/^Module\s+\d+\s*[—–-]\s*/i, '').trim();
}

function extractNumericOrder(codeOrId: string): number {
  const match = codeOrId.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 99;
}

export function buildTwoSheetWorkbookData(
  sar: SARRecord,
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): TwoSheetWorkbookPreviewData {
  const evalRes = sar.evaluation;
  const dateGenerated = new Date().toISOString().slice(0, 10);

  const connectedApps = sar.basics.connectedAppIds
    .map((id) => CMDB_APP_BY_ID.get(id) || id)
    .concat(sar.basics.customConnectedApps);

  const primaryApp = (sar.basics.projectName || '').trim();

  const rawMetadataRows: { field: string; value: string; category: string }[] = [
    { category: 'Record Identity', field: 'SAR Tracking ID', value: sar.displayId },
    {
      category: 'Record Identity',
      field: 'ServiceNow Ticket Reference',
      value: sar.basics.ticketNo || '',
    },
    {
      category: 'Record Identity',
      field: 'Date Generated',
      value: dateGenerated,
    },
    {
      category: 'Project Context',
      field: 'Project / Request Name (Primary Solution)',
      value: sar.basics.projectName || '',
    },
    {
      category: 'Project Context',
      field: 'Business Unit',
      value: sar.basics.businessUnit || '',
    },
    {
      category: 'Project Context',
      field: 'Target Go-Live Date',
      value: sar.basics.targetGoLiveDate || '',
    },
    {
      category: 'Architecture Topology',
      field: 'Connected / Integrated Applications',
      value: connectedApps.join(' | '),
    },
    {
      category: 'Data Classification',
      field: 'Preliminary Data Types Involved',
      value: sar.basics.preliminaryDataTypes.join(' | '),
    },
    {
      category: 'Business Context',
      field: 'Business Requirement & Purpose',
      value: sar.basics.businessRequirement || '',
    },
  ];

  // Only include metadata fields that have a non-empty requester value
  const metadataRows = rawMetadataRows.filter((row) => row.value.trim().length > 0);

  const visibleIdSet = evalRes?.visibleQuestionIds
    ? new Set(evalRes.visibleQuestionIds)
    : null;
  const modTitleByCode = new Map(
    definition.modules.map((m) => [m.code, cleanModuleTitle(m.title)])
  );

  // Format human-readable breakdown for P8 (User Threads), P13 (Connected Systems), and P5 (Hosting)
  const summarizePreliminarySubBreakdown = (qId: string): string => {
    if (qId === 'P8') {
      const threadsVal =
        sar.answers.P8_THREADS?.value || sar.answers.P_USER_THREADS?.value;
      if (threadsVal && typeof threadsVal === 'object' && !Array.isArray(threadsVal)) {
        const entries = Object.entries(threadsVal as Record<string, Record<string, string>>);
        if (entries.length > 0) {
          const summary = entries
            .map(
              ([uType, cfg]) =>
                `${humanizeToken(uType)}: ${humanizeToken(cfg.platform || 'web_browser')} · ${humanizeToken(cfg.accessScope || 'read_only')} · ${humanizeToken(cfg.networkHow || cfg.networkMedium || 'corp_lan')} · ${humanizeToken(cfg.authMechanism || cfg.authMethod || 'bank_sso_oidc')}`
            )
            .join(' | ');
          return ` — User Access Threads: ${summary}`;
        }
      }
      const { activeUserTypes, matrix } = resolveActiveUserThreads(sar.answers);
      if (activeUserTypes.length > 0) {
        const summary = activeUserTypes
          .map((u) => {
            const cfg = matrix[u.userTypeId] || u.defaultValues;
            return `${u.shortLabel}: ${humanizeToken(cfg.platform)} · ${humanizeToken(cfg.accessScope)} · ${humanizeToken(cfg.networkHow)} · ${humanizeToken(cfg.authMechanism)}`;
          })
          .join(' | ');
        return ` — User Access Threads: ${summary}`;
      }
    }
    if (qId === 'P13') {
      const flowsVal = sar.answers.P13_APP_FLOWS?.value;
      if (flowsVal && typeof flowsVal === 'object' && !Array.isArray(flowsVal)) {
        const entries = Object.entries(flowsVal as Record<string, Record<string, string>>);
        if (entries.length > 0) {
          const summary = entries
            .map(
              ([appKey, cfg]) =>
                `${appKey}: ${humanizeToken(cfg.direction || 'bidirectional')} via ${humanizeToken(cfg.protocol || cfg.channel || 'rest_api')} (${humanizeToken(cfg.hostingTarget || cfg.networkZone || 'bank_dc')}, ${humanizeToken(cfg.encrypted || 'mtls')})`
            )
            .join(' | ');
          return ` — Connected Systems: ${summary}`;
        }
      }
      const resolvedFlows = resolveConnectedAppFlows(
        primaryApp || 'Primary Application',
        connectedApps,
        sar.answers
      );
      if (resolvedFlows.length > 0) {
        const summary = resolvedFlows
          .map(
            (f) =>
              `${f.appLabel}: ${humanizeToken(f.direction)} via ${humanizeToken(f.protocol)} (${humanizeToken(f.hostingTarget)}, ${humanizeToken(f.encrypted)})`
          )
          .join(' | ');
        return ` — Connected Systems: ${summary}`;
      }
    }
    if (qId === 'P5') {
      const hostVal = sar.answers.P5_APP_HOSTING?.value;
      if (hostVal && typeof hostVal === 'object' && !Array.isArray(hostVal)) {
        const entries = Object.entries(hostVal as Record<string, Record<string, string>>);
        if (entries.length > 0) {
          const summary = entries
            .map(
              ([appKey, cfg]) =>
                `${appKey}: ${humanizeToken(cfg.platform || cfg.hostingPlatform || 'bank_aws')} (${humanizeToken(cfg.role || 'primary_changed')}, ${humanizeToken(cfg.zone || cfg.networkZone || 'app_db_internal')})`
            )
            .join(' | ');
          return ` — Per-System Hosting: ${summary}`;
        }
      }
      const resolvedHost = resolveApplicationHostingThreads(
        primaryApp || 'Primary Application',
        connectedApps,
        sar.answers
      );
      if (resolvedHost.length > 0) {
        const summary = resolvedHost
          .map(
            (h) =>
              `${h.unitLabel}: ${humanizeToken(h.platform)} (${humanizeToken(h.role)}, ${humanizeToken(h.zone)})`
          )
          .join(' | ');
        return ` — Per-System Hosting: ${summary}`;
      }
    }
    return '';
  };

  // Sheet 1: Preliminary Questions (P1 to P30) — ONLY requester-responded visible questions, ordered strictly by Stage 1..4 (WHAT -> WHO -> HOW -> WHERE)
  const prelimQs = definition.questions
    .filter((q) => q.stage !== undefined)
    .sort((a, b) => {
      const ordA = CANONICAL_STAGE_ORDER[a.id]?.order ?? 99;
      const ordB = CANONICAL_STAGE_ORDER[b.id]?.order ?? 99;
      return ordA - ordB;
    });

  const preliminaryRows: PreliminaryExcelRow[] = prelimQs
    .filter((q) => {
      const isVisible = visibleIdSet ? visibleIdSet.has(q.id) : true;
      const ans = sar.answers[q.id];
      return isVisible && hasRequesterResponse(ans?.value);
    })
    .map((q) => {
      const ans = sar.answers[q.id];
      const breakdownSuffix = summarizePreliminarySubBreakdown(q.id);
      const typeLabel = formatQuestionTypeLabel(q);
      const stageMeta = CANONICAL_STAGE_ORDER[q.id] || {
        stageNumber: q.stage || 1,
        stageLabel: `Stage ${q.stage}: ${q.stageTitle}`,
      };
      return {
        stageNumber: stageMeta.stageNumber,
        stageLabel: stageMeta.stageLabel,
        code: q.code,
        questionText: q.text,
        answerTypeLabel: typeLabel,
        inputFormat: typeLabel,
        availableOptions: formatAvailableOptionsForDisplay(q),
        selectedResponse: `${formatAnswerForDisplay(q, ans?.value)}${breakdownSuffix}`,
        dateGenerated,
      };
    });

  // Sheet 2: Detailed Security Questionnaire (M1 to M16) — ONLY requester-responded visible questions, sorted M1..M16
  const detailedQs = definition.questions
    .filter((q) => q.stage === undefined)
    .sort((a, b) => {
      const modDiff = extractNumericOrder(a.moduleId) - extractNumericOrder(b.moduleId);
      if (modDiff !== 0) return modDiff;
      return extractNumericOrder(a.code) - extractNumericOrder(b.code);
    });
  const activeModules = evalRes?.activeModules || [];
  const activeModCodes = new Set(activeModules.map((m) => m.code));

  const securityQuestionnaireRows: DetailedSecurityExcelRow[] = detailedQs
    .filter((q) => {
      const isVisible =
        activeModCodes.has(q.moduleId) &&
        (visibleIdSet ? visibleIdSet.has(q.id) : true);
      const ans = sar.answers[q.id];
      return isVisible && hasRequesterResponse(ans?.value);
    })
    .map((q) => {
      const ans = sar.answers[q.id];
      const rawVal = ans?.value;

      const threadVal = sar.answers[`${q.id}_THREADS`]?.value;
      const threadSuffix =
        threadVal && typeof threadVal === 'object' && !Array.isArray(threadVal)
          ? (() => {
              const entries = Object.entries(threadVal as Record<string, string>);
              return entries.length > 0
                ? ` — Verified Across User Threads: ${entries
                    .map(([k, v]) => `${humanizeToken(k)}: ${v.toUpperCase()}`)
                    .join(' | ')}`
                : '';
            })()
          : '';

      const cleanTitle = modTitleByCode.get(q.moduleId) || q.moduleId;

      return {
        moduleCode: q.moduleId,
        moduleTitle: `${q.moduleId} — ${cleanTitle}`,
        code: q.code,
        questionText: q.text,
        inputFormat: formatQuestionTypeLabel(q),
        availableOptions: formatAvailableOptionsForDisplay(q),
        selectedResponse: `${formatAnswerForDisplay(q, rawVal)}${threadSuffix}`,
        dateGenerated,
      };
    });

  return {
    dateGenerated,
    metadataRows,
    preliminaryRows,
    securityQuestionnaireRows,
  };
}

type CellStyleId =
  | 'TitleBanner'
  | 'SectionBanner'
  | 'Header'
  | 'SubHeader'
  | 'Body'
  | 'BodyAlt'
  | 'CodeCell'
  | 'AnswerCell';

interface XmlCellSpec {
  value: unknown;
  styleId?: CellStyleId;
  mergeAcross?: number;
}

function estimateExcelRowHeight(cells: XmlCellSpec[]): number {
  let maxLines = 1;
  for (const c of cells) {
    const str = String(c.value ?? '');
    if (!str) continue;
    const explicitLines = str.split(/\r?\n/);
    let totalWrappedLines = 0;
    const wrapLimit = c.mergeAcross && c.mergeAcross >= 1 ? 82 : 52;
    for (const line of explicitLines) {
      totalWrappedLines += Math.max(1, Math.ceil(line.length / wrapLimit));
    }
    if (totalWrappedLines > maxLines) {
      maxLines = totalWrappedLines;
    }
  }
  return Math.min(200, Math.max(24, maxLines * 15 + 8));
}

function makeStyledXmlRow(cells: XmlCellSpec[], height?: number): string {
  const computedHeight = height ?? estimateExcelRowHeight(cells);
  const heightAttr = ` ss:AutoFitHeight="1" ss:Height="${computedHeight}"`;
  const cellsXml = cells
    .map((c) => {
      const safe = escapeHtml(sanitizeSpreadsheetCell(c.value));
      const styleAttr = ` ss:StyleID="${c.styleId || 'Body'}"`;
      const mergeAttr =
        c.mergeAcross && c.mergeAcross > 0 ? ` ss:MergeAcross="${c.mergeAcross}"` : '';
      return `<Cell${styleAttr}${mergeAttr}><Data ss:Type="String">${safe}</Data></Cell>`;
    })
    .join('');
  return `<Row${heightAttr}>${cellsXml}</Row>`;
}

/**
 * Generates a clean, executive-ready 2-Sheet Excel Workbook (.xls SpreadsheetML):
 *  - Sheet 1: Preliminary Checklist (Project Details & Stage 1–4 Preliminary Discovery Responses)
 *  - Sheet 2: Security Checklist (Detailed Security Domain Responses M1–M16, Firewall Matrix & Integrations)
 * Only relevant, requester-responded information is included with crisp headings and automatic text wrapping.
 */
export function generateExcelWorkbookXML(
  sar: SARRecord,
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): string {
  const data = buildTwoSheetWorkbookData(sar, definition);

  // ==========================================================================
  // SHEET 1: Preliminary Checklist (Clean 4-Column Layout Merged to 5-Grid)
  // ==========================================================================
  const sheet1Rows: string[] = [
    makeStyledXmlRow(
      [
        {
          value: `ISG SECURITY ARCHITECTURE CHECKLIST — SHEET 1: PRELIMINARY DISCOVERY · ${sar.displayId} · Date Generated: ${data.dateGenerated}`,
          styleId: 'TitleBanner',
          mergeAcross: 4,
        },
      ],
      32
    ),
    makeStyledXmlRow(
      [
        {
          value: 'SECTION 1A: PROJECT & REQUEST BASICS',
          styleId: 'SectionBanner',
          mergeAcross: 4,
        },
      ],
      25
    ),
    makeStyledXmlRow(
      [
        { value: 'Category', styleId: 'Header' },
        { value: 'Field', styleId: 'Header' },
        { value: 'Requester Response', styleId: 'Header', mergeAcross: 2 },
      ],
      25
    ),
    ...data.metadataRows.map((m, idx) =>
      makeStyledXmlRow([
        { value: m.category, styleId: idx % 2 === 0 ? 'Body' : 'BodyAlt' },
        { value: m.field, styleId: 'SubHeader' },
        {
          value: m.value,
          styleId: idx % 2 === 0 ? 'Body' : 'BodyAlt',
          mergeAcross: 2,
        },
      ])
    ),
    ...(sar.aiSummary
      ? [
          makeStyledXmlRow([{ value: '', styleId: 'Body', mergeAcross: 4 }], 10),
          makeStyledXmlRow(
            [
              {
                value: `SECTION 1B: AI SECURITY ARCHITECTURE REVIEW SUMMARY — ${
                  sar.aiSummary.projectName || sar.basics.projectName || sar.displayId
                } (POSTURE: ${sar.aiSummary.overallRiskPosture.toUpperCase()})`,
                styleId: 'SectionBanner',
                mergeAcross: 4,
              },
            ],
            25
          ),
          makeStyledXmlRow([
            { value: 'Executive Summary', styleId: 'SubHeader' },
            { value: sar.displayId, styleId: 'CodeCell' },
            { value: sar.aiSummary.executiveSummary, styleId: 'AnswerCell', mergeAcross: 2 },
          ]),
          makeStyledXmlRow([
            { value: 'Architecture & Trust Boundaries', styleId: 'SubHeader' },
            { value: 'Scope', styleId: 'CodeCell' },
            {
              value: sar.aiSummary.changeScopeAndArchitecture,
              styleId: 'Body',
              mergeAcross: 2,
            },
          ]),
          ...(sar.aiSummary.recommendedReviewerFocus.length > 0
            ? [
                makeStyledXmlRow([
                  { value: 'Priority Reviewer Focus Areas', styleId: 'SubHeader' },
                  { value: 'Sign-Off', styleId: 'CodeCell' },
                  {
                    value: sar.aiSummary.recommendedReviewerFocus.join(' | '),
                    styleId: 'BodyAlt',
                    mergeAcross: 2,
                  },
                ]),
              ]
            : []),
        ]
      : []),
    makeStyledXmlRow([{ value: '', styleId: 'Body', mergeAcross: 4 }], 10),
    makeStyledXmlRow(
      [
        {
          value: `SECTION 1B: PRELIMINARY DISCOVERY RESPONSES (${data.preliminaryRows.length} ANSWERED QUESTIONS)`,
          styleId: 'SectionBanner',
          mergeAcross: 4,
        },
      ],
      25
    ),
    makeStyledXmlRow(
      [
        { value: 'Discovery Stage', styleId: 'Header' },
        { value: 'Question ID', styleId: 'Header' },
        { value: 'Preliminary Discovery Question', styleId: 'Header' },
        { value: 'Requester Response', styleId: 'Header', mergeAcross: 1 },
      ],
      26
    ),
    ...data.preliminaryRows.map((r, idx) => {
      const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
      return makeStyledXmlRow([
        { value: r.stageLabel, styleId: baseStyle },
        { value: r.code, styleId: 'CodeCell' },
        { value: r.questionText, styleId: baseStyle },
        { value: r.selectedResponse, styleId: 'AnswerCell', mergeAcross: 1 },
      ]);
    }),
  ];

  // ==========================================================================
  // SHEET 2: Security Checklist (Clean 4-Column Layout Merged to 5-Grid)
  // ==========================================================================
  const sheet2Rows: string[] = [
    makeStyledXmlRow(
      [
        {
          value: `ISG SECURITY ARCHITECTURE CHECKLIST — SHEET 2: SECURITY QUESTIONNAIRE · ${sar.displayId} · Date Generated: ${data.dateGenerated}`,
          styleId: 'TitleBanner',
          mergeAcross: 4,
        },
      ],
      32
    ),
    makeStyledXmlRow(
      [
        {
          value: `SECTION 2A: DETAILED SECURITY CHECKLIST RESPONSES (${data.securityQuestionnaireRows.length} ANSWERED CONTROLS)`,
          styleId: 'SectionBanner',
          mergeAcross: 4,
        },
      ],
      25
    ),
    makeStyledXmlRow(
      [
        { value: 'Security Domain', styleId: 'Header' },
        { value: 'Question ID', styleId: 'Header' },
        { value: 'Security Control Question', styleId: 'Header' },
        { value: 'Requester Response', styleId: 'Header', mergeAcross: 1 },
      ],
      26
    ),
    ...data.securityQuestionnaireRows.map((r, idx) => {
      const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
      return makeStyledXmlRow([
        { value: r.moduleTitle, styleId: baseStyle },
        { value: r.code, styleId: 'CodeCell' },
        { value: r.questionText, styleId: baseStyle },
        { value: r.selectedResponse, styleId: 'AnswerCell', mergeAcross: 1 },
      ]);
    }),
  ];

  // Section 2B: Firewall Port Rules (Only if populated)
  if (sar.tables.firewall_rules.length > 0) {
    sheet2Rows.push(
      makeStyledXmlRow([{ value: '', styleId: 'Body', mergeAcross: 4 }], 10),
      makeStyledXmlRow(
        [
          {
            value: `SECTION 2B: NETWORK & FIREWALL PORT MATRIX (${sar.tables.firewall_rules.length} RULES)`,
            styleId: 'SectionBanner',
            mergeAcross: 4,
          },
        ],
        25
      ),
      makeStyledXmlRow(
        [
          { value: 'Environment & Direction', styleId: 'Header' },
          { value: 'Port / Protocol', styleId: 'Header' },
          { value: 'Source IP / CIDR', styleId: 'Header' },
          { value: 'Destination IP / CIDR', styleId: 'Header' },
          { value: 'Business Purpose', styleId: 'Header' },
        ],
        25
      ),
      ...sar.tables.firewall_rules.map((f, idx) => {
        const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
        return makeStyledXmlRow([
          { value: `${f.environment} (${f.direction})`, styleId: baseStyle },
          { value: `${f.port} / ${f.protocol}`, styleId: 'CodeCell' },
          { value: f.source, styleId: 'CodeCell' },
          { value: f.destination, styleId: 'CodeCell' },
          { value: f.purpose, styleId: baseStyle },
        ]);
      })
    );
  }

  // Section 2C: API Endpoints & System Integrations (Only if populated)
  if (sar.tables.api_endpoints.length > 0 || sar.tables.integrations.length > 0) {
    sheet2Rows.push(
      makeStyledXmlRow([{ value: '', styleId: 'Body', mergeAcross: 4 }], 10),
      makeStyledXmlRow(
        [
          {
            value: 'SECTION 2C: API ENDPOINTS & SYSTEM INTEGRATIONS',
            styleId: 'SectionBanner',
            mergeAcross: 4,
          },
        ],
        25
      ),
      makeStyledXmlRow(
        [
          { value: 'Integration Type', styleId: 'Header' },
          { value: 'Authentication / Channel', styleId: 'Header' },
          { value: 'Endpoint URI / Counterparty System', styleId: 'Header' },
          { value: 'Network Exposure / Data Shared', styleId: 'Header' },
          { value: 'Classification / Frequency', styleId: 'Header' },
        ],
        25
      ),
      ...sar.tables.api_endpoints.map((a, idx) => {
        const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
        return makeStyledXmlRow([
          { value: `API Endpoint (${a.method})`, styleId: baseStyle },
          { value: a.authType, styleId: 'CodeCell' },
          { value: a.name, styleId: baseStyle },
          { value: a.exposure, styleId: baseStyle },
          { value: a.dataClassification, styleId: baseStyle },
        ]);
      }),
      ...sar.tables.integrations.map((i, idx) => {
        const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
        return makeStyledXmlRow([
          { value: `System Integration (${i.direction})`, styleId: baseStyle },
          { value: i.channel, styleId: 'CodeCell' },
          { value: i.counterparty, styleId: baseStyle },
          { value: i.dataShared, styleId: baseStyle },
          { value: i.frequency, styleId: baseStyle },
        ]);
      })
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="TitleBanner">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>
  </Style>
  <Style ss:ID="SectionBanner">
   <Font ss:FontName="Calibri" ss:Size="10.5" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center" ss:Horizontal="Left"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#334155" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#475569"/>
   </Borders>
  </Style>
  <Style ss:ID="SubHeader">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="Body">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="BodyAlt">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="CodeCell">
   <Font ss:FontName="Consolas" ss:Size="9.5" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Top" ss:Horizontal="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="AnswerCell">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#065F46"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Top" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A7F3D0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="1_Preliminary_Checklist">
  <Table>
   <Column ss:Width="210"/>
   <Column ss:Width="85"/>
   <Column ss:Width="340"/>
   <Column ss:Width="260"/>
   <Column ss:Width="220"/>
   ${sheet1Rows.join('\n   ')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup><Layout x:Orientation="Landscape"/></PageSetup>
  </WorksheetOptions>
 </Worksheet>
 <Worksheet ss:Name="2_Security_Checklist">
  <Table>
   <Column ss:Width="210"/>
   <Column ss:Width="85"/>
   <Column ss:Width="340"/>
   <Column ss:Width="260"/>
   <Column ss:Width="220"/>
   ${sheet2Rows.join('\n   ')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup><Layout x:Orientation="Landscape"/></PageSetup>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

export function generatePrintableReportHTML(
  sar: SARRecord,
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): string {
  const data = buildTwoSheetWorkbookData(sar, definition);
  const connectedApps = sar.basics.connectedAppIds
    .map((id) => CMDB_APP_BY_ID.get(id) || id)
    .concat(sar.basics.customConnectedApps);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; form-action 'none';" />
  <title>${escapeHtml(sar.displayId)} — SAR Assist Security Architecture Review Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      margin: 0;
      padding: 36px 48px;
      font-size: 13px;
      line-height: 1.55;
    }
    .header-bar {
      border-bottom: 3px solid #18181B;
      padding-bottom: 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand { font-size: 11px; font-weight: 700; color: #18181B; letter-spacing: 0.06em; text-transform: uppercase; }
    h1 { font-size: 22px; margin: 6px 0 4px 0; color: #09090B; }
    h2 { font-size: 15px; margin: 28px 0 10px 0; padding-bottom: 6px; border-bottom: 1px solid #D4D4D8; color: #18181B; }
    h3 { font-size: 13px; margin: 16px 0 6px 0; color: #27272A; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 14px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .meta-item label { display: block; font-size: 11px; color: #64748B; margin-bottom: 2px; }
    .meta-item div { font-weight: 600; color: #0F172A; font-variant-numeric: tabular-nums; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0 18px 0; font-size: 12px; }
    th, td { border: 1px solid #E2E8F0; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #F1F5F9; font-weight: 600; color: #334155; }
    .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; font-size: 11.5px; }
    .footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #CBD5E1;
      font-size: 11px;
      color: #475569;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { padding: 16px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; padding: 12px 16px; background: #F4F4F5; border: 1px solid #D4D4D8; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
    <div><strong>SAR Assist Archival PDF / Print Preview</strong> — Press <kbd style="padding: 2px 6px; border: 1px solid #A1A1AA; border-radius: 4px; background: #FFFFFF; font-family: monospace;">Ctrl/Cmd + P</kbd> to save as PDF.</div>
  </div>

  <div class="header-bar">
    <div>
      <div class="brand">SAR Assist · Security Architecture Review Report</div>
      <h1>${escapeHtml(sar.basics.projectName)}</h1>
      <div style="color: #475569;">Requester: ${escapeHtml(sar.ownerName)}</div>
    </div>
    <div style="text-align: right;" class="mono">
      <div style="font-size: 16px; font-weight: 700; color: #18181B;">${escapeHtml(sar.displayId)}</div>
      <div>Date Generated: ${escapeHtml(data.dateGenerated)}</div>
      <div>Ticket: ${escapeHtml(sar.basics.ticketNo || 'N/A')}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item"><label>Business Unit</label><div>${escapeHtml(sar.basics.businessUnit)}</div></div>
    <div class="meta-item"><label>Target Go-Live</label><div>${escapeHtml(sar.basics.targetGoLiveDate || 'TBD')}</div></div>
    <div class="meta-item"><label>Connected CMDB Apps</label><div>${escapeHtml(connectedApps.join(', ') || 'None')}</div></div>
    <div class="meta-item"><label>Date Generated</label><div>${escapeHtml(data.dateGenerated)}</div></div>
  </div>

  <h2>1. Business Requirement &amp; Purpose</h2>
  <p><strong>Business Requirement:</strong> ${escapeHtml(sar.basics.businessRequirement)}</p>
  ${
    sar.aiSummary
      ? `
  <h2>1B. AI Security Architecture Review Summary — Tagged to "${escapeHtml(
          sar.aiSummary.projectName || sar.basics.projectName || sar.displayId
        )}" (${escapeHtml(sar.aiSummary.model)} · Posture: ${escapeHtml(
          sar.aiSummary.overallRiskPosture
        )})</h2>
  <p><strong>Tagged Project / Request Name:</strong> ${escapeHtml(
    sar.aiSummary.projectName || sar.basics.projectName || sar.displayId
  )} (${escapeHtml(sar.displayId)} · ${escapeHtml(
          sar.aiSummary.businessUnit || sar.basics.businessUnit || 'Enterprise Banking'
        )})</p>
  <p><strong>1. What This SAR Review Is About (Executive Summary):</strong> ${escapeHtml(
    sar.aiSummary.executiveSummary
  )}</p>
  <p><strong>2. Architectural Scope, Hosting, Data Flows &amp; Trust Boundaries:</strong> ${escapeHtml(
    sar.aiSummary.changeScopeAndArchitecture
  )}</p>
  ${
    sar.aiSummary.stageHighlights.length > 0
      ? `<p><strong>3. Checklist Scope &amp; Major Security Control Points Covered:</strong></p>
  <ul>${sar.aiSummary.stageHighlights
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.stageTitle)}:</strong> ${escapeHtml(item.summary)}${
          item.keySelections && item.keySelections.length > 0
            ? ` — <em>${escapeHtml(item.keySelections.join(' · '))}</em>`
            : ''
        }</li>`
    )
    .join('')}</ul>`
      : ''
  }
  ${
    sar.aiSummary.recommendedReviewerFocus.length > 0
      ? `<p><strong>4. Priority Verification Focus for ISG Security Reviewer Sign-Off:</strong></p>
  <ul>${sar.aiSummary.recommendedReviewerFocus
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('')}</ul>`
      : ''
  }`
      : ''
  }

  <h2>2. Sheet 1 — Preliminary Discovery Responses (${data.preliminaryRows.length} Answered Questions)</h2>
  <table>
    <thead>
      <tr><th style="width: 190px;">Discovery Stage</th><th style="width: 75px;">Question ID</th><th>Preliminary Discovery Question</th><th style="width: 320px;">Requester Response</th></tr>
    </thead>
    <tbody>
      ${data.preliminaryRows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.stageLabel)}</td><td class="mono">${escapeHtml(r.code)}</td><td>${escapeHtml(
              r.questionText
            )}</td><td><strong>${escapeHtml(r.selectedResponse)}</strong></td></tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>3. Sheet 2 — Detailed Security Checklist (${data.securityQuestionnaireRows.length} Answered Controls)</h2>
  <table>
    <thead>
      <tr><th style="width: 190px;">Security Domain</th><th style="width: 75px;">Question ID</th><th>Security Control Question</th><th style="width: 320px;">Requester Response</th></tr>
    </thead>
    <tbody>
      ${data.securityQuestionnaireRows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.moduleTitle)}</td><td class="mono">${escapeHtml(r.code)}</td><td>${escapeHtml(
              r.questionText
            )}</td><td><strong>${escapeHtml(r.selectedResponse)}</strong></td></tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer mono">
    <div>ISG's Security Architecture Checklist</div>
    <div>Date Generated: ${escapeHtml(data.dateGenerated)}</div>
  </div>
</body>
</html>`;
}


