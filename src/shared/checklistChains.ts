import { AnswerEntry, ModuleCode } from './types';

// ============================================================================
// 1. SIDE-BY-SIDE USER TYPE & PLATFORM THREAD MATRIX DEFINITIONS
// ============================================================================

export interface ThreadOption {
  id: string;
  label: string;
  shortLabel: string;
  mapsToP9?: string;
  mapsToP10?: string;
}

export interface ThreadDimensionDefinition {
  id:
    | 'platform'
    | 'accessScope'
    | 'networkHow'
    | 'authMechanism'
    | 'mfaEnforced'
    | 'deviceTrust'
    | 'sessionRbac';
  stepNumber: number;
  questionLabel: string;
  shortTitle: string;
  chainTriggerLabel: string;
  isYesNo: boolean;
  options: ThreadOption[];
}

export interface UserTypeThreadMeta {
  userTypeId: string;
  label: string;
  shortLabel: string;
  badgeColor: string;
  defaultValues: Record<ThreadDimensionDefinition['id'], string>;
}

export const USER_TYPE_THREAD_CATALOG: Record<string, UserTypeThreadMeta> = {
  bank_employees: {
    userTypeId: 'bank_employees',
    label: 'Internal Users (Bank Employees)',
    shortLabel: 'Internal Employees',
    badgeColor: 'blue',
    defaultValues: {
      platform: 'web_browser',
      accessScope: 'maker_transactions',
      networkHow: 'corporate_network',
      authMechanism: 'enterprise_oidc_saml',
      mfaEnforced: 'yes',
      deviceTrust: 'yes',
      sessionRbac: 'yes',
    },
  },
  partner_vendor_staff: {
    userTypeId: 'partner_vendor_staff',
    label: 'External Partner / Vendor Staff',
    shortLabel: 'Partner / Vendor',
    badgeColor: 'amber',
    defaultValues: {
      platform: 'mobile_app',
      accessScope: 'vendor_scoped_ops',
      networkHow: 'partner_network',
      authMechanism: 'partner_federated_sso',
      mfaEnforced: 'yes',
      deviceTrust: 'yes',
      sessionRbac: 'yes',
    },
  },
  customers: {
    userTypeId: 'customers',
    label: 'Retail Customers / End Users',
    shortLabel: 'Retail Customers',
    badgeColor: 'emerald',
    defaultValues: {
      platform: 'mobile_app',
      accessScope: 'maker_transactions',
      networkHow: 'internet',
      authMechanism: 'customer_ciam_pkce',
      mfaEnforced: 'yes',
      deviceTrust: 'yes',
      sessionRbac: 'yes',
    },
  },
  corporates_bc: {
    userTypeId: 'corporates_bc',
    label: 'Corporates / Business Correspondents',
    shortLabel: 'Corporates / BCs',
    badgeColor: 'indigo',
    defaultValues: {
      platform: 'web_browser',
      accessScope: 'checker_approvals',
      networkHow: 'internet',
      authMechanism: 'customer_ciam_pkce',
      mfaEnforced: 'yes',
      deviceTrust: 'yes',
      sessionRbac: 'yes',
    },
  },
  privileged_admins: {
    userTypeId: 'privileged_admins',
    label: 'Privileged Admins (SysAdmin / DBA)',
    shortLabel: 'Privileged Admins',
    badgeColor: 'purple',
    defaultValues: {
      platform: 'cli',
      accessScope: 'privileged_admin_config',
      networkHow: 'isolated_subnet',
      authMechanism: 'cyberark_pam_bastion',
      mfaEnforced: 'yes',
      deviceTrust: 'yes',
      sessionRbac: 'yes',
    },
  },
  executive_board: {
    userTypeId: 'executive_board',
    label: 'Executive / Board Members (VIP)',
    shortLabel: 'Executive VIPs',
    badgeColor: 'rose',
    defaultValues: {
      platform: 'web_browser',
      accessScope: 'read_inquiry',
      networkHow: 'vpn',
      authMechanism: 'enterprise_oidc_saml',
      mfaEnforced: 'yes',
      deviceTrust: 'yes',
      sessionRbac: 'yes',
    },
  },
  public_visitors: {
    userTypeId: 'public_visitors',
    label: 'Anonymous / Public Visitors',
    shortLabel: 'Public Visitors',
    badgeColor: 'zinc',
    defaultValues: {
      platform: 'web_browser',
      accessScope: 'read_inquiry',
      networkHow: 'internet',
      authMechanism: 'public_anonymous_waf',
      mfaEnforced: 'no',
      deviceTrust: 'yes',
      sessionRbac: 'yes',
    },
  },
};

export const THREAD_DIMENSIONS: ThreadDimensionDefinition[] = [
  {
    id: 'platform',
    stepNumber: 1,
    questionLabel: '1. Which platform / medium does this user use?',
    shortTitle: 'Platform / Medium',
    chainTriggerLabel: 'Based on selected user type',
    isYesNo: false,
    options: [
      { id: 'web_browser', label: 'Web App (Browser)', shortLabel: 'Web App', mapsToP9: 'web_browser' },
      { id: 'mobile_app', label: 'Mobile App (iOS / Android)', shortLabel: 'Mobile App', mapsToP9: 'mobile_app' },
      { id: 'desktop_app', label: 'Desktop App (Installed)', shortLabel: 'Desktop App', mapsToP9: 'desktop_app' },
      { id: 'cli', label: 'CLI / SSH Terminal', shortLabel: 'CLI / SSH', mapsToP9: 'cli' },
      { id: 'rdp_vdi', label: 'VDI / Citrix Desktop', shortLabel: 'VDI / Citrix', mapsToP9: 'rdp_vdi' },
      { id: 'kiosk', label: 'Branch Kiosk Terminal', shortLabel: 'Branch Kiosk', mapsToP9: 'kiosk' },
    ],
  },
  {
    id: 'accessScope',
    stepNumber: 2,
    questionLabel: '2. What does this user do in the system?',
    shortTitle: 'Access Level',
    chainTriggerLabel: 'Follows Step 1 (Platform)',
    isYesNo: false,
    options: [
      { id: 'read_inquiry', label: 'View Only (Reports / Inquiry)', shortLabel: 'View Only' },
      { id: 'maker_transactions', label: 'Maker (Create / Operations)', shortLabel: 'Maker / Ops' },
      { id: 'checker_approvals', label: 'Checker (Approve / Verify)', shortLabel: 'Checker' },
      { id: 'vendor_scoped_ops', label: 'Partner / Vendor Portal', shortLabel: 'Partner Portal' },
      { id: 'privileged_admin_config', label: 'System / DB Admin', shortLabel: 'System Admin' },
    ],
  },
  {
    id: 'networkHow',
    stepNumber: 3,
    questionLabel: '3. Which network do they connect from?',
    shortTitle: 'Network Path',
    chainTriggerLabel: 'Follows Step 2 (Access Level)',
    isYesNo: false,
    options: [
      { id: 'corporate_network', label: 'Office LAN (Bank Network)', shortLabel: 'Office LAN', mapsToP10: 'corporate_network' },
      { id: 'vpn', label: 'Company VPN (Remote)', shortLabel: 'Company VPN', mapsToP10: 'vpn' },
      { id: 'internet', label: 'Public Internet (WAF)', shortLabel: 'Public Internet', mapsToP10: 'internet' },
      { id: 'partner_network', label: 'Partner VPN / Extranet', shortLabel: 'Partner VPN', mapsToP10: 'partner_network' },
      { id: 'isolated_subnet', label: 'Isolated Jump Server', shortLabel: 'Jump Server', mapsToP10: 'isolated_subnet' },
    ],
  },
  {
    id: 'authMechanism',
    stepNumber: 4,
    questionLabel: '4. How does this user log in?',
    shortTitle: 'Login Method',
    chainTriggerLabel: 'Follows Step 3 (Network Path)',
    isYesNo: false,
    options: [
      { id: 'enterprise_oidc_saml', label: 'Bank SSO (Active Directory)', shortLabel: 'Bank SSO (AD)' },
      { id: 'customer_ciam_pkce', label: 'Customer Login (OTP / Pin)', shortLabel: 'Customer Login' },
      { id: 'partner_federated_sso', label: 'Partner SSO Login', shortLabel: 'Partner SSO' },
      { id: 'cyberark_pam_bastion', label: 'CyberArk PAM Vault', shortLabel: 'CyberArk PAM' },
      { id: 'mtls_cert_auth', label: 'Digital Certificate (mTLS)', shortLabel: 'Certificate' },
      { id: 'public_anonymous_waf', label: 'Public Page (No Login)', shortLabel: 'Public (No Login)' },
    ],
  },
  {
    id: 'mfaEnforced',
    stepNumber: 5,
    questionLabel: '5. Is 2-step verification (MFA / OTP) required at login?',
    shortTitle: '2-Step MFA?',
    chainTriggerLabel: 'Follows Step 4 (Login Method)',
    isYesNo: true,
    options: [
      { id: 'yes', label: 'Yes — MFA / OTP Required', shortLabel: 'Yes' },
      { id: 'no', label: 'No — Password Only', shortLabel: 'No' },
    ],
  },
  {
    id: 'deviceTrust',
    stepNumber: 6,
    questionLabel: '6. Is access restricted to secure / bank-managed devices?',
    shortTitle: 'Device Security?',
    chainTriggerLabel: 'Follows Step 5 (MFA)',
    isYesNo: true,
    options: [
      { id: 'yes', label: 'Yes — Managed / Verified Device', shortLabel: 'Yes' },
      { id: 'no', label: 'No — Any Personal Device', shortLabel: 'No' },
    ],
  },
  {
    id: 'sessionRbac',
    stepNumber: 7,
    questionLabel: '7. Does the session auto-logout after 15 mins of inactivity?',
    shortTitle: 'Auto-Logout (≤15m)?',
    chainTriggerLabel: 'Follows Step 6 (Device Security)',
    isYesNo: true,
    options: [
      { id: 'yes', label: 'Yes — Auto-Logout Enabled', shortLabel: 'Yes' },
      { id: 'no', label: 'No — Stays Logged In', shortLabel: 'No' },
    ],
  },
];

export type ThreadMatrixState = Record<string, Record<ThreadDimensionDefinition['id'], string>>;

/**
 * Deterministically resolves the active per-user-type parallel threads based on P8 (and P9),
 * merging any saved user overrides in `answers['P8_THREADS']` with intelligent defaults.
 */
export function resolveActiveUserThreads(
  answers: Record<string, AnswerEntry>
): {
  activeUserTypes: UserTypeThreadMeta[];
  matrix: ThreadMatrixState;
} {
  const p8Raw = answers['P8']?.value;
  const p8Arr: string[] = Array.isArray(p8Raw)
    ? p8Raw.map(String)
    : typeof p8Raw === 'string' && p8Raw
    ? [p8Raw]
    : [];

  const p9Raw = answers['P9']?.value;
  const p9Arr: string[] = Array.isArray(p9Raw)
    ? p9Raw.map(String)
    : typeof p9Raw === 'string' && p9Raw
    ? [p9Raw]
    : [];

  const activeUserTypes = p8Arr
    .filter((id) => id !== 'none_headless' && USER_TYPE_THREAD_CATALOG[id])
    .map((id) => USER_TYPE_THREAD_CATALOG[id]);

  const savedThreadsRaw = answers['P8_THREADS']?.value || answers['P_USER_THREADS']?.value;
  const savedThreads: Record<string, Record<string, string>> =
    savedThreadsRaw && typeof savedThreadsRaw === 'object' && !Array.isArray(savedThreadsRaw)
      ? (savedThreadsRaw as Record<string, Record<string, string>>)
      : {};

  const matrix: ThreadMatrixState = {};

  activeUserTypes.forEach((meta, idx) => {
    const existing = savedThreads[meta.userTypeId] || {};
    // If P9 has specific platforms selected, intelligently align default platform
    let defaultPlatform = meta.defaultValues.platform;
    if (p9Arr.length > 0 && !p9Arr.includes(defaultPlatform)) {
      defaultPlatform = p9Arr[idx % p9Arr.length] || p9Arr[0];
    }

    matrix[meta.userTypeId] = {
      platform: existing.platform || defaultPlatform,
      accessScope: existing.accessScope || meta.defaultValues.accessScope,
      networkHow: existing.networkHow || meta.defaultValues.networkHow,
      authMechanism: existing.authMechanism || meta.defaultValues.authMechanism,
      mfaEnforced: existing.mfaEnforced || meta.defaultValues.mfaEnforced,
      deviceTrust: existing.deviceTrust || meta.defaultValues.deviceTrust,
      sessionRbac: existing.sessionRbac || meta.defaultValues.sessionRbac,
    };
  });

  return { activeUserTypes, matrix };
}

// ============================================================================
// 1B. CONNECTED APPLICATION INTEGRATION & HOSTING SIDE-BY-SIDE THREADS
// Eliminates ambiguity when 2-5 applications interact in a single SAR request.
// ============================================================================

export interface ConnectedAppFlowEntry {
  appId: string;
  appLabel: string;
  shortLabel: string;
  badge: string;
  direction: 'bidirectional' | 'outbound' | 'inbound';
  protocol: 'rest_api' | 'file_transfer' | 'queues_streams' | 'db_connection';
  hostingTarget: 'bank_dc' | 'bank_aws' | 'external_vendor';
  encrypted: 'yes' | 'no';
}

export const CONNECTED_APP_FLOW_FIELDS: Array<{
  key: 'direction' | 'protocol' | 'hostingTarget' | 'encrypted';
  questionNumber: string;
  label: string;
  options: Array<{ id: string; label: string; shortLabel: string }>;
}> = [
  {
    key: 'direction',
    questionNumber: '1',
    label: '1. Data Flow Direction (Primary App ↔ This System)',
    options: [
      { id: 'bidirectional', label: 'Bi-Directional', shortLabel: 'Bi-Directional' },
      { id: 'outbound', label: 'Outbound (Calls Out)', shortLabel: 'Outbound' },
      { id: 'inbound', label: 'Inbound (Calls In)', shortLabel: 'Inbound' },
    ],
  },
  {
    key: 'protocol',
    questionNumber: '2',
    label: '2. Integration Protocol / Channel Used',
    options: [
      { id: 'rest_api', label: 'REST / SOAP API', shortLabel: 'REST / SOAP API' },
      { id: 'file_transfer', label: 'SFTP Batch File', shortLabel: 'SFTP Batch File' },
      { id: 'queues_streams', label: 'Kafka / Queue', shortLabel: 'Kafka / Queue' },
      { id: 'db_connection', label: 'Direct DB Link', shortLabel: 'Direct DB Link' },
    ],
  },
  {
    key: 'hostingTarget',
    questionNumber: '3',
    label: '3. Where is this Connected System Hosted?',
    options: [
      { id: 'bank_dc', label: 'Bank On-Prem DC', shortLabel: 'Bank On-Prem DC' },
      { id: 'bank_aws', label: 'Bank AWS / Cloud', shortLabel: 'Bank AWS / Cloud' },
      { id: 'external_vendor', label: 'External / Vendor Cloud', shortLabel: 'External / Vendor' },
    ],
  },
  {
    key: 'encrypted',
    questionNumber: '4',
    label: '4. Encrypted in Transit (TLS 1.2+ / SSH / mTLS)?',
    options: [
      { id: 'yes', label: 'Yes', shortLabel: 'Yes' },
      { id: 'no', label: 'No', shortLabel: 'No' },
    ],
  },
];

export function resolveConnectedAppFlows(
  projectName: string,
  connectedAppNames: string[],
  answers: Record<string, AnswerEntry>
): ConnectedAppFlowEntry[] {
  const p13 = String(answers['P13']?.value || '');
  if (!p13 || p13 === 'no') return [];

  const p14Raw = answers['P14']?.value;
  const p14Arr = Array.isArray(p14Raw) ? p14Raw.map(String) : [];

  const savedRaw = answers['P13_APP_FLOWS']?.value;
  const savedMap: Record<string, Partial<ConnectedAppFlowEntry>> =
    savedRaw && typeof savedRaw === 'object' && !Array.isArray(savedRaw)
      ? (savedRaw as Record<string, Partial<ConnectedAppFlowEntry>>)
      : {};

  const items: Array<{ id: string; label: string; shortLabel: string; badge: string; isExternalDefault: boolean }> = [];

  connectedAppNames.forEach((name, idx) => {
    const clean = name.trim();
    if (!clean) return;
    const isExt = /vendor|partner|npci|visa|mastercard|okta|sailpoint|external|saas|clearing/i.test(clean);
    const shortPart = clean.split('—')[0].trim();
    items.push({
      id: `conn_app_${idx}_${shortPart.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      label: clean,
      shortLabel: shortPart.length > 28 ? `${shortPart.slice(0, 26)}…` : shortPart,
      badge: isExt ? 'EXTERNAL / PARTNER SYSTEM' : `CONNECTED SYSTEM ${idx + 1}`,
      isExternalDefault: isExt,
    });
  });

  if (items.length === 0) {
    if (p13 === 'internal_only' || p13 === 'both') {
      items.push({
        id: 'conn_internal_core',
        label: 'Internal Bank System (Core / Middleware)',
        shortLabel: 'Internal Bank System',
        badge: 'INTERNAL BANK SYSTEM',
        isExternalDefault: false,
      });
    }
    if (p13 === 'external_only' || p13 === 'both') {
      items.push({
        id: 'conn_external_partner',
        label: 'External Partner / Vendor API or SFTP',
        shortLabel: 'External Partner System',
        badge: 'EXTERNAL PARTNER / VENDOR',
        isExternalDefault: true,
      });
    }
  } else if ((p13 === 'external_only' || p13 === 'both') && !items.some((i) => i.isExternalDefault)) {
    items.push({
      id: 'conn_external_partner',
      label: 'External Partner / Vendor System',
      shortLabel: 'External Partner / Vendor',
      badge: 'EXTERNAL PARTNER / VENDOR',
      isExternalDefault: true,
    });
  }

  return items.map((item, idx) => {
    const saved = savedMap[item.id] || {};
    let defaultProto: ConnectedAppFlowEntry['protocol'] = 'rest_api';
    if (item.label.toLowerCase().includes('sftp') || p14Arr.includes('file_transfer')) {
      defaultProto = idx % 2 === 1 && p14Arr.includes('file_transfer') ? 'file_transfer' : 'rest_api';
    }
    if (item.label.toLowerCase().includes('kafka') || item.label.toLowerCase().includes('queue')) {
      defaultProto = 'queues_streams';
    }
    const defaultHost: ConnectedAppFlowEntry['hostingTarget'] = item.isExternalDefault
      ? 'external_vendor'
      : idx % 2 === 1
      ? 'bank_aws'
      : 'bank_dc';

    return {
      appId: item.id,
      appLabel: item.label,
      shortLabel: item.shortLabel,
      badge: item.badge,
      direction: (saved.direction as ConnectedAppFlowEntry['direction']) || 'bidirectional',
      protocol: (saved.protocol as ConnectedAppFlowEntry['protocol']) || defaultProto,
      hostingTarget: (saved.hostingTarget as ConnectedAppFlowEntry['hostingTarget']) || defaultHost,
      encrypted: (saved.encrypted as ConnectedAppFlowEntry['encrypted']) || 'yes',
    };
  });
}

export interface ApplicationHostingThreadEntry {
  unitId: string;
  unitLabel: string;
  shortLabel: string;
  badge: string;
  isPrimary: boolean;
  platform: 'bank_dc' | 'bank_aws' | 'other_cloud' | 'vendor_saas' | 'hybrid';
  role: 'primary_changed' | 'connected_internal' | 'external_partner';
  zone: 'app_db_internal' | 'dmz_zone' | 'cde_isolated' | 'vendor_tenant';
}

export const APPLICATION_HOSTING_FIELDS: Array<{
  key: 'platform' | 'role' | 'zone';
  questionNumber: string;
  label: string;
  options: Array<{ id: string; label: string; shortLabel: string }>;
}> = [
  {
    key: 'platform',
    questionNumber: '1',
    label: '1. Where is this specific application / system hosted?',
    options: [
      { id: 'bank_dc', label: 'Bank On-Prem DC', shortLabel: 'Bank On-Prem DC' },
      { id: 'bank_aws', label: 'Private Cloud (AWS)', shortLabel: 'Private Cloud (AWS)' },
      { id: 'other_cloud', label: 'Other Cloud / PaaS', shortLabel: 'Other Cloud / PaaS' },
      { id: 'vendor_saas', label: 'Vendor SaaS Tenant', shortLabel: 'Vendor SaaS' },
      { id: 'hybrid', label: 'Hybrid (DC + Cloud)', shortLabel: 'Hybrid (DC + Cloud)' },
    ],
  },
  {
    key: 'role',
    questionNumber: '2',
    label: '2. Role of this application in the request',
    options: [
      { id: 'primary_changed', label: 'Primary App (In-Scope Change)', shortLabel: 'Primary App' },
      { id: 'connected_internal', label: 'Connected Bank System', shortLabel: 'Connected Bank App' },
      { id: 'external_partner', label: 'External Partner / Vendor System', shortLabel: 'External / Vendor' },
    ],
  },
  {
    key: 'zone',
    questionNumber: '3',
    label: '3. Network Security Zone / Placement',
    options: [
      { id: 'app_db_internal', label: 'Internal App / DB Zone', shortLabel: 'Internal App / DB' },
      { id: 'dmz_zone', label: 'DMZ / API Gateway Zone', shortLabel: 'DMZ / Gateway' },
      { id: 'cde_isolated', label: 'Restricted / PCI CDE Zone', shortLabel: 'Restricted / CDE' },
      { id: 'vendor_tenant', label: 'External Vendor Tenant', shortLabel: 'Vendor Tenant' },
    ],
  },
];

export function resolveApplicationHostingThreads(
  projectName: string,
  connectedAppNames: string[],
  answers: Record<string, AnswerEntry>
): ApplicationHostingThreadEntry[] {
  const p5Raw = answers['P5']?.value;
  const p5Arr: string[] = Array.isArray(p5Raw)
    ? p5Raw.map(String)
    : typeof p5Raw === 'string' && p5Raw
    ? [p5Raw]
    : [];

  const savedRaw = answers['P5_APP_HOSTING']?.value;
  const savedMap: Record<string, Partial<ApplicationHostingThreadEntry>> =
    savedRaw && typeof savedRaw === 'object' && !Array.isArray(savedRaw)
      ? (savedRaw as Record<string, Partial<ApplicationHostingThreadEntry>>)
      : {};

  const primaryTitle = projectName?.trim() || 'Primary Application (In-Scope Solution)';
  const primaryShort = primaryTitle.length > 30 ? `${primaryTitle.slice(0, 28)}…` : primaryTitle;

  const primaryDefaultPlatform: ApplicationHostingThreadEntry['platform'] =
    p5Arr.includes('bank_aws')
      ? 'bank_aws'
      : p5Arr.includes('other_cloud')
      ? 'other_cloud'
      : p5Arr.includes('vendor_saas')
      ? 'vendor_saas'
      : p5Arr.includes('hybrid')
      ? 'hybrid'
      : 'bank_dc';

  const units: Array<{
    unitId: string;
    unitLabel: string;
    shortLabel: string;
    badge: string;
    isPrimary: boolean;
    defaultPlatform: ApplicationHostingThreadEntry['platform'];
    defaultRole: ApplicationHostingThreadEntry['role'];
    defaultZone: ApplicationHostingThreadEntry['zone'];
  }> = [
    {
      unitId: 'primary_solution',
      unitLabel: primaryTitle,
      shortLabel: primaryShort,
      badge: 'PRIMARY APPLICATION (THIS REQUEST)',
      isPrimary: true,
      defaultPlatform: primaryDefaultPlatform,
      defaultRole: 'primary_changed',
      defaultZone: primaryDefaultPlatform === 'vendor_saas' ? 'vendor_tenant' : 'app_db_internal',
    },
  ];

  connectedAppNames.forEach((name, idx) => {
    const clean = name.trim();
    if (!clean) return;
    const isExt = /vendor|partner|npci|visa|mastercard|okta|sailpoint|external|saas|clearing/i.test(clean);
    const shortPart = clean.split('—')[0].trim();
    const fallbackPlatform: ApplicationHostingThreadEntry['platform'] = isExt
      ? 'vendor_saas'
      : p5Arr.includes('bank_dc')
      ? 'bank_dc'
      : p5Arr[idx % Math.max(1, p5Arr.length)] === 'other_cloud'
      ? 'other_cloud'
      : 'bank_dc';

    units.push({
      unitId: `host_app_${idx}_${shortPart.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      unitLabel: clean,
      shortLabel: shortPart.length > 28 ? `${shortPart.slice(0, 26)}…` : shortPart,
      badge: isExt ? `CONNECTED EXTERNAL SYSTEM ${idx + 1}` : `CONNECTED BANK APP ${idx + 1}`,
      isPrimary: false,
      defaultPlatform: fallbackPlatform,
      defaultRole: isExt ? 'external_partner' : 'connected_internal',
      defaultZone: isExt ? 'vendor_tenant' : 'app_db_internal',
    });
  });

  // If no connected apps were selected in Step 1 Basics but multiple hosting options or Hybrid were selected in P5,
  // provide a second column for the Connected Backend / Partner Component so the multi-select hosting split is clear.
  if (units.length === 1 && (p5Arr.length > 1 || p5Arr.includes('hybrid'))) {
    const secondPlatform: ApplicationHostingThreadEntry['platform'] =
      p5Arr.find((p) => p !== primaryDefaultPlatform && p !== 'not_decided') as ApplicationHostingThreadEntry['platform'] ||
      (primaryDefaultPlatform === 'bank_dc' ? 'bank_aws' : 'bank_dc');
    units.push({
      unitId: 'connected_tier_component',
      unitLabel: 'Connected Backend / Partner Tier',
      shortLabel: 'Connected Backend Tier',
      badge: 'CONNECTED SYSTEM / TIER 2',
      isPrimary: false,
      defaultPlatform: secondPlatform,
      defaultRole: secondPlatform === 'vendor_saas' ? 'external_partner' : 'connected_internal',
      defaultZone: secondPlatform === 'vendor_saas' ? 'vendor_tenant' : 'app_db_internal',
    });
  }

  return units.map((u) => {
    const saved = savedMap[u.unitId] || {};
    return {
      unitId: u.unitId,
      unitLabel: u.unitLabel,
      shortLabel: u.shortLabel,
      badge: u.badge,
      isPrimary: u.isPrimary,
      platform: (saved.platform as ApplicationHostingThreadEntry['platform']) || u.defaultPlatform,
      role: (saved.role as ApplicationHostingThreadEntry['role']) || u.defaultRole,
      zone: (saved.zone as ApplicationHostingThreadEntry['zone']) || u.defaultZone,
    };
  });
}

// ============================================================================
// 2. PRELIMINARY CHECKLIST LOGICAL CHAIN LINEAGE (P1..P30)
// Stage 1 = WHAT (Scope, Data, Infrastructure & AI)
// Stage 2 = WHO  (Users, Identities & Ownership)
// Stage 3 = HOW  (Channels, Protocols & Connectivity)
// Stage 4 = WHERE (Hosting, Environments & Locations)
// ============================================================================

export interface PreliminaryChainMeta {
  questionId: string;
  chainName: string;
  stepBadge: string;
  parentQuestionId?: string;
  connectedFromText: string;
  unlocksNextText: string;
}

export const PRELIMINARY_CHAIN_MAP: Record<string, PreliminaryChainMeta> = {
  // STAGE 1: WHAT — Scope, Data Sensitivity, Infrastructure & AI Chain (First Stage!)
  P1: {
    questionId: 'P1',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 1 of 14',
    connectedFromText: 'Stage 1 Root Question — Defines what is being built, enhanced, integrated, or migrated',
    unlocksNextText: 'Dynamically links into P2–P4 (Delta Scope), Stage 2 (WHO), Stage 3 (HOW), and Stage 4 (WHERE)',
  },
  P2: {
    questionId: 'P2',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 2 of 14',
    parentQuestionId: 'P1',
    connectedFromText: 'Connected from P1 (Enhancement Selected) → Checks if the primary application has a prior SAR on file',
    unlocksNextText: 'If Yes, chains into P3 (Delta-Scope Filtering for changed components only)',
  },
  P3: {
    questionId: 'P3',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 3 of 14',
    parentQuestionId: 'P2',
    connectedFromText: 'Connected from P1 & P2 → Determines Minor vs. Major enhancement scope',
    unlocksNextText: 'Chains into P4 (Specific Components Changed)',
  },
  P4: {
    questionId: 'P4',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 4 of 14',
    parentQuestionId: 'P1',
    connectedFromText: 'Connected from P1 & P3 → Pinpoints the exact technical layers being introduced or modified',
    unlocksNextText: 'Pre-wires Stage 2 (Auth), Stage 3 (APIs/SFTP/Queues), Stage 4 (Cloud/Servers), and Detailed Modules',
  },
  P19: {
    questionId: 'P19',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 5 of 14',
    parentQuestionId: 'P4',
    connectedFromText: 'Connected from P1 & P4 → Checks if the primary application or connected flows store, process, or transmit data',
    unlocksNextText: 'If Yes, chains into P20 (Classification), P21 (Data Categories), P22 (States), and Stage 4 P24 (Residency)',
  },
  P20: {
    questionId: 'P20',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 6 of 14',
    parentQuestionId: 'P19',
    connectedFromText: 'Connected from P19 (Handles Data = Yes) → Establishes the highest bank data classification tier',
    unlocksNextText: 'Chains into P21 (Specific Data Types) and M4.1 (AES-256 CMK Encryption at Rest)',
  },
  P21: {
    questionId: 'P21',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 7 of 14',
    parentQuestionId: 'P20',
    connectedFromText: 'Connected from P20 (Data Classification) → Identifies regulated data categories (PII, PCI, Financial, Keys)',
    unlocksNextText: 'Chains into P23 (Record Volume), M4.4 (DPDP Privacy), M4.6 (PCI CDE HSM), and M5.7 (Payload JWE)',
  },
  P22: {
    questionId: 'P22',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 8 of 14',
    parentQuestionId: 'P21',
    connectedFromText: 'Connected from P19 & P21 → Maps every state where data exists (At Rest, In Transit, Cache, Backups, Logs)',
    unlocksNextText: 'Chains into M4.1 (At Rest), M4.3 (In Transit), M4.7 (Cache), and M16.2 (Encrypted Backups)',
  },
  P23: {
    questionId: 'P23',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 9 of 14',
    parentQuestionId: 'P21',
    connectedFromText: 'Connected from P21 (PII / PCI / Financial Data) → Sizes customer record volume for exfiltration risk',
    unlocksNextText: 'If >10k records, chains into M4.8 (Database Activity Monitoring & Bulk Export DLP)',
  },
  P25: {
    questionId: 'P25',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 10 of 14',
    parentQuestionId: 'P22',
    connectedFromText: 'Connected from P1 & P22 → Checks if existing records are being migrated, copied, or transformed',
    unlocksNextText: 'If Yes, chains into M13 (Migration Checksums, Staging Encryption & Cutover Rollback)',
  },
  P26: {
    questionId: 'P26',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 11 of 14',
    parentQuestionId: 'P21',
    connectedFromText: 'Connected from P21 (Data Categories) → Identifies mandatory regulatory frameworks (RBI, PCI-DSS, DPDP)',
    unlocksNextText: 'Chains into M4.4 (DPDP Consent), M4.6 (PCI-DSS v4.0), and M16.1 (RBI SOC Audit Logging)',
  },
  P27: {
    questionId: 'P27',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 12 of 14',
    parentQuestionId: 'P4',
    connectedFromText: 'Connected from P1 & P4 (Changed Components) → Checks if new servers, containers, or DBs are provisioned',
    unlocksNextText: 'Links into Stage 4 P5 (Hosting Topology) and M10 (CIS Hardening & EDR/Vulnerability Agents)',
  },
  P28: {
    questionId: 'P28',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 13 of 14',
    parentQuestionId: 'P4',
    connectedFromText: 'Connected from P4 (Components) → Checks if AI, LLM, or Machine Learning models are used',
    unlocksNextText: 'If Yes, chains into M15 (Prompt Guardrails, Read-Only RAG Agency & Zero Data Retention)',
  },
  P30: {
    questionId: 'P30',
    chainName: 'Scope & Data Protection Chain',
    stepBadge: 'WHAT Chain · Step 14 of 14',
    parentQuestionId: 'P28',
    connectedFromText: 'Connected from Stage 1 Scope → Confirms architecture artifacts & pre-release security readiness',
    unlocksNextText: 'Completes Stage 1 (WHAT) and advances to Stage 2 (WHO — Users, Platforms & Identity)',
  },

  // STAGE 2: WHO — Users, Platforms & Ownership Chain
  P7: {
    questionId: 'P7',
    chainName: 'Identity & Ownership Chain',
    stepBadge: 'WHO Chain · Step 1 of 5',
    parentQuestionId: 'P1',
    connectedFromText: 'Connected from Stage 1 (P1 Scope) → Establishes whether the bank or an external vendor builds and runs the primary application',
    unlocksNextText: 'Chains into P8 (User Types), P29 (Third-Party Vendor Access), and M8 (Vendor Governance)',
  },
  P8: {
    questionId: 'P8',
    chainName: 'Identity & Ownership Chain',
    stepBadge: 'WHO Chain · Step 2 of 5',
    parentQuestionId: 'P7',
    connectedFromText: 'Connected from P1 & P7 → Identifies every human user group accessing the primary application',
    unlocksNextText: 'Spawns Side-by-Side User Threads + unlocks Stage 3 P9 (Interfaces), Stage 4 P10 (Network), and P12 (SSO)',
  },
  P12: {
    questionId: 'P12',
    chainName: 'Identity & Ownership Chain',
    stepBadge: 'WHO Chain · Step 3 of 5',
    parentQuestionId: 'P8',
    connectedFromText: 'Connected from P8 (Selected User Types) → Checks if any user type stores local passwords instead of Bank AD/SSO',
    unlocksNextText: 'If Yes/Not sure, chains into M2.5 (Password Hashing & Local Credential Protection)',
  },
  P29: {
    questionId: 'P29',
    chainName: 'Identity & Ownership Chain',
    stepBadge: 'WHO Chain · Step 4 of 5',
    parentQuestionId: 'P8',
    connectedFromText: 'Connected from P7 & P8 → Checks whether external vendor support engineers access bank systems or data',
    unlocksNextText: 'If Yes, chains into M8.1 (Vendor SOC2/ISO Compliance) & M8.3 (CyberArk PAM Jump-Host)',
  },
  P11: {
    questionId: 'P11',
    chainName: 'Identity & Ownership Chain',
    stepBadge: 'WHO Chain · Step 5 of 5',
    parentQuestionId: 'P29',
    connectedFromText: 'Connected from Stage 1 (P1/P4) & P8 → Identifies non-human service accounts, API clients, and RPA bots',
    unlocksNextText: 'Chains into M2.2 (CyberArk/Vault Secret Rotation) and M9 (RPA Bot Security)',
  },

  // STAGE 3: HOW — Channels, Protocols & Connectivity Chain
  P9: {
    questionId: 'P9',
    chainName: 'Platform & Channel Chain',
    stepBadge: 'HOW Chain · Step 1 of 7',
    parentQuestionId: 'P8',
    connectedFromText: 'Connected from Stage 2 P8 (User Types) → Defines the exact interfaces (Web, Mobile, CLI, VDI) used by human users',
    unlocksNextText: 'Syncs with Side-by-Side User Threads + unlocks M1.3 (Web UI) and M14 (Mobile/Desktop Security)',
  },
  P13: {
    questionId: 'P13',
    chainName: 'Platform & Channel Chain',
    stepBadge: 'HOW Chain · Step 2 of 7',
    parentQuestionId: 'P1',
    connectedFromText: 'Connected from Stage 1 (P1/P4) & Connected Apps → Identifies whether the primary application exchanges data with internal or external systems',
    unlocksNextText: 'Spawns Side-by-Side Connected App Breakdown + unlocks P14 (Protocols), P15 (Boundary), and P16 (API Gateway)',
  },
  P14: {
    questionId: 'P14',
    chainName: 'Platform & Channel Chain',
    stepBadge: 'HOW Chain · Step 3 of 7',
    parentQuestionId: 'P13',
    connectedFromText: 'Connected from P13 & Connected App Threads → Identifies all protocols (REST, SFTP, Kafka, DB Link) used across connected systems',
    unlocksNextText: 'Chains into P16 (API Gateway), M5 (API Security), M6 (SFTP File Transfer), and M7 (Message Queues)',
  },
  P15: {
    questionId: 'P15',
    chainName: 'Platform & Channel Chain',
    stepBadge: 'HOW Chain · Step 4 of 7',
    parentQuestionId: 'P14',
    connectedFromText: 'Connected from P13 & P14 → Determines whether any integration traffic crosses outside the bank network boundary',
    unlocksNextText: 'Chains into M3.1 (Trust Zones) and M12.1 (DMZ Perimeter Inspection)',
  },
  P16: {
    questionId: 'P16',
    chainName: 'Platform & Channel Chain',
    stepBadge: 'HOW Chain · Step 5 of 7',
    parentQuestionId: 'P14',
    connectedFromText: 'Connected from P14 (API Protocols) → Verifies if inbound API calls from connected systems route through the Enterprise API Gateway',
    unlocksNextText: 'Chains into M5.2 (API Gateway Throttling) or M5.6 (Direct API Gateway Bypass Controls)',
  },
  P17: {
    questionId: 'P17',
    chainName: 'Platform & Channel Chain',
    stepBadge: 'HOW Chain · Step 6 of 7',
    parentQuestionId: 'P15',
    connectedFromText: 'Connected from Stage 1 (P27 Infra) & P15 → Checks if new firewall rules, ports, or IP whitelisting are required',
    unlocksNextText: 'If Yes, chains into M12.1 (Zone Firewall Filtering) and M12.4 (Firewall Port Matrix)',
  },
  P18: {
    questionId: 'P18',
    chainName: 'Platform & Channel Chain',
    stepBadge: 'HOW Chain · Step 7 of 7',
    parentQuestionId: 'P13',
    connectedFromText: 'Connected from Stage 1 (P1 SaaS) & P13 → Checks if bank staff log into any third-party vendor-hosted web portal',
    unlocksNextText: 'Chains into M8.4 (Vendor Portal Bank SSO & IP Whitelisting) and M8.5 (Access Recertification)',
  },

  // STAGE 4: WHERE — Hosting, Environments & Network Reachability Chain
  P5: {
    questionId: 'P5',
    chainName: 'Hosting & Topology Chain',
    stepBadge: 'WHERE Chain · Step 1 of 4',
    parentQuestionId: 'P27',
    connectedFromText: 'Connected from Stage 1 (P4/P27) & Stage 3 (P13 Connected Apps) → Multi-selects all hosting platforms across the primary app and connected components',
    unlocksNextText: 'Spawns Side-by-Side Per-Application Hosting Breakdown + chains into P6 (Environments), M10, M11, and M8',
  },
  P6: {
    questionId: 'P6',
    chainName: 'Hosting & Topology Chain',
    stepBadge: 'WHERE Chain · Step 2 of 4',
    parentQuestionId: 'P5',
    connectedFromText: 'Connected from P5 (Selected Bank/Cloud Hosting Platforms) → Identifies target environments (PROD, DR, UAT, DEV)',
    unlocksNextText: 'Chains into M1.4 (Prod/Non-Prod Separation), M4.2 (UAT Data Masking), and M16.2 (DR Readiness)',
  },
  P10: {
    questionId: 'P10',
    chainName: 'Hosting & Topology Chain',
    stepBadge: 'WHERE Chain · Step 3 of 4',
    parentQuestionId: 'P8',
    connectedFromText: 'Connected from Stage 2 P8 (Users) & P5 (Hosting) → Captures all networks, zones, and devices users connect from',
    unlocksNextText: 'Syncs with Side-by-Side User Threads + unlocks M12.2 (Internet WAF), M2.6 (Bot Defense), and M14 (BYOD)',
  },
  P24: {
    questionId: 'P24',
    chainName: 'Hosting & Topology Chain',
    stepBadge: 'WHERE Chain · Step 4 of 4',
    parentQuestionId: 'P5',
    connectedFromText: 'Connected from P5 (Hosting Platforms) & Stage 1 P19 (Data) → Verifies RBI data residency within India',
    unlocksNextText: 'If Yes/Not sure, chains into M4.9 (Cross-Border Data Residency & Localization Approval)',
  },
};

// ============================================================================
// 3. DETAILED CHECKLIST YES/NO & CHAINED FOLLOW-UP DEFINITIONS (M1..M16)
// ============================================================================

export interface ChainedYesNoSubQuestion {
  id: string;
  prompt: string;
  whyItMatters: string;
}

export interface DetailedQuestionChainConfig {
  questionId: string;
  yesNoHeadline: string;
  chainFromPreliminary: string;
  yesLabel: string;
  noLabel: string;
  supportsUserPlatformThreads?: boolean;
  yesFollowUps: ChainedYesNoSubQuestion[];
  noFollowUps: ChainedYesNoSubQuestion[];
}

export const DETAILED_QUESTION_CHAINS: Record<string, DetailedQuestionChainConfig> = {
  M1_Q2: {
    questionId: 'M1_Q2',
    yesNoHeadline: 'Are automated security code scans (SAST, open-source SCA, secret scanning) and VAPT completed with zero open Critical/High issues before production release?',
    chainFromPreliminary: 'Chained from P1 (Project Scope) & P6 (Production Environment)',
    yesLabel: 'Yes — Pre-release security scans & VAPT are enforced with zero Critical/High open findings',
    noLabel: 'No — Scans/VAPT are pending or require a scheduled pre-cutover exception',
    yesFollowUps: [
      {
        id: 'M1_Q2_F1',
        prompt: 'Does the CI/CD pipeline automatically block builds if hardcoded secrets or Critical CVEs are detected?',
        whyItMatters: 'Prevents leaked credentials or vulnerable libraries from reaching UAT/Production.',
      },
      {
        id: 'M1_Q2_F2',
        prompt: 'Is an independent ISG-approved VAPT sign-off mandatory prior to production cutover?',
        whyItMatters: 'Validates runtime business-logic and API security before live traffic is enabled.',
      },
    ],
    noFollowUps: [
      {
        id: 'M1_Q2_E1',
        prompt: 'Is a formal VAPT & SAST completion window scheduled prior to Production Go-Live?',
        whyItMatters: 'Required to track pre-production closure with the ISG reviewer.',
      },
    ],
  },
  M1_Q3: {
    questionId: 'M1_Q3',
    yesNoHeadline: 'Are all user interfaces protected with strict security headers (CSP, HSTS, X-Frame-Options), anti-CSRF tokens, and secure session cookies/tokens?',
    chainFromPreliminary: 'Chained from P9 (Web/Mobile Interfaces) & Side-by-Side User Platform Threads',
    yesLabel: 'Yes — Browser/App security headers, CSRF defense & secure session tokens are enforced',
    noLabel: 'No — Legacy UI headers or custom session handling (Requires Compensating WAF)',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M1_Q3_F1',
        prompt: 'Are session tokens/cookies marked HttpOnly, Secure, and SameSite=Strict/Lax across all web portals?',
        whyItMatters: 'Stops XSS script injection from reading or stealing active login tokens.',
      },
      {
        id: 'M1_Q3_F2',
        prompt: 'Are all user-supplied inputs validated server-side to prevent XSS and injection attacks?',
        whyItMatters: 'Client-side validation alone can be bypassed via proxy tools.',
      },
    ],
    noFollowUps: [
      {
        id: 'M1_Q3_E1',
        prompt: 'Are security headers and cookie flags injected at the upstream Reverse Proxy / WAF layer instead?',
        whyItMatters: 'Edge header injection can compensate when legacy application code cannot be modified.',
      },
    ],
  },
  M1_Q4: {
    questionId: 'M1_Q4',
    yesNoHeadline: 'Is the application architected with separated Web, App, and Database tiers, and are DEV/UAT environments strictly isolated from Production?',
    chainFromPreliminary: 'Chained from P5 (Hosting Topology) & P6 (Target Environments)',
    yesLabel: 'Yes — Multi-tier separation & strict DEV / UAT / PROD environment isolation are enforced',
    noLabel: 'No — Shared components exist between environments (Requires Isolation Plan)',
    yesFollowUps: [
      {
        id: 'M1_Q4_F1',
        prompt: 'Are non-production (DEV/UAT) networks, credentials, and cloud accounts completely blocked from reaching Production databases?',
        whyItMatters: 'Ensures a compromise in UAT can never pivot into live Production systems.',
      },
      {
        id: 'M1_Q4_F2',
        prompt: 'Are separate encryption keys and service accounts used for DEV/UAT versus Production?',
        whyItMatters: 'Prevents test keys from decrypting production traffic or backups.',
      },
    ],
    noFollowUps: [
      {
        id: 'M1_Q4_E1',
        prompt: 'Are firewall ACLs and separate IAM roles enforced to block cross-environment access?',
        whyItMatters: 'Minimum required guardrail if infrastructure is shared.',
      },
    ],
  },
  M2_Q1: {
    questionId: 'M2_Q1',
    yesNoHeadline: 'Do all internal employees, partner staff, and admins authenticate via Bank Enterprise SSO / PAM with Multi-Factor Authentication (MFA) enforced?',
    chainFromPreliminary: 'Chained from P8 (User Types), P9 (Platforms) & Side-by-Side User Authentication Threads',
    yesLabel: 'Yes — Central Enterprise SSO (OIDC/SAML/AD) or CyberArk PAM with mandatory MFA is enforced',
    noLabel: 'No — Application uses local/custom credentials outside Enterprise SSO',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M2_Q1_F1',
        prompt: 'Is Multi-Factor Authentication (MFA) verified before issuing an active session across every selected user thread?',
        whyItMatters: 'Prevents credential stuffing and phishing attacks against workforce and partner accounts.',
      },
      {
        id: 'M2_Q1_F2',
        prompt: 'Are login assertions (OIDC JWT / SAML 2.0) cryptographically signed and validated for expiry and audience?',
        whyItMatters: 'Stops token replay and assertion forgery across federated portals.',
      },
    ],
    noFollowUps: [
      {
        id: 'M2_Q1_E1',
        prompt: 'Is a roadmap committed to migrate local accounts to Bank Enterprise SSO before or shortly after cutover?',
        whyItMatters: 'Required for any exception to bank-wide SSO policy.',
      },
    ],
  },
  M2_Q2: {
    questionId: 'M2_Q2',
    yesNoHeadline: 'Are all non-human service account passwords, API keys, and DB credentials stored in an enterprise Vault/KMS with automatic rotation and zero hardcoded secrets?',
    chainFromPreliminary: 'Chained from P11 (Non-Human Identities) & P21 (Secrets/Keys)',
    yesLabel: 'Yes — Stored in CyberArk / HashiCorp Vault / Cloud Secrets Manager with automated rotation',
    noLabel: 'No — Credentials are stored in local encrypted config files (Requires Remediation)',
    yesFollowUps: [
      {
        id: 'M2_Q2_F1',
        prompt: 'Are zero plaintext passwords, API keys, or private keys present in source code repositories or container images?',
        whyItMatters: 'Eliminates static credential leakage in Git or CI/CD artifacts.',
      },
      {
        id: 'M2_Q2_F2',
        prompt: 'Are service account credentials automatically rotated at least every 90 days (or issued as short-lived IAM tokens)?',
        whyItMatters: 'Limits blast radius if a runtime token is ever intercepted.',
      },
    ],
    noFollowUps: [
      {
        id: 'M2_Q2_E1',
        prompt: 'Are local configuration files OS-permission locked (0600) and encrypted using a hardware/KMS master key?',
        whyItMatters: 'Compensating protection while Vault onboarding is completed.',
      },
    ],
  },
  M2_Q3: {
    questionId: 'M2_Q3',
    yesNoHeadline: 'Are user roles strictly segregated (Viewer, Maker, Checker, Admin) with dual-approval (Maker-Checker) and PAM session recording for privileged actions?',
    chainFromPreliminary: 'Chained from P8 (Privileged Admins) & Side-by-Side User Access Scope Threads',
    yesLabel: 'Yes — Granular RBAC, Maker-Checker dual control & CyberArk PAM session recording are enforced',
    noLabel: 'No — Standard role model without Maker-Checker or PAM session recording',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M2_Q3_F1',
        prompt: 'Is Maker-Checker (two-person approval) enforced for all privileged configuration, user-role, or high-value changes?',
        whyItMatters: 'Prevents a single compromised insider or admin account from executing unilateral changes.',
      },
      {
        id: 'M2_Q3_F2',
        prompt: 'Are all CLI/SSH, VDI, and database admin sessions routed through CyberArk PAM with full keystroke/video recording?',
        whyItMatters: 'Provides tamper-proof forensic audit trails for all privileged access.',
      },
    ],
    noFollowUps: [
      {
        id: 'M2_Q3_E1',
        prompt: 'Are all administrative actions logged in real time to the central SOC SIEM with immutable audit trails?',
        whyItMatters: 'Mandatory detective control when Maker-Checker is not natively supported.',
      },
    ],
  },
  M2_Q4: {
    questionId: 'M2_Q4',
    yesNoHeadline: 'Are retail and corporate customer logins protected via CIAM with device binding, OTP/Biometric MFA, and step-up verification on transactions?',
    chainFromPreliminary: 'Chained from P8 (Customers / Corporates) & Side-by-Side Customer Thread',
    yesLabel: 'Yes — Customer CIAM with device binding, OTP/biometric MFA & transaction step-up is enforced',
    noLabel: 'No — Custom customer login flow (Requires Security Review)',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M2_Q4_F1',
        prompt: 'Is OTP generation rate-limited and cryptographically bound to the specific user session and transaction payload?',
        whyItMatters: 'Prevents OTP brute-forcing, SMS flooding, and session-swapping attacks.',
      },
      {
        id: 'M2_Q4_F2',
        prompt: 'Are corporate/BC high-value transactions protected by dual-user (Maker-Checker) authorization?',
        whyItMatters: 'Standard commercial banking control against unauthorized fund transfers.',
      },
    ],
    noFollowUps: [
      {
        id: 'M2_Q4_E1',
        prompt: 'Is WAF rate-limiting and fraud velocity monitoring active on all customer authentication endpoints?',
        whyItMatters: 'Mitigates automated credential stuffing and account takeover.',
      },
    ],
  },
  M2_Q5: {
    questionId: 'M2_Q5',
    yesNoHeadline: 'For local application logins (non-SSO), are passwords salted and hashed with Argon2id/bcrypt/PBKDF2 and protected by bank complexity & lockout policies?',
    chainFromPreliminary: 'Chained from P12 (Custom Non-SSO Login = Yes / Not sure)',
    yesLabel: 'Yes — Salted Argon2id/bcrypt/PBKDF2 hashing, strict password policy & MFA are enforced',
    noLabel: 'No — Legacy password hashing or migrating to Bank SSO before go-live',
    yesFollowUps: [
      {
        id: 'M2_Q5_F1',
        prompt: 'Does the system enforce minimum 12-character complexity, 90-day expiry, and password history (blocking reuse of last 5 passwords)?',
        whyItMatters: 'Aligns local credential stores with enterprise password policy.',
      },
      {
        id: 'M2_Q5_F2',
        prompt: 'Are accounts automatically locked after at most 5 consecutive failed login attempts?',
        whyItMatters: 'Blocks online brute-force password guessing.',
      },
    ],
    noFollowUps: [
      {
        id: 'M2_Q5_E1',
        prompt: 'Will the application complete migration to Bank Enterprise SSO prior to Production go-live?',
        whyItMatters: 'Eliminates local password storage risk entirely.',
      },
    ],
  },
  M2_Q6: {
    questionId: 'M2_Q6',
    yesNoHeadline: 'Are public/internet login endpoints protected by bot/CAPTCHA defenses, 5-attempt lockout, single active session limits, and a ≤15-minute idle timeout?',
    chainFromPreliminary: 'Chained from P10 (Internet Reachable) & P8 (Public / Customer Users)',
    yesLabel: 'Yes — WAF Bot/CAPTCHA defense, 5-strike lockout, single session & ≤15m idle logout enforced',
    noLabel: 'No — Partial bot/session controls (Requires WAF Rule Tuning)',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M2_Q6_F1',
        prompt: 'Does logging in on a new device or browser immediately invalidate or block concurrent active sessions for the same user?',
        whyItMatters: 'Prevents concurrent session hijacking and credential sharing.',
      },
      {
        id: 'M2_Q6_F2',
        prompt: 'Are server-side session tokens immediately destroyed upon user logout or after 15 minutes of inactivity?',
        whyItMatters: 'Ensures abandoned browser/mobile sessions cannot be reused.',
      },
    ],
    noFollowUps: [
      {
        id: 'M2_Q6_E1',
        prompt: 'Is Edge WAF IP rate-limiting and automated credential-stuffing protection active in Block mode?',
        whyItMatters: 'Blocks volumetric login bot attacks at the network edge.',
      },
    ],
  },
  M2_Q7: {
    questionId: 'M2_Q7',
    yesNoHeadline: 'Is user access provisioning tied to HR/Identity lifecycle automation (auto-revoking access on exit) with scheduled quarterly User Access Reviews (UAR)?',
    chainFromPreliminary: 'Chained from M2.1 (Authentication) & P8 (Workforce / Partner Users)',
    yesLabel: 'Yes — Automated AD/IAM joiner-mover-leaver sync & periodic User Access Reviews enforced',
    noLabel: 'No — Manual ticket-based access removal (Requires Monthly Audit)',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M2_Q7_F1',
        prompt: 'Are departed employee and vendor accounts automatically disabled within 24 hours of HR/contract termination?',
        whyItMatters: 'Eliminates orphaned or dormant accounts from being abused.',
      },
      {
        id: 'M2_Q7_F2',
        prompt: 'Are dormant accounts automatically disabled after 30–45 days of inactivity?',
        whyItMatters: 'Reduces attack surface from unused accounts.',
      },
    ],
    noFollowUps: [
      {
        id: 'M2_Q7_E1',
        prompt: 'Is a mandatory monthly manual access reconciliation signed off by the Application Owner?',
        whyItMatters: 'Compensating governance until automated SCIM/AD provisioning is linked.',
      },
    ],
  },
  M2_Q8: {
    questionId: 'M2_Q8',
    yesNoHeadline: 'Are baseline authentication guardrails (account lockout after ≤5 tries, password policy, concurrent session block, and ≤15m idle timeout) enforced across all portals?',
    chainFromPreliminary: 'Chained from M2.1 & Side-by-Side User Platform Threads',
    yesLabel: 'Yes — All 4 baseline authentication & session guardrails are enforced',
    noLabel: 'No — Delegated or partial session guardrails',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M2_Q8_F1',
        prompt: 'Are failed login attempts, account lockouts, and privilege escalations logged with source IP and user ID to SIEM?',
        whyItMatters: 'Enables real-time SOC correlation of brute-force attacks.',
      },
    ],
    noFollowUps: [
      {
        id: 'M2_Q8_E1',
        prompt: 'Are session timeout and lockout policies enforced upstream by the Enterprise SSO Identity Provider (IdP)?',
        whyItMatters: 'Confirms IdP-level enforcement when app-level settings are delegated.',
      },
    ],
  },
  M3_Q1: {
    questionId: 'M3_Q1',
    yesNoHeadline: 'Are Web, Application, and Database tiers isolated in separate network subnets/zones so the Database tier is never directly reachable from untrusted zones?',
    chainFromPreliminary: 'Chained from P5 (Hosting), P10 (Network) & P18 (Zones Crossed)',
    yesLabel: 'Yes — Strict 3-tier network segmentation (DMZ / App Zone / Isolated DB Zone) is enforced',
    noLabel: 'No — Flat or 2-tier internal subnet layout (Requires Microsegmentation)',
    yesFollowUps: [
      {
        id: 'M3_Q1_F1',
        prompt: 'Is direct network traffic from the DMZ/Web tier to the Database tier completely blocked (forcing all calls through the App tier)?',
        whyItMatters: 'Prevents a web-layer compromise from directly querying the database.',
      },
      {
        id: 'M3_Q1_F2',
        prompt: 'Are security groups / firewall rules restricted to specific IP/CIDR and port pairs with deny-all default rules?',
        whyItMatters: 'Prevents lateral movement between adjacent workloads.',
      },
    ],
    noFollowUps: [
      {
        id: 'M3_Q1_E1',
        prompt: 'Are host-based firewalls or Kubernetes NetworkPolicies enforced to restrict database port access strictly to the App service?',
        whyItMatters: 'Provides workload-level isolation inside shared subnets.',
      },
    ],
  },
  M3_Q2: {
    questionId: 'M3_Q2',
    yesNoHeadline: 'Does all end-to-end request traffic follow an encrypted, proxy-terminated hop-by-hop flow (Edge WAF/LB → App Tier → Isolated DB/Backend) with zero direct bypass paths?',
    chainFromPreliminary: 'Chained from M3.1 (Zone Segmentation) & P14 (Integration Protocols)',
    yesLabel: 'Yes — Verified hop-by-hop TLS 1.2/1.3 flow across Edge/Proxy, App, and Database tiers',
    noLabel: 'No — Custom or peer-to-peer traffic path (Requires Firewall Inspection)',
    yesFollowUps: [
      {
        id: 'M3_Q2_F1',
        prompt: 'Is TLS 1.2/1.3 encryption enforced on every internal hop (including Load Balancer to App and App to Database)?',
        whyItMatters: 'Prevents cleartext packet sniffing on internal data center or VPC networks.',
      },
      {
        id: 'M3_Q2_F2',
        prompt: 'Are all outbound calls from the application routed through an egress proxy or firewall with domain/IP allowlisting?',
        whyItMatters: 'Blocks unauthorized outbound command-and-control or data exfiltration connections.',
      },
    ],
    noFollowUps: [
      {
        id: 'M3_Q2_E1',
        prompt: 'Is East-West IPS firewall inspection active on all internal zone transitions?',
        whyItMatters: 'Detects anomalous protocol traffic across internal hops.',
      },
    ],
  },
  M4_Q1: {
    questionId: 'M4_Q1',
    yesNoHeadline: 'Is all data at rest (databases, object storage, file shares, and disks) encrypted using AES-256 with bank-managed KMS / HSM keys (CMKs)?',
    chainFromPreliminary: 'Chained from P20 (Confidential/Sensitive Data) & P22 (Data at Rest)',
    yesLabel: 'Yes — AES-256 encryption at rest with Customer-Managed Keys (KMS CMK / HSM) is enforced',
    noLabel: 'No — Cloud/platform default keys or unencrypted storage',
    yesFollowUps: [
      {
        id: 'M4_Q1_F1',
        prompt: 'Are the encryption keys (CMKs) automatically rotated annually with strict separation between Key Admins and Database/App Admins?',
        whyItMatters: 'Ensures storage admins cannot unilaterally extract or delete cryptographic master keys.',
      },
      {
        id: 'M4_Q1_F2',
        prompt: 'Are database snapshots, temp files, and read-replicas also encrypted using the same AES-256 CMK policy?',
        whyItMatters: 'Closes the common gap where primary DBs are encrypted but snapshots are left unencrypted.',
      },
    ],
    noFollowUps: [
      {
        id: 'M4_Q1_E1',
        prompt: 'Will Customer-Managed Keys (CMK) or Transparent Data Encryption (TDE) be enabled prior to Production go-live?',
        whyItMatters: 'Mandatory for Sensitive/Regulated banking workloads.',
      },
    ],
  },
  M4_Q6: {
    questionId: 'M4_Q6',
    yesNoHeadline: 'Is all Payment Card (PCI-DSS) data isolated inside a certified CDE zone with Hardware HSM PAN tokenization and zero CVV/PIN/Track storage?',
    chainFromPreliminary: 'Chained from P21 (Payment Card / PCI Data) & P26 (PCI-DSS v4.0)',
    yesLabel: 'Yes — Isolated PCI CDE zone, Hardware HSM PAN tokenization & zero CVV/PIN storage enforced',
    noLabel: 'No — Card data handled outside tokenized CDE (Blocks PCI Sign-Off)',
    yesFollowUps: [
      {
        id: 'M4_Q6_F1',
        prompt: 'Is primary account number (PAN) masked on all UI screens and logs (showing at most first 6 / last 4 digits)?',
        whyItMatters: 'PCI-DSS Req 3.4 mandatory display masking control.',
      },
      {
        id: 'M4_Q6_F2',
        prompt: 'Are CVV2, PIN blocks, and full magnetic stripe track data strictly never written to disk, cache, or logs after authorization?',
        whyItMatters: 'PCI-DSS Req 3.3 absolute prohibition on storing sensitive authentication data.',
      },
    ],
    noFollowUps: [
      {
        id: 'M4_Q6_E1',
        prompt: 'Is card capture fully redirected to an external PCI-DSS Level 1 certified payment gateway (zero card data touching bank servers)?',
        whyItMatters: 'Validates if scope reduction via hosted payment page applies.',
      },
    ],
  },
  M5_Q1: {
    questionId: 'M5_Q1',
    yesNoHeadline: 'Are all APIs routed through the Enterprise API Gateway (Kong / Mule / JMI) over TLS 1.2/1.3 with Mutual TLS (mTLS) and OAuth 2.0 / JWT authentication?',
    chainFromPreliminary: 'Chained from P13 (System Integrations), P14 (REST/GraphQL APIs) & P16 (API Gateway)',
    yesLabel: 'Yes — Routed via Enterprise API Gateway with TLS 1.2/1.3, mTLS & OAuth2/JWT validation',
    noLabel: 'No — Internal service mesh or direct API call without API Gateway',
    yesFollowUps: [
      {
        id: 'M5_Q1_F1',
        prompt: 'Does the API Gateway enforce strict OAuth2/JWT token signature, expiry (`exp`), and scope validation on every request?',
        whyItMatters: 'Stops unauthorized or expired tokens from reaching backend microservices.',
      },
      {
        id: 'M5_Q1_F2',
        prompt: 'Are backend API origin servers locked via firewall/security groups to accept traffic ONLY from the Enterprise API Gateway?',
        whyItMatters: 'Prevents callers from bypassing the API Gateway by hitting backend IPs directly.',
      },
    ],
    noFollowUps: [
      {
        id: 'M5_Q1_E1',
        prompt: 'Is Mutual TLS (mTLS) client certificate verification enforced directly on the backend service endpoint?',
        whyItMatters: 'Required compensating authentication when bypassing the central gateway.',
      },
    ],
  },
  M6_Q1: {
    questionId: 'M6_Q1',
    yesNoHeadline: 'Are all batch file transfers encrypted in transit using SFTP/FTPS/HTTPS with SSH key authentication and PGP payload encryption?',
    chainFromPreliminary: 'Chained from P14 (Batch File Transfer / SFTP)',
    yesLabel: 'Yes — SFTP/FTPS with SSH key auth, PGP payload encryption & IP allowlisting enforced',
    noLabel: 'No — Unencrypted FTP/SMB or password-only file transfer',
    yesFollowUps: [
      {
        id: 'M6_Q1_F1',
        prompt: 'Are inbound files automatically scanned for malware/viruses and validated for schema/checksum before ingestion?',
        whyItMatters: 'Prevents malformed or malware-laced partner batch files from entering core processing.',
      },
      {
        id: 'M6_Q1_F2',
        prompt: 'Is each external partner restricted to an isolated `chroot` SFTP directory with automatic archival/deletion of processed files?',
        whyItMatters: 'Prevents cross-partner file access and staging data accumulation.',
      },
    ],
    noFollowUps: [
      {
        id: 'M6_Q1_E1',
        prompt: 'Will legacy file transfers be migrated to the enterprise Managed File Transfer (MFT / SFTP + PGP) gateway before cutover?',
        whyItMatters: 'Plain FTP/SMB is prohibited across trust boundaries.',
      },
    ],
  },
  M8_Q1: {
    questionId: 'M8_Q1',
    yesNoHeadline: 'Has the third-party vendor/SaaS platform been verified for SOC 2 Type II / ISO 27001 certification, single-tenant isolation, and signed Right-to-Audit / NDA clauses?',
    chainFromPreliminary: 'Chained from P5 (Vendor SaaS), P7 (Vendor Operated) & P29 (Third-Party Access)',
    yesLabel: 'Yes — Verified ISO 27001 / SOC 2 Type II certification, tenant isolation & contractual clauses',
    noLabel: 'No — Vendor security due diligence or contract clauses are still in progress',
    yesFollowUps: [
      {
        id: 'M8_Q1_F1',
        prompt: 'Does the vendor contract include mandatory 6-hour cyber incident notification and RBI/regulator Right-to-Audit clauses?',
        whyItMatters: 'Mandatory under RBI IT Outsourcing & Cybersecurity Frameworks.',
      },
      {
        id: 'M8_Q1_F2',
        prompt: 'Is bank data logically/cryptographically isolated from other vendor customers with guaranteed data destruction upon contract exit?',
        whyItMatters: 'Prevents cross-tenant data leakage and ensures clean offboarding.',
      },
    ],
    noFollowUps: [
      {
        id: 'M8_Q1_E1',
        prompt: 'Is Vendor Third-Party Risk Management (TPRM) assessment scheduled for completion before contract/production sign-off?',
        whyItMatters: 'Required gate before sharing bank data with any external vendor.',
      },
    ],
  },
  M12_Q1: {
    questionId: 'M12_Q1',
    yesNoHeadline: 'Are all cross-zone network flows inspected by Next-Gen Firewalls (IPS) / WAF with explicit host/subnet CIDRs and ports documented in the Firewall Matrix?',
    chainFromPreliminary: 'Chained from P10 (Network Reachability), P17 (New Firewall Rules) & P18 (Zones Crossed)',
    yesLabel: 'Yes — WAF/DMZ & Zone Firewalls (IPS) active with explicit rules in the Firewall Table below',
    noLabel: 'No — Broad subnet rules or pending firewall matrix entry',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M12_Q1_F1',
        prompt: 'Are all firewall rules scoped to specific source/destination IPs and ports (zero `0.0.0.0/0` to internal zones or `ANY` port rules)?',
        whyItMatters: 'Eliminates overly permissive firewall rules that allow lateral network scanning.',
      },
      {
        id: 'M12_Q1_F2',
        prompt: 'Are Intrusion Prevention System (IPS) signatures and firewall deny/allow logs actively streamed to the SOC SIEM?',
        whyItMatters: 'Provides real-time visibility into blocked perimeter and east-west traffic.',
      },
    ],
    noFollowUps: [
      {
        id: 'M12_Q1_E1',
        prompt: 'Have you populated all required source IPs, destination IPs, and ports in the Firewall Rules repeater table below?',
        whyItMatters: 'Explicit port matrix is required for firewall rule approval.',
      },
    ],
  },
  M14_Q1: {
    questionId: 'M14_Q1',
    yesNoHeadline: 'Are mobile apps / BYOD endpoints protected with Root/Jailbreak detection (RASP), TLS certificate pinning, code obfuscation, and zero plaintext local storage?',
    chainFromPreliminary: 'Chained from P9 (Mobile App), P10 (BYOD) & Side-by-Side Mobile Thread',
    yesLabel: 'Yes — Mobile RASP (Root/Jailbreak block), TLS pinning & zero local sensitive data enforced',
    noLabel: 'No — Partial mobile/BYOD hardening (Requires MDM Container or RASP SDK)',
    supportsUserPlatformThreads: true,
    yesFollowUps: [
      {
        id: 'M14_Q1_F1',
        prompt: 'Does the mobile app immediately terminate execution if a rooted Android or jailbroken iOS device, debugger, or hook framework (Frida) is detected?',
        whyItMatters: 'Stops runtime tampering and reverse-engineering on compromised devices.',
      },
      {
        id: 'M14_Q1_F2',
        prompt: 'Are screen capture blocking, clipboard protection, and automatic cache wipe on logout enforced on the mobile app?',
        whyItMatters: 'Prevents background apps or device theft from capturing sensitive banking screens.',
      },
    ],
    noFollowUps: [
      {
        id: 'M14_Q1_E1',
        prompt: 'Is access restricted strictly to an enterprise MDM/MAM managed work container with zero local file download?',
        whyItMatters: 'Compensating control for corporate/vendor mobile access.',
      },
    ],
  },
  M15_Q1: {
    questionId: 'M15_Q1',
    yesNoHeadline: 'Are AI / LLM features protected by input/output prompt-injection guardrails, automated PII redaction, and private VPC inference endpoints?',
    chainFromPreliminary: 'Chained from P28 (AI / LLM Component = Yes)',
    yesLabel: 'Yes — Private LLM endpoint with prompt-injection guardrails & automated PII scrubbing enforced',
    noLabel: 'No — Direct LLM calls without automated guardrail filtering',
    yesFollowUps: [
      {
        id: 'M15_Q1_F1',
        prompt: 'Are all user prompts and RAG context chunks scrubbed of customer PII, PAN, and secrets before reaching the LLM?',
        whyItMatters: 'Prevents sensitive data leakage into model context windows or logs.',
      },
      {
        id: 'M15_Q1_F2',
        prompt: 'Are all AI prompts, retrieved citations, and model responses logged to SIEM for auditability and hallucination review?',
        whyItMatters: 'Ensures full traceability of AI-assisted outputs.',
      },
    ],
    noFollowUps: [
      {
        id: 'M15_Q1_E1',
        prompt: 'Will Amazon Bedrock Guardrails or the Enterprise AI Gateway filter be enabled prior to UAT sign-off?',
        whyItMatters: 'Mandatory gate for all generative AI workloads.',
      },
    ],
  },
  M16_Q1: {
    questionId: 'M16_Q1',
    yesNoHeadline: 'Are application security events, login failures, and admin audit logs streamed in real time to the Enterprise SOC SIEM with tamper-proof retention?',
    chainFromPreliminary: 'Chained from P6 (Production), P22 (Data in Logs) & P26 (RBI Guidelines)',
    yesLabel: 'Yes — Real-time encrypted log forwarding to Enterprise SOC SIEM with immutable retention',
    noLabel: 'No — Local server logs only (SIEM onboarding pending pre-cutover)',
    yesFollowUps: [
      {
        id: 'M16_Q1_F1',
        prompt: 'Are all log timestamps synchronized via enterprise NTP and scrubbed of plaintext passwords, tokens, and CVVs?',
        whyItMatters: 'Ensures forensic timeline accuracy while preventing secret leakage in SIEM.',
      },
      {
        id: 'M16_Q1_F2',
        prompt: 'Are audit logs retained in immutable/WORM storage for at least 180 days hot and 5+ years archive per RBI requirements?',
        whyItMatters: 'Meets regulatory audit and forensic investigation retention mandates.',
      },
    ],
    noFollowUps: [
      {
        id: 'M16_Q1_E1',
        prompt: 'Is SOC SIEM log collector onboarding scheduled to complete in UAT prior to Production cutover?',
        whyItMatters: 'Required before live production traffic is permitted.',
      },
    ],
  },
};

/**
 * Generates a deterministic Yes/No & Chained Follow-Up configuration for any Detailed Checklist question,
 * using explicit custom chains where defined and synthesizing domain-accurate Yes/No chains for all remaining questions.
 */
export function getDetailedQuestionChainConfig(
  questionId: string,
  questionText: string,
  moduleId: ModuleCode,
  showOnlyIfText?: string
): DetailedQuestionChainConfig {
  const explicit = DETAILED_QUESTION_CHAINS[questionId];
  if (explicit) return explicit;

  // Convert any open-ended "How/Briefly describe..." question text into a crisp Yes/No verification prompt
  let yesNoHeadline = questionText;
  if (/^(how|briefly|for\s|when\s|since\s|because\s|what\s|where\s)/i.test(questionText)) {
    const cleaned = questionText.replace(/:$/, '').replace(/\?$/, '');
    yesNoHeadline = `Are bank-standard security controls enforced for: ${cleaned}?`;
  }

  const supportsThreads =
    ['M2', 'M14'].includes(moduleId) ||
    ['M1_Q3', 'M8_Q3', 'M8_Q5', 'M12_Q1'].includes(questionId);

  return {
    questionId,
    yesNoHeadline,
    chainFromPreliminary: showOnlyIfText
      ? `Chained from Preliminary Trigger: ${showOnlyIfText}`
      : `Chained from Module ${moduleId} Preliminary Scope`,
    yesLabel: 'Yes — Enforced per Bank Security Architecture Standard',
    noLabel: 'No — Exception / Alternative Compensating Control',
    supportsUserPlatformThreads: supportsThreads,
    yesFollowUps: [
      {
        id: `${questionId}_F1`,
        prompt: 'Is this control enforced consistently across both Production and Disaster Recovery (DR) environments?',
        whyItMatters: 'Prevents security drift or weakened controls during DR failover.',
      },
      {
        id: `${questionId}_F2`,
        prompt: 'Are configuration changes or policy violations on this control automatically logged and alerted to the SOC SIEM?',
        whyItMatters: 'Ensures continuous compliance monitoring after go-live.',
      },
    ],
    noFollowUps: [
      {
        id: `${questionId}_E1`,
        prompt: 'Is a documented compensating control active and approved by the Security SPOC prior to go-live?',
        whyItMatters: 'Required for ISG risk-exception governance.',
      },
    ],
  };
}
