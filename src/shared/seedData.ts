import { DEFAULT_DEFINITION_VERSION, USER_PERSONAS } from './definitions';
import { evaluateSAR, redactSensitivePatterns } from './rulesEngine';
import {
  AnswerEntry,
  AttachmentSlotState,
  RepeaterTablesData,
  SARRecord,
  UserPersona,
} from './types';

const SESSION_STORAGE_PREFIX = 'smart_sar_session_v7_';
const LEGACY_STORAGE_PREFIXES = [
  'smart_sar_session_v6_',
  'smart_sar_session_v5_',
  'smart_sar_session_v4_',
  'smart_sar_session_v3_',
  'sar_navigator_session_v2_',
  'sar_navigator_offline_buffer_v1',
];
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8-hour maximum browser session lifetime
const MAX_STORAGE_BYTES = 500_000; // 500 KB hard ceiling against storage exhaustion

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeString(input: unknown, maxLen = 2000): string {
  if (typeof input !== 'string') return '';
  const withoutNulls = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return redactSensitivePatterns(withoutNulls).slice(0, maxLen);
}

/**
 * Recursively sanitizes objects before persisting to or restoring from browser storage.
 * Strips prototype-polluting keys and redacts any accidentally pasted live credentials.
 */
function deepSanitizeForStorage<T>(value: T, depth = 0): T {
  if (depth > 12 || value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return sanitizeString(value, 4000) as unknown as T;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 2000).map((item) => deepSanitizeForStorage(item, depth + 1)) as unknown as T;
  }
  const cleanObj: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(k)) continue;
    cleanObj[k] = deepSanitizeForStorage(v, depth + 1);
  }
  return cleanObj as T;
}

export function purgeLegacyPersistentStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (
        k &&
        (LEGACY_STORAGE_PREFIXES.some((p) => k.startsWith(p)) ||
          k.startsWith(SESSION_STORAGE_PREFIX))
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    // Also remove old v3 sessionStorage keys
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && LEGACY_STORAGE_PREFIXES.some((p) => k.startsWith(p))) {
        window.sessionStorage.removeItem(k);
      }
    }
  } catch {
    // Ignore if storage is disabled by browser policy
  }
}

export function getServiceNowTicketFromUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const raw =
      params.get('ticket') ||
      params.get('ritm') ||
      params.get('snowTicket') ||
      params.get('chg') ||
      params.get('inc') ||
      '';
    const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    return cleaned.slice(0, 20);
  } catch {
    return '';
  }
}

interface SampleScenarioVariant {
  displaySuffix: string;
  ticketNo: string;
  projectName: string;
  businessUnit: string;
  targetGoLiveDate: string;
  connectedAppIds: string[];
  customConnectedApps: string[];
  preliminaryDataTypes: string[];
  businessRequirement: string;
  architectureSummary: string;
  preliminaryAnswers: Record<string, unknown>;
  detailedAnswers: Record<string, unknown>;
}

const SAMPLE_SCENARIO_VARIANTS: SampleScenarioVariant[] = [
  {
    displaySuffix: '0101',
    ticketNo: 'RITM0094821',
    projectName: 'OmniPay Real-Time UPI & Merchant Settlement Gateway v2.4',
    businessUnit: 'Retail & Digital Banking',
    targetGoLiveDate: '2026-12-18',
    connectedAppIds: ['app-cmdb-101', 'app-cmdb-102', 'app-cmdb-103', 'app-cmdb-104'],
    customConnectedApps: ['NPCI UPI Switch v3.0', 'Merchant Recon Kafka Cluster'],
    preliminaryDataTypes: [
      'Personal data (PII)',
      'Financial records',
      'Card data (PCI)',
      'Login secrets or keys',
    ],
    businessRequirement:
      'Onboard high-throughput real-time merchant settlement gateway, partner SFTP clearing feed, and AI-assisted dispute triage portal for T+0 instant merchant payouts.',
    architectureSummary:
      'Three-tier hybrid architecture spanning Bank AWS Mumbai VPC (EKS microservice tier behind Akamai WAF & Enterprise API Gateway) and On-Premises Mumbai DC (Finacle Core Banking & Partner DMZ SFTP Bridge over IPsec VPN).',
    preliminaryAnswers: {
      P1: ['new_app', 'new_integration', 'enhancement'],
      P2: 'yes',
      P3: 'major',
      P4: ['ui', 'apis', 'database', 'login_access', 'integrations', 'servers_hosting', 'data_flows', 'reports'],
      P5: 'hybrid',
      P6: ['production', 'dr', 'uat', 'development'],
      P7: 'vendor_builds_bank_runs',
      P8: ['bank_employees', 'customers', 'corporates_bc', 'partner_vendor_staff', 'privileged_admins'],
      P9: ['web_browser', 'mobile_app', 'cli'],
      P10: ['corporate_network', 'vpn', 'internet', 'partner_network'],
      P11: ['service_accounts', 'api_clients', 'microservices', 'db_accounts'],
      P12: 'no',
      P13: 'both',
      P14: ['rest_api', 'webhooks', 'queues_streams', 'file_transfer', 'db_connection', 'email_smtp'],
      P15: 'yes',
      P16: 'yes_gateway',
      P17: 'yes',
      P18: 'yes',
      P19: 'yes',
      P20: 'sensitive',
      P21: ['pii', 'pci', 'financial', 'secrets_keys', 'source_code_ip'],
      P22: ['at_rest_db_files', 'in_transit', 'in_backups', 'in_logs', 'in_cache'],
      P23: 'over_1m',
      P24: 'no',
      P25: 'yes',
      P26: ['rbi_guidelines', 'pci_dss', 'dpdp_law'],
      P27: 'yes',
      P28: 'yes_bank_hosted',
      P29: 'yes',
      P30: 'All settlement microservices deploy in AWS ap-south-1 (Mumbai) with Active-Standby DR in ap-south-2 (Hyderabad) and synchronous ledger reconciliation against Finacle CBS.',
    },
    detailedAnswers: {
      M1_Q1: 'tier_1',
      M1_Q2: 'yes_automated',
      M1_Q3: 'strict_csp_hsts',
      M1_Q4: 'microservices_strict_env_sep',
      M2_Q1: 'oidc_saml_sso',
      M2_Q2: 'cyberark_vault',
      M2_Q3:
        'Privileged admin actions require Maker-Checker dual approval in ServiceNow, enforced via CyberArk PAM jump-hosts with hardware FIDO2 MFA and full keystroke/video session recording forwarded to SOC SIEM.',
      M2_Q4: 'ciam_device_mfa',
      M2_Q5: 'argon2_mfa_lockout',
      M2_Q6: 'captcha_lockout_15m_single_session',
      M2_Q7: 'automated_iga_scim_quarterly_uar',
      M2_Q8: 'lockout_5_pwd_policy_single_session_15m',
      M3_Q1: 'three_tier_segmented',
      M3_Q2:
        'External customer and merchant traffic enters via Akamai Prolexic DDoS & WAF -> DMZ Enterprise API Gateway (TLS 1.3 + mTLS) -> Internal App Subnet (EKS Settlement Pods) -> Isolated Data Subnet (RDS Aurora PostgreSQL & Finacle CBS via Direct Connect).',
      M4_Q1: 'aes256_cmk',
      M4_Q2: 'synthetic_and_masked',
      M4_Q3: 'tls13_jws_payload',
      M4_Q4: 'consent_and_automated_purge',
      M4_Q5: 'dlp_watermarked_exports',
      M4_Q6: 'cde_hsm_tokenized',
      M4_Q7: 'redis_tls_acl_ttl',
      M4_Q8: 'dam_and_pagination_cap',
      M4_Q9: 'non_payment_dpo_approved',
      M4_Q10: 'argon2_sha256_vault_90d',
      M4_Q11: 'strict_file_av_encrypted_backups',
      M4_Q12: 'vault_kms_auto_rotation_90d',
      M4_Q13: 'zero_manual_automated_encrypted_backups',
      M5_Q1: 'mtls_oauth2',
      M5_Q2: 'yes_gateway_and_app',
      M5_Q3: 'jdbc_tls_readonly_view',
      M5_Q4: 'bank_smtp_dlp_relay',
      M5_Q5: 'ISO8583 / ISO20022 financial messages wrapped inside mutually authenticated TLS 1.3 channels with strict length-prefix framing and hardware HSM MAC verification.',
      M5_Q6: 'All inbound partner API calls terminate on the DMZ Enterprise API Gateway with mTLS client certificate pinning.',
      M5_Q7: 'jwe_mle_kms_versioned',
      M5_Q8: 'realtime_api_gw_vault_secrets',
      M6_Q1: 'sftp_sshkey_pgp',
      M6_Q2: 'dmz_av_pull_only',
      M6_Q3: 'automated_sftp_key_sha256_siem',
      M7_Q1: 'kafka_mtls_acl',
      M7_Q2: 'hmac_sha256_timestamp',
      M8_Q1: 'soc2_iso27001_dedicated',
      M8_Q2: 'bank_repo_sast_build',
      M8_Q3: 'cyberark_pam_recorded',
      M8_Q4: 'saml_sso_ip_whitelist',
      M8_Q5: 'sso_rbac_quarterly_recert',
      M9_Q1: 'unattended_vault',
      M9_Q2: 'ephemeral_vdi_auto_wipe',
      M10_Q1: 'yes_golden_image',
      M10_Q2: 'signed_non_root_k8s',
      M10_Q3: 'edr_illumio_qualys_active',
      M11_Q1: 'bank_landing_zone',
      M11_Q2: 's3_block_public_cmk_irsa',
      M11_Q3: ['Q1.2', 'Q1.4', 'Q1.6', 'Q1.8', 'Q1.10', 'Q1.14', 'Q1.15', 'Q1.16', 'Q1.19', 'Q1.20', 'Q1.22', 'Q1.24'],
      M11_Q4: 'vpc_3tier_sg_privatelink_egress_fw',
      M11_Q5: 'kms_cmk_tls12_secrets_manager',
      M11_Q6: 'siem_guardduty_object_lock_multiaz_backup',
      M11_Q8: 'eks_private_irsa_pss_netpol_kms',
      M11_Q10: 'ecr_scan_immutable_kms_signed',
      M11_Q12: 's3_bpa_ssekms_securetransport_versioning',
      M11_Q14: 'rds_isolated_kms_ssl_secrets_multiaz_audit',
      M11_Q16: 'elasticache_private_kms_tls_rbac_multiaz',
      M11_Q20: 'kms_cmk_annual_rotation_sep_duties_alerting',
      M11_Q21: 'secrets_mgr_kms_autorotate_vpce_least_priv',
      M11_Q22: 'msk_private_kms_tls_iam_acls',
      M11_Q24: 'transfer_sftp_ipallow_chroot_kms_av',
      M11_Q25: 'alb_tls12_waf_drop_invalid_headers_private_tg',
      M11_Q26: 'dx_vpn_ipsec_tgw_isolated_netfw_dnsfw',
      M11_Q28: 'bedrock_vpce_guardrails_kms_kb_audit_logs',
      M12_Q1: 'waf_dmz_proxy',
      M12_Q2: 'akamai_waf_ddos_bot',
      M12_Q3: 'partner_dmz_ipsec_nat',
      M12_Q4: 'standard_ports_only_scoped',
      M13_Q1: 'tls_dms_sha256_recon',
      M13_Q2: 'crypto_shred_7days',
      M13_Q3: 'masked_nonprod_rollback_decomm',
      M14_Q1: 'full_mobile_rasp',
      M14_Q2: 'signed_binary_kiosk_wipe',
      M15_Q1: 'private_llm_guardrails',
      M15_Q2: 'read_only_rag',
      M15_Q3: 'enterprise_zero_retention_signed',
      M16_Q1: 'yes_siem_integrated',
      M16_Q2:
        'Active-Standby multi-region DR between AWS Mumbai (ap-south-1) and AWS Hyderabad (ap-south-2) with RPO <= 15 mins and RTO <= 90 mins. Immutable S3 Object-Lock backups verified via bi-annual automated DR failover drills.',
      M16_Q3: 'active_active_ha_sync_pam_logs',
    },
  },
  {
    displaySuffix: '0204',
    ticketNo: 'CHG0081940',
    projectName: 'CardVault PCI-DSS v4.0 Tokenization & Partner SFTP Recon Engine',
    businessUnit: 'Cards & Merchant Acquiring',
    targetGoLiveDate: '2026-11-30',
    connectedAppIds: ['app-cmdb-102', 'app-cmdb-101', 'app-cmdb-103'],
    customConnectedApps: ['Thales Luna HSM Cluster', 'Visa/Mastercard Clearing Gateway'],
    preliminaryDataTypes: [
      'Card data (PCI)',
      'Financial records',
      'Personal data (PII)',
      'Login secrets or keys',
    ],
    businessRequirement:
      'Upgrade PCI-DSS v4.0 Cardholder Data Environment (CDE) tokenization appliance, automate encrypted SFTP clearing batch exchanges with card networks, and deploy unattended RPA settlement bots.',
    architectureSummary:
      'Isolated On-Premises PCI CDE zone in Mumbai & Hyderabad Data Centres with hardware HSM PAN tokenization, DMZ SFTP gateway, and CyberArk-governed RPA reconciliation runners.',
    preliminaryAnswers: {
      P1: ['enhancement', 'new_integration', 'rpa_process'],
      P2: 'yes',
      P3: 'major',
      P4: ['apis', 'database', 'integrations', 'servers_hosting', 'reports'],
      P5: 'bank_dc',
      P6: ['production', 'dr', 'uat'],
      P7: 'vendor_builds_bank_runs',
      P8: ['bank_employees', 'partner_vendor_staff', 'privileged_admins'],
      P9: ['web_browser', 'cli', 'rdp_vdi'],
      P10: ['corporate_network', 'vpn', 'partner_network'],
      P11: ['service_accounts', 'api_clients', 'rpa_bots', 'db_accounts'],
      P12: 'no',
      P13: 'both',
      P14: ['rest_api', 'file_transfer', 'queues_streams'],
      P15: 'yes',
      P16: 'yes_gateway',
      P17: 'yes',
      P18: 'no',
      P19: 'yes',
      P20: 'sensitive',
      P21: ['pci', 'pii', 'financial', 'secrets_keys'],
      P22: ['at_rest_db_files', 'in_transit', 'in_backups', 'in_logs'],
      P23: 'over_1m',
      P24: 'no',
      P25: 'no',
      P26: ['pci_dss', 'rbi_guidelines', 'dpdp_law'],
      P27: 'yes',
      P28: 'no',
      P29: 'yes',
      P30: 'Strictly scoped to PCI-DSS v4.0 CDE VLANs with zero cleartext PAN outside Thales HSM boundary.',
    },
    detailedAnswers: {
      M1_Q1: 'tier_1',
      M1_Q2: 'yes_automated',
      M1_Q3: 'strict_csp_hsts',
      M1_Q4: 'three_tier_monolith_env_sep',
      M2_Q1: 'pam_bastion_sso',
      M2_Q2: 'cyberark_vault',
      M2_Q3:
        'All CDE administrative sessions require dual-custodian approval in CyberArk PAM, hardware token MFA, and full session recording retained for 365 days.',
      M2_Q7: 'automated_iga_scim_quarterly_uar',
      M2_Q8: 'lockout_5_pwd_policy_single_session_15m',
      M3_Q1: 'three_tier_segmented',
      M3_Q2:
        'Partner clearing batches enter Partner DMZ over IPsec VPN -> Malware & PGP verification -> Internal MFT Pull into App Zone -> Tokenized lookup against CardVault HSM in PCI CDE Zone.',
      M4_Q1: 'aes256_cmk',
      M4_Q2: 'synthetic_and_masked',
      M4_Q3: 'tls13_jws_payload',
      M4_Q4: 'core_banking_retention',
      M4_Q5: 'dlp_watermarked_exports',
      M4_Q6: 'cde_hsm_tokenized',
      M4_Q8: 'dam_and_pagination_cap',
      M4_Q10: 'argon2_sha256_vault_90d',
      M4_Q11: 'no_file_upload_encrypted_backups',
      M4_Q12: 'vault_kms_auto_rotation_90d',
      M4_Q13: 'zero_manual_automated_encrypted_backups',
      M5_Q1: 'mtls_oauth2',
      M5_Q2: 'yes_gateway_and_app',
      M5_Q7: 'jwe_mle_kms_versioned',
      M5_Q8: 'realtime_api_gw_vault_secrets',
      M6_Q1: 'sftp_sshkey_pgp',
      M6_Q2: 'dmz_av_pull_only',
      M6_Q3: 'automated_sftp_key_sha256_siem',
      M7_Q1: 'kafka_mtls_acl',
      M8_Q1: 'soc2_iso27001_dedicated',
      M8_Q2: 'signed_binary_va_scan',
      M8_Q3: 'cyberark_pam_recorded',
      M8_Q5: 'pam_brokered_third_party',
      M9_Q1: 'unattended_vault',
      M9_Q2: 'ephemeral_vdi_auto_wipe',
      M10_Q1: 'yes_golden_image',
      M10_Q2: 'cis_vm_hardened_db',
      M10_Q3: 'edr_illumio_qualys_active',
      M12_Q1: 'partner_ipsec_vpn',
      M12_Q2: 'api_gw_waf_throttling',
      M12_Q3: 'partner_dmz_ipsec_nat',
      M12_Q4: 'standard_ports_only_scoped',
      M16_Q1: 'yes_siem_integrated',
      M16_Q2:
        'Synchronous SAN replication to Hyderabad DR CDE cluster with automated quarterly switchover drills and air-gapped tape/object-lock backups.',
      M16_Q3: 'active_active_ha_sync_pam_logs',
    },
  },
  {
    displaySuffix: '0307',
    ticketNo: 'RITM0107553',
    projectName: 'TrustBridge Enterprise IAM & CIAM Consolidation Platform v1.0',
    businessUnit: 'Information Security & Digital Identity',
    targetGoLiveDate: '2027-02-28',
    connectedAppIds: ['app-cmdb-101', 'app-cmdb-102', 'app-cmdb-104'],
    customConnectedApps: ['SailPoint IdentityNow (IGA)', 'Okta CIAM Tenant', 'CyberArk PAM v13'],
    preliminaryDataTypes: [
      'Personal data (PII)',
      'Login secrets or keys',
      'Employee HR records',
      'Audit & log data',
    ],
    businessRequirement:
      'Consolidate fragmented on-premises Active Directory, legacy LDAP, and departmental SSO silos into a unified cloud-hosted Enterprise IAM hub with SCIM 2.0 provisioning, SAML/OIDC federation, adaptive MFA, and a separate CIAM tenant for internet-facing customer digital channels.',
    architectureSummary:
      'Azure AD B2C (CIAM) + Okta Workforce Identity (Enterprise IAM) dual-tenant architecture; SailPoint IdentityNow for IGA joiner-mover-leaver automation; CyberArk PAM for privileged vault; Azure Private Endpoints and ExpressRoute to Bank DC for on-premises hybrid directory sync.',
    preliminaryAnswers: {
      P1: ['new_app', 'enhancement', 'new_integration'],
      P2: 'yes',
      P3: 'major',
      P4: ['ui', 'apis', 'login_access', 'integrations', 'data_flows'],
      P5: 'hybrid',
      P6: ['production', 'dr', 'uat', 'development'],
      P7: 'in_house',
      P8: ['bank_employees', 'customers', 'partner_vendor_staff', 'privileged_admins'],
      P9: ['web_browser', 'mobile_app', 'rdp_vdi'],
      P10: ['corporate_network', 'vpn', 'internet'],
      P11: ['service_accounts', 'api_clients', 'db_accounts'],
      P12: 'no',
      P13: 'both',
      P14: ['rest_api', 'webhooks', 'db_connection'],
      P15: 'yes',
      P16: 'yes_gateway',
      P17: 'yes',
      P18: 'no',
      P19: 'yes',
      P20: 'sensitive',
      P21: ['pii', 'secrets_keys', 'employee_data', 'logs_telemetry'],
      P22: ['at_rest_db_files', 'in_transit', 'in_backups', 'in_logs'],
      P23: '10k_to_1m',
      P24: 'no',
      P25: 'no',
      P26: ['rbi_guidelines', 'dpdp_law', 'other'],
      P27: 'no',
      P28: 'yes_bank_hosted',
      P29: 'yes',
      P30: 'IAM platform hosted on Azure Commercial (Central India region) with ExpressRoute Private Peering to Bank Mumbai DC. DR in Azure South India. All customer identity data residency restricted to India regions per DPDP Act.',
    },
    detailedAnswers: {
      M1_Q1: 'tier_1',
      M1_Q2: 'yes_automated',
      M1_Q3: 'strict_csp_hsts',
      M1_Q4: 'microservices_strict_env_sep',
      M2_Q1: 'oidc_saml_sso',
      M2_Q2: 'cyberark_vault',
      M2_Q3:
        'Privileged IAM admin actions require dual-custodian Maker-Checker approval via CyberArk PAM with hardware FIDO2 MFA, 365-day full keystroke and screen-capture session recording forwarded to SOC SIEM.',
      M2_Q4: 'ciam_device_mfa',
      M2_Q5: 'argon2_mfa_lockout',
      M2_Q6: 'captcha_lockout_15m_single_session',
      M2_Q7: 'automated_iga_scim_quarterly_uar',
      M2_Q8: 'lockout_5_pwd_policy_single_session_15m',
      M3_Q1: 'three_tier_segmented',
      M3_Q2:
        'Customer CIAM traffic enters via Azure Front Door WAF → Okta CIAM tenant (Azure Commercial, Central India) → Azure Private Endpoint → Bank ExpressRoute → On-premises AD hybrid connector. Internal workforce SSO traverses corporate LAN only — no internet exposure.',
      M4_Q1: 'aes256_cmk',
      M4_Q2: 'synthetic_and_masked',
      M4_Q3: 'tls13_jws_payload',
      M4_Q4: 'consent_and_automated_purge',
      M4_Q5: 'dlp_watermarked_exports',
      M4_Q8: 'cloud_rds_audit_guardduty',
      M4_Q10: 'argon2_sha256_vault_90d',
      M4_Q11: 'no_file_upload_encrypted_backups',
      M4_Q12: 'vault_kms_auto_rotation_90d',
      M4_Q13: 'zero_manual_automated_encrypted_backups',
      M5_Q1: 'mtls_oauth2',
      M5_Q2: 'yes_gateway_and_app',
      M5_Q3: 'jdbc_tls_readonly_view',
      M5_Q7: 'jwe_mle_kms_versioned',
      M5_Q8: 'realtime_api_gw_vault_secrets',
      M7_Q2: 'hmac_sha256_timestamp',
      M8_Q1: 'soc2_iso27001_dedicated',
      M8_Q2: 'bank_repo_sast_build',
      M8_Q3: 'cyberark_pam_recorded',
      M8_Q4: 'saml_sso_ip_whitelist',
      M8_Q5: 'sso_rbac_quarterly_recert',
      M9_Q1: 'unattended_vault',
      M9_Q2: 'ephemeral_vdi_auto_wipe',
      M10_Q1: 'yes_golden_image',
      M10_Q2: 'signed_non_root_k8s',
      M10_Q3: 'edr_illumio_qualys_active',
      M11_Q1: 'bank_landing_zone',
      M11_Q2: 's3_block_public_cmk_irsa',
      M11_Q3: ['none_non_aws_cloud'],
      M11_Q4: 'vpc_3tier_sg_privatelink_egress_fw',
      M11_Q5: 'kms_cmk_tls12_secrets_manager',
      M11_Q6: 'siem_guardduty_object_lock_multiaz_backup',
      M12_Q1: 'waf_dmz_proxy',
      M12_Q2: 'akamai_waf_ddos_bot',
      M12_Q4: 'standard_ports_only_scoped',
      M14_Q1: 'full_mobile_rasp',
      M15_Q1: 'private_llm_guardrails',
      M15_Q2: 'read_only_rag',
      M16_Q1: 'yes_siem_integrated',
      M16_Q2:
        'Active-Standby DR between Azure Central India and Azure South India with RPO <= 30 mins and RTO <= 2 hours. Automated bi-annual DR failover drills and immutable geo-redundant backup of all identity stores.',
      M16_Q3: 'active_active_ha_sync_pam_logs',
    },
  },
];

export function createPopulatedSampleSARSession(
  persona: UserPersona = USER_PERSONAS[0],
  snowTicket?: string,
  variantIndex = 0
): SARRecord {
  const now = new Date().toISOString();
  const normalizedIdx = Math.abs(variantIndex) % SAMPLE_SCENARIO_VARIANTS.length;
  const variant = SAMPLE_SCENARIO_VARIANTS[normalizedIdx];
  const resolvedTicket =
    snowTicket !== undefined && snowTicket.trim() !== ''
      ? sanitizeString(snowTicket, 20)
      : getServiceNowTicketFromUrl() || variant.ticketNo;
  const isVarshith = persona.id === 'usr-req-varshith';
  const defaultDisplayId = isVarshith
    ? `SAR-2026-${variant.displaySuffix}`
    : `SAR-2026-${Number(variant.displaySuffix) + 1}`;
  const alternateTechSpoc = isVarshith ? 'Prathamesh' : 'Varshith';

  const answers: Record<string, AnswerEntry> = {};
  const allRawAnswers: Record<string, unknown> = {
    ...variant.preliminaryAnswers,
    ...variant.detailedAnswers,
  };

  for (const [qId, val] of Object.entries(allRawAnswers)) {
    const qDef = DEFAULT_DEFINITION_VERSION.questions.find((q) => q.id === qId);
    const resolvedVal =
      qDef?.answerType === 'long_text' && typeof val === 'string'
        ? qDef.options?.find((o) => o.id === val)?.label || val
        : val;
    answers[qId] = {
      questionId: qId,
      value: resolvedVal,
      state: 'active',
      updatedBy: persona.name,
      updatedAt: now,
      history: [{ value: resolvedVal, updatedBy: persona.name, updatedAt: now }],
    };
  }

  const tables: RepeaterTablesData = {
    servers: [],
    firewall_rules: [
      {
        id: 'fw-01',
        environment: 'Production',
        direction: 'Inbound',
        source: '172.28.4.0/24',
        destination: '10.42.16.0/24',
        port: '8443',
        protocol: 'HTTPS',
        purpose: `Mutually authenticated TLS 1.3 ingress from DMZ Enterprise API Gateway to ${variant.projectName}`,
      },
      {
        id: 'fw-02',
        environment: 'Production',
        direction: 'Outbound',
        source: '10.42.16.0/24',
        destination: '10.42.32.25/32',
        port: '5432',
        protocol: 'TCP',
        purpose: `Encrypted database connection from Private App Subnet to isolated data tier for ${variant.projectName}`,
      },
      {
        id: 'fw-03',
        environment: 'Production',
        direction: 'Outbound',
        source: '172.28.10.14/32',
        destination: '203.112.84.19/32',
        port: '22',
        protocol: 'SFTP',
        purpose: 'Outbound SSH-key authenticated + PGP-encrypted batch exchange to Partner DMZ Endpoint',
      },
    ],
    api_endpoints: [
      {
        id: 'api-01',
        name: '/api/v2/settlements/instant-payout',
        method: 'POST',
        authType: 'mTLS',
        dataClassification: 'Sensitive',
        exposure: 'API Gateway (External)',
      },
      {
        id: 'api-02',
        name: '/api/v2/merchants/reconciliation-status',
        method: 'GET',
        authType: 'OAuth2 / OIDC',
        dataClassification: 'Confidential',
        exposure: 'Partner VPN',
      },
      {
        id: 'api-03',
        name: '/cbs/v1/ledger/post-accounting-entry',
        method: 'POST',
        authType: 'JWT Bearer',
        dataClassification: 'Sensitive',
        exposure: 'Internal Only',
      },
    ],
    integrations: [
      {
        id: 'int-01',
        counterparty: 'Finacle Core Banking System (CBS)',
        direction: 'Bidirectional',
        channel: 'REST API',
        dataShared: 'Account postings, UTR reference numbers, and real-time balance checks',
        frequency: 'Real-time',
      },
      {
        id: 'int-02',
        counterparty: 'Partner SFTP Settlement Clearing House',
        direction: 'Outbound',
        channel: 'SFTP / File',
        dataShared: 'End-of-day reconciliation batch files and settlement manifests',
        frequency: 'Daily Nightly',
      },
      {
        id: 'int-03',
        counterparty: 'Enterprise IAM & Customer CIAM Gateway',
        direction: 'Inbound',
        channel: 'REST API',
        dataShared: 'Signed identity claims, role entitlements, and step-up MFA verification tokens',
        frequency: 'Real-time',
      },
    ],
  };

  const docPrefix = variant.projectName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') || 'SAR';
  const attachments: AttachmentSlotState[] = [
    {
      slotId: 'architecture_diagram',
      title: 'Reference Architecture Diagram',
      description:
        'End-to-end component topology showing trust zones (DMZ, App, DB, Cloud VPC).',
      files: [
        {
          id: 'att-arch-01',
          slotId: 'architecture_diagram',
          filename: `${docPrefix}_Reference_Architecture.pdf`,
          sanitizedName: `${docPrefix}_Reference_Architecture.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: 1_482_910,
          sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          magicBytesStatus: 'verified',
          scanStatus: 'clean',
          version: 1,
          uploadedBy: persona.name,
          uploadedAt: now,
        },
      ],
    },
    {
      slotId: 'data_flow_diagram',
      title: 'Data Flow Diagram (DFD)',
      description:
        'Shows protocols, encryption in transit, and data classification across boundaries.',
      files: [
        {
          id: 'att-dfd-01',
          slotId: 'data_flow_diagram',
          filename: `${docPrefix}_L2_Data_Flow_Trust_Boundaries.pdf`,
          sanitizedName: `${docPrefix}_L2_Data_Flow_Trust_Boundaries.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: 942_110,
          sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
          magicBytesStatus: 'verified',
          scanStatus: 'clean',
          version: 1,
          uploadedBy: persona.name,
          uploadedAt: now,
        },
      ],
    },
    {
      slotId: 'api_sequence_diagram',
      title: 'API Sequence Diagram',
      description:
        'Authentication handshake, token validation, and service-to-service call sequence.',
      files: [
        {
          id: 'att-seq-01',
          slotId: 'api_sequence_diagram',
          filename: `${docPrefix}_mTLS_OAuth2_API_Sequence.png`,
          sanitizedName: `${docPrefix}_mTLS_OAuth2_API_Sequence.png`,
          mimeType: 'image/png',
          sizeBytes: 618_400,
          sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          magicBytesStatus: 'verified',
          scanStatus: 'clean',
          version: 1,
          uploadedBy: persona.name,
          uploadedAt: now,
        },
      ],
    },
    {
      slotId: 'other_evidence',
      title: 'Supporting Security Evidence',
      description:
        'VAPT reports, vendor SOC2 certificates, or cryptographic exception approvals.',
      files: [
        {
          id: 'att-evd-01',
          slotId: 'other_evidence',
          filename: `${docPrefix}_SOC2_TypeII_and_VAPT_Signoff_2026.pdf`,
          sanitizedName: `${docPrefix}_SOC2_TypeII_and_VAPT_Signoff_2026.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: 2_140_000,
          sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
          magicBytesStatus: 'verified',
          scanStatus: 'clean',
          version: 1,
          uploadedBy: persona.name,
          uploadedAt: now,
        },
      ],
    },
  ];

  const manualCategories = { added: [], removed: [], fullReviewRequested: false };
  const initialEval = evaluateSAR(
    answers,
    tables,
    manualCategories,
    DEFAULT_DEFINITION_VERSION
  );

  // Sync active/inactive states with visibility
  const activeModSet = new Set(initialEval.activeModules.map((m) => m.code));
  const visibleQSet = new Set(initialEval.visibleQuestionIds);
  for (const [qId, ans] of Object.entries(answers)) {
    const qDef = DEFAULT_DEFINITION_VERSION.questions.find((q) => q.id === qId);
    if (!qDef) continue;
    const shouldBeActive =
      qDef.stage !== undefined
        ? visibleQSet.has(qId)
        : activeModSet.has(qDef.moduleId) && visibleQSet.has(qId);
    ans.state = shouldBeActive ? 'active' : 'inactive';
  }

  const finalEval = evaluateSAR(
    answers,
    tables,
    manualCategories,
    DEFAULT_DEFINITION_VERSION
  );

  // Pre-acknowledge any contradiction warnings if present so the sample is 100% submission-ready
  const contradictionOverrides: SARRecord['contradictionOverrides'] = {};
  for (const c of finalEval.contradictions) {
    contradictionOverrides[c.id] = {
      warningId: c.id,
      acknowledgedBy: persona.name,
      acknowledgedAt: now,
      justification:
        'Compensating DMZ reverse-proxy isolation, mTLS enforcement, and active-standby DR topology verified with ISG SAR Architecture Team.',
    };
  }

  const populatedSar: SARRecord = {
    id: `sar-session-${persona.id}`,
    displayId: resolvedTicket ? `SAR-${resolvedTicket}` : defaultDisplayId,
    status: 'draft',
    ownerId: persona.id,
    ownerName: persona.name,
    ownerEmail: '',
    createdBy: persona.name,
    updatedBy: persona.name,
    pinnedVersionId: DEFAULT_DEFINITION_VERSION.versionId,
    revisionNo: 1,
    sectionRevisions: { basics: 1, preliminary: 1 },
    createdAt: now,
    updatedAt: now,
    lastActiveScreen: 'modules',
    lastActiveStage: 4,
    lastActiveModule: 'M1',
    basics: {
      projectName: variant.projectName,
      businessRequirement: variant.businessRequirement,
      architectureSummary: variant.architectureSummary,
      businessUnit: variant.businessUnit,
      targetGoLiveDate: variant.targetGoLiveDate,
      connectedAppIds: variant.connectedAppIds,
      customConnectedApps: variant.customConnectedApps,
      preliminaryDataTypes: variant.preliminaryDataTypes,
      businessOwner: persona.name,
      businessOwnerEmail: '',
      technicalOwner: alternateTechSpoc,
      technicalOwnerEmail: '',
      securityContact: 'ISG SAR Review Team',
      ticketNo: resolvedTicket,
    },
    answers,
    tables,
    attachments,
    manualCategories,
    contradictionOverrides,
    delegations: {},
    reports: [],
    revisionHistory: [],
    evaluation: finalEval,
  };

  return populatedSar;
}

export function createBlankSARSession(
  persona: UserPersona = USER_PERSONAS[0],
  snowTicket?: string
): SARRecord {
  const now = new Date().toISOString();
  const resolvedTicket =
    snowTicket !== undefined ? sanitizeString(snowTicket, 20) : getServiceNowTicketFromUrl();
  const isVarshith = persona.id === 'usr-req-varshith';
  const defaultDisplayId = isVarshith ? 'SAR-2026-0101' : 'SAR-2026-0102';
  const alternateTechSpoc = isVarshith ? 'Prathamesh' : 'Varshith';

  const blankSar: SARRecord = {
    id: `sar-session-${persona.id}`,
    displayId: resolvedTicket ? `SAR-${resolvedTicket}` : defaultDisplayId,
    status: 'draft',
    ownerId: persona.id,
    ownerName: persona.name,
    ownerEmail: '',
    createdBy: persona.name,
    updatedBy: persona.name,
    pinnedVersionId: DEFAULT_DEFINITION_VERSION.versionId,
    revisionNo: 1,
    sectionRevisions: { basics: 1, preliminary: 1 },
    createdAt: now,
    updatedAt: now,
    lastActiveScreen: 'basics',
    lastActiveStage: 1,
    lastActiveModule: 'M1',
    basics: {
      projectName: '',
      businessRequirement: '',
      architectureSummary: '',
      businessUnit: 'Retail & Digital Banking',
      targetGoLiveDate: '',
      connectedAppIds: [],
      customConnectedApps: [],
      preliminaryDataTypes: [],
      businessOwner: persona.name,
      businessOwnerEmail: '',
      technicalOwner: alternateTechSpoc,
      technicalOwnerEmail: '',
      securityContact: 'ISG SAR Review Team',
      ticketNo: resolvedTicket,
    },
    answers: {},
    tables: {
      servers: [],
      firewall_rules: [],
      api_endpoints: [],
      integrations: [],
    },
    attachments: [
      {
        slotId: 'architecture_diagram',
        title: 'Reference Architecture Diagram',
        description:
          'End-to-end component topology showing trust zones (DMZ, App, DB, Cloud VPC).',
        files: [],
      },
      {
        slotId: 'data_flow_diagram',
        title: 'Data Flow Diagram (DFD)',
        description:
          'Shows protocols, encryption in transit, and data classification across boundaries.',
        files: [],
      },
      {
        slotId: 'api_sequence_diagram',
        title: 'API Sequence Diagram',
        description:
          'Authentication handshake, token validation, and service-to-service call sequence.',
        files: [],
      },
      {
        slotId: 'other_evidence',
        title: 'Supporting Security Evidence',
        description:
          'VAPT reports, vendor SOC2 certificates, or cryptographic exception approvals.',
        files: [],
      },
    ],
    manualCategories: { added: [], removed: [], fullReviewRequested: false },
    contradictionOverrides: {},
    delegations: {},
    reports: [],
    revisionHistory: [],
  };

  blankSar.evaluation = evaluateSAR(
    blankSar.answers,
    blankSar.tables,
    blankSar.manualCategories,
    DEFAULT_DEFINITION_VERSION
  );
  return blankSar;
}

function isSafeSARRecord(candidate: unknown): candidate is SARRecord {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false;
  const rec = candidate as Record<string, unknown>;
  if (typeof rec.id !== 'string' || typeof rec.displayId !== 'string') return false;
  if (rec.status !== 'draft' && rec.status !== 'submitted') return false;
  if (!rec.basics || typeof rec.basics !== 'object' || Array.isArray(rec.basics)) return false;
  if (!rec.answers || typeof rec.answers !== 'object' || Array.isArray(rec.answers)) return false;
  if (!rec.tables || typeof rec.tables !== 'object' || Array.isArray(rec.tables)) return false;
  return true;
}

function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJsonStringify(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj)
    .filter((k) => !FORBIDDEN_KEYS.has(k))
    .sort();
  const entries = sortedKeys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
  return `{${entries.join(',')}}`;
}

function computeIntegrityChecksum(payload: unknown): string {
  const canonical = canonicalJsonStringify(payload);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < canonical.length; i++) {
    const code = canonical.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

interface SessionEnvelope {
  schemaVersion: 'sar-session-v4';
  savedAt: number;
  expiresAt: number;
  integrityDigest: string;
  record: SARRecord;
}

export function loadBrowserSessionForRequester(
  persona: UserPersona,
  snowTicket?: string
): SARRecord {
  if (typeof window === 'undefined') {
    return createPopulatedSampleSARSession(persona, snowTicket);
  }
  purgeLegacyPersistentStorage();
  const key = `${SESSION_STORAGE_PREFIX}${persona.id}`;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw && raw.length <= MAX_STORAGE_BYTES) {
      const parsedEnvelope = JSON.parse(raw) as Partial<SessionEnvelope>;
      const now = Date.now();
      if (
        parsedEnvelope &&
        parsedEnvelope.schemaVersion === 'sar-session-v4' &&
        typeof parsedEnvelope.expiresAt === 'number' &&
        parsedEnvelope.expiresAt > now &&
        isSafeSARRecord(parsedEnvelope.record)
      ) {
        const expectedDigest = computeIntegrityChecksum(parsedEnvelope.record);
        if (parsedEnvelope.integrityDigest === expectedDigest) {
          const sanitized = deepSanitizeForStorage(parsedEnvelope.record);
          sanitized.tables.servers = [];
          sanitized.pinnedVersionId = DEFAULT_DEFINITION_VERSION.versionId;
          sanitized.ownerId = persona.id;
          sanitized.ownerName = persona.name;
          sanitized.ownerEmail = '';
          if (snowTicket && !sanitized.basics.ticketNo) {
            sanitized.basics.ticketNo = sanitizeString(snowTicket, 20);
          }
          sanitized.evaluation = evaluateSAR(
            sanitized.answers,
            sanitized.tables,
            sanitized.manualCategories,
            DEFAULT_DEFINITION_VERSION
          );
          return sanitized;
        }
      }
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Fallback to populated sample session if browser storage is unavailable
  }

  const populated = createPopulatedSampleSARSession(
    persona,
    snowTicket,
    persona.id === 'usr-req-varshith' ? 0 : 1
  );
  saveBrowserSessionForRequester(persona, populated);
  return populated;
}

export function saveBrowserSessionForRequester(persona: UserPersona, sar: SARRecord): void {
  if (typeof window === 'undefined') return;
  purgeLegacyPersistentStorage();
  const key = `${SESSION_STORAGE_PREFIX}${persona.id}`;
  try {
    const sanitizedRecord = deepSanitizeForStorage({
      ...sar,
      ownerEmail: '',
      basics: {
        ...sar.basics,
        businessOwnerEmail: '',
        technicalOwnerEmail: '',
      },
    });
    const now = Date.now();
    const envelope: SessionEnvelope = {
      schemaVersion: 'sar-session-v4',
      savedAt: now,
      expiresAt: now + SESSION_TTL_MS,
      integrityDigest: computeIntegrityChecksum(sanitizedRecord),
      record: sanitizedRecord,
    };
    const serialized = JSON.stringify(envelope);
    if (serialized.length <= MAX_STORAGE_BYTES) {
      window.sessionStorage.setItem(key, serialized);
    }
  } catch {
    // Ignore storage quota warnings
  }
}

export function clearBrowserSessionForRequester(
  persona: UserPersona,
  snowTicket?: string
): SARRecord {
  if (typeof window !== 'undefined') {
    purgeLegacyPersistentStorage();
    const key = `${SESSION_STORAGE_PREFIX}${persona.id}`;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
  const fresh = createBlankSARSession(persona, snowTicket);
  saveBrowserSessionForRequester(persona, fresh);
  return fresh;
}

export function fillRandomSampleSessionForRequester(
  persona: UserPersona,
  variantSeed = 0
): SARRecord {
  if (typeof window !== 'undefined') {
    purgeLegacyPersistentStorage();
  }
  const populated = createPopulatedSampleSARSession(persona, undefined, variantSeed);
  saveBrowserSessionForRequester(persona, populated);
  return populated;
}

export async function computeBrowserSha256(sar: SARRecord): Promise<string> {
  const canonicalPayload = canonicalJsonStringify({
    displayId: sar.displayId,
    revisionNo: sar.revisionNo,
    pinnedVersionId: sar.pinnedVersionId,
    ownerId: sar.ownerId,
    ownerName: sar.ownerName,
    basics: sar.basics,
    answers: Object.fromEntries(
      Object.entries(sar.answers).map(([k, v]) => [
        k,
        {
          questionId: v.questionId,
          value: v.value,
          naReason: v.naReason || '',
          unknownOwner: v.unknownOwner || '',
          unknownNote: v.unknownNote || '',
        },
      ])
    ),
    tables: sar.tables,
  });

  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(canonicalPayload);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback deterministic hex digest
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < canonicalPayload.length; i++) {
    h ^= canonicalPayload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return hex.repeat(8);
}

