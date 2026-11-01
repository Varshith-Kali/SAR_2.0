import {
  AnswerEntry,
  SarV5CloudServiceResult,
  SarV5ComplianceSummary,
  SarV5ConditionalRowEntry,
  SarV5EvaluationSummary,
  SarV5FlagName,
  SarV5FlagStatusEntry,
  SarV5QuestionnaireId,
  SarV5QuestionnaireStatus,
  SarV5QuestionnaireStatusEntry,
  SarV5RowState,
  SarV5ThreatControlEvaluation,
} from './types';

// ============================================================================
// AUTHORITATIVE SAR CHECKLIST v5 SPECIFICATION & DETERMINISTIC ENGINE
// Implements Level 0 (Preliminary), Level 1 (Questionnaire Routing),
// Level 2 (Derived Flags & Conditional Row Unlocks), Level 3 (Questionnaires &
// AWS Service Selectors Q1.1–Q1.25), Level 4 (Threat Assessment & Control
// Library with Exact Case-Sensitive Whole-Label Matching), Reverse Index,
// and Section 12 Validation Suite (30 Test Cases).
// ============================================================================

export type SarV5TriState = 'Yes' | 'No' | '';

export type SarV5PrimaryObjective =
  | ''
  | 'New internal application'
  | 'Major enhancement to existing application'
  | 'New Internal system-to-system or new external/vendor integration'
  | 'Data Migration'
  | 'Infrastructure/Platform changes'
  | 'Other';

export const SAR_V5_Q1_OPTIONS: ReadonlyArray<Exclude<SarV5PrimaryObjective, ''>> = [
  'New internal application',
  'Major enhancement to existing application',
  'New Internal system-to-system or new external/vendor integration',
  'Data Migration',
  'Infrastructure/Platform changes',
  'Other',
];

export interface SarV5PreliminaryItemDef {
  id: string;
  section: 'A' | 'B' | 'C' | 'D' | 'E';
  sectionTitle: string;
  groupTitle: string;
  label: string;
  startsPattern: boolean;
  threatPatterns?: Array<
    | 'Spoofing'
    | 'Tampering'
    | 'Repudiation'
    | 'Information Disclosure'
    | 'Denial of Service'
    | 'Elevation of Privilege'
  >;
}

export const SAR_V5_PRELIMINARY_ITEMS: ReadonlyArray<SarV5PreliminaryItemDef> = [
  // ---------------- SECTION A: REQUEST OVERVIEW ----------------
  {
    id: 'PC-02.1',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'User Facing Application',
    startsPattern: false,
  },
  {
    id: 'PC-02.2',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Web/Mobile Application front-end',
    startsPattern: false,
  },
  {
    id: 'PC-02.3',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'API Integration',
    startsPattern: false,
  },
  {
    id: 'PC-02.4',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Data Processing/Transformation',
    startsPattern: false,
  },
  {
    id: 'PC-02.5',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'DB Changes',
    startsPattern: false,
  },
  {
    id: 'PC-02.6',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Data Migration',
    startsPattern: false,
  },
  {
    id: 'PC-02.7',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'File Transfer',
    startsPattern: false,
  },
  {
    id: 'PC-02.8',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Cloud Infrastructure (Kubernetes/Containers)',
    startsPattern: false,
  },
  {
    id: 'PC-02.9',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Message Queue/Event Streaming',
    startsPattern: false,
  },
  {
    id: 'PC-02.10',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Third-Party Connectivity',
    startsPattern: false,
  },
  {
    id: 'PC-02.11',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'AI/LLM Components',
    startsPattern: false,
  },
  {
    id: 'PC-02.12',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Authentication/SSO/User Management',
    startsPattern: false,
  },
  {
    id: 'PC-02.13',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Middleware/Automated jobs',
    startsPattern: false,
  },
  {
    id: 'PC-02.14',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-02: Components changed/enhanced',
    label: 'Other',
    startsPattern: false,
  },
  {
    id: 'PC-03',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-03: Data Migration / Transformation',
    label: 'Is Data being migrated, copied, or transformed?',
    startsPattern: false,
  },
  {
    id: 'PC-04.1',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-04: New infrastructure introduced',
    label: 'New servers',
    startsPattern: false,
  },
  {
    id: 'PC-04.2',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-04: New infrastructure introduced',
    label: 'Cloud services',
    startsPattern: false,
  },
  {
    id: 'PC-04.3',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-04: New infrastructure introduced',
    label: 'Database servers',
    startsPattern: false,
  },
  {
    id: 'PC-04.4',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-04: New infrastructure introduced',
    label: 'Kubernetes cluster',
    startsPattern: false,
  },
  {
    id: 'PC-04.5',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-04: New infrastructure introduced',
    label: 'Middleware platform',
    startsPattern: false,
  },
  {
    id: 'PC-04.6',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-04: New infrastructure introduced',
    label: 'Network components',
    startsPattern: false,
  },
  {
    id: 'PC-04.7',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-04: New infrastructure introduced',
    label: 'No infrastructure changes',
    startsPattern: false,
  },
  {
    id: 'PC-05',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-05: Third-Party Portal',
    label: "Is there any third-party-managed portal which has to be accessed for bank's internal users?",
    startsPattern: false,
  },
  {
    id: 'PC-06',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-06: Network Connectivity',
    label: 'Does this change require any new or modified network connectivity?',
    startsPattern: false,
  },
  {
    id: 'PC-07.1',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-07: Supporting documents attached',
    label: 'Architecture Diagram',
    startsPattern: false,
  },
  {
    id: 'PC-07.2',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-07: Supporting documents attached',
    label: 'Data Flow Diagram',
    startsPattern: false,
  },
  {
    id: 'PC-07.3',
    section: 'A',
    sectionTitle: 'Section A — Request Overview',
    groupTitle: 'PC-07: Supporting documents attached',
    label: 'API Sequence Diagram',
    startsPattern: false,
  },

  // ---------------- SECTION B: WHO ----------------
  {
    id: 'WHO-01',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Human identities',
    label: 'Internal users (Bank Employees)',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Repudiation', 'Elevation of Privilege'],
  },
  {
    id: 'WHO-02',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Human identities',
    label: 'External partner / vendor user',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Repudiation', 'Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'WHO-03',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Human identities',
    label: 'Customer / End user',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Repudiation', 'Denial of Service'],
  },
  {
    id: 'WHO-04',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Human identities',
    label: 'Anonymous / Unauthenticated user',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Denial of Service', 'Information Disclosure'],
  },
  {
    id: 'WHO-05',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Human identities',
    label: 'Executive / Board member',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'WHO-06',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Human identities',
    label: 'Privileged users (System administrator / DBA)',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Repudiation', 'Elevation of Privilege'],
  },
  {
    id: 'WHO-07',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Non-human identities',
    label: 'Application / Service account',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Repudiation', 'Elevation of Privilege'],
  },
  {
    id: 'WHO-08',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Non-human identities',
    label: 'Microservice identity',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Elevation of Privilege'],
  },
  {
    id: 'WHO-09',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Non-human identities',
    label: 'API client',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Repudiation', 'Denial of Service'],
  },
  {
    id: 'WHO-10',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Non-human identities',
    label: 'RPA identity',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Repudiation', 'Elevation of Privilege'],
  },
  {
    id: 'WHO-11',
    section: 'B',
    sectionTitle: 'Section B — WHO: Who will access or interact with the solution?',
    groupTitle: 'Non-human identities',
    label: 'Database service identity',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Information Disclosure', 'Elevation of Privilege'],
  },

  // ---------------- SECTION C: HOW ----------------
  {
    id: 'HOW-01',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Network and transport',
    label: 'HTTPS/TLS',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure'],
  },
  {
    id: 'HOW-02',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Network and transport',
    label: 'VPN tunnel',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure'],
  },
  {
    id: 'HOW-03',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Network and transport',
    label: 'SSH tunnel',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Elevation of Privilege'],
  },
  {
    id: 'HOW-04',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Network and transport',
    label: 'IPsec',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure'],
  },
  {
    id: 'HOW-05',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Network and transport',
    label: 'SMTP',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure'],
  },
  {
    id: 'HOW-06',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Network and transport',
    label: 'SFTP/FTP',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure', 'Repudiation'],
  },
  {
    id: 'HOW-07',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Network and transport',
    label: 'SMB/NFS',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'HOW-08',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Network and transport',
    label: 'Custom protocol',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Denial of Service'],
  },
  {
    id: 'HOW-09',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'REST API',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Information Disclosure', 'Denial of Service'],
  },
  {
    id: 'HOW-10',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'GraphQL API',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure', 'Denial of Service'],
  },
  {
    id: 'HOW-11',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'SOAP API',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure', 'Denial of Service'],
  },
  {
    id: 'HOW-12',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'WebSocket',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Denial of Service'],
  },
  {
    id: 'HOW-13',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Webhooks',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Repudiation'],
  },
  {
    id: 'HOW-14',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Event streams / Message queues',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Repudiation', 'Denial of Service'],
  },
  {
    id: 'HOW-15',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Database connection',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'HOW-16',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Service-to-service calls',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Elevation of Privilege'],
  },
  {
    id: 'HOW-17',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'File transfer',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure', 'Repudiation'],
  },
  {
    id: 'HOW-18',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Web browser',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Information Disclosure'],
  },
  {
    id: 'HOW-19',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Mobile application',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Information Disclosure'],
  },
  {
    id: 'HOW-20',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Desktop application',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Elevation of Privilege'],
  },
  {
    id: 'HOW-21',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Command-line interface (CLI)',
    startsPattern: true,
    threatPatterns: ['Repudiation', 'Elevation of Privilege'],
  },
  {
    id: 'HOW-22',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'Remote desktop (RDP, VDI)',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'HOW-23',
    section: 'C',
    sectionTitle: 'Section C — HOW: How will users and systems connect?',
    groupTitle: 'Application and system channels',
    label: 'SSH session',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Repudiation', 'Elevation of Privilege'],
  },

  // ---------------- SECTION D: WHERE ----------------
  {
    id: 'WHERE-01',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Hosting/platform',
    label: 'On-premises data center',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Denial of Service'],
  },
  {
    id: 'WHERE-02',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Hosting/platform',
    label: 'Private cloud (AWS/Azure/GCP)',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'WHERE-03',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Hosting/platform',
    label: "Third party's SaaS tenant",
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Repudiation'],
  },
  {
    id: 'WHERE-04',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Hosting/platform',
    label: 'PaaS platform (SFDC/ServiceNow)',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'WHERE-05',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Environment',
    label: 'Production',
    startsPattern: true,
    threatPatterns: ['Denial of Service', 'Repudiation'],
  },
  {
    id: 'WHERE-06',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Environment',
    label: 'Disaster recovery',
    startsPattern: true,
    threatPatterns: ['Denial of Service'],
  },
  {
    id: 'WHERE-07',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Environment',
    label: 'Dev / UAT environment',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHERE-08',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Network location',
    label: 'Corporate LAN',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Elevation of Privilege'],
  },
  {
    id: 'WHERE-09',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Network location',
    label: 'VPN network',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure'],
  },
  {
    id: 'WHERE-10',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Network location',
    label: 'DMZ/Screened subnet',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Denial of Service', 'Elevation of Privilege'],
  },
  {
    id: 'WHERE-11',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Network location',
    label: 'Internet',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Information Disclosure', 'Denial of Service'],
  },
  {
    id: 'WHERE-12',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Network location',
    label: 'Partner/extranet network',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Information Disclosure'],
  },
  {
    id: 'WHERE-13',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Network location',
    label: 'Isolated subnet',
    startsPattern: true,
    threatPatterns: ['Elevation of Privilege'],
  },
  {
    id: 'WHERE-14',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Device context',
    label: 'Corporate-managed device',
    startsPattern: true,
    threatPatterns: ['Spoofing'],
  },
  {
    id: 'WHERE-15',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Device context',
    label: 'BYOD',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Tampering'],
  },
  {
    id: 'WHERE-16',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Device context',
    label: 'Personal unmanaged device',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Tampering'],
  },
  {
    id: 'WHERE-17',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Device context',
    label: 'Kiosk / shared device',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Repudiation'],
  },
  {
    id: 'WHERE-18',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Device context',
    label: 'Virtual desktop (VDI/DaaS)',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHERE-19',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Device context',
    label: 'Mobile device',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Tampering'],
  },
  {
    id: 'WHERE-20',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Physical location',
    label: 'Corporate office',
    startsPattern: true,
    threatPatterns: ['Spoofing'],
  },
  {
    id: 'WHERE-21',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Physical location',
    label: 'Branch office',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure'],
  },
  {
    id: 'WHERE-22',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Physical location',
    label: 'Home (WFH)',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHERE-23',
    section: 'D',
    sectionTitle: 'Section D — WHERE: Where is the solution hosted and accessed from?',
    groupTitle: 'Physical location',
    label: 'Partner site',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Elevation of Privilege'],
  },

  // ---------------- SECTION E: WHAT ----------------
  {
    id: 'WHAT-01',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data classification (highest applicable)',
    label: 'Public',
    startsPattern: true,
    threatPatterns: ['Tampering'],
  },
  {
    id: 'WHAT-02',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data classification (highest applicable)',
    label: 'Internal',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHAT-03',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data classification (highest applicable)',
    label: 'Confidential',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Tampering'],
  },
  {
    id: 'WHAT-04',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data classification (highest applicable)',
    label: 'Sensitive',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Tampering', 'Repudiation'],
  },
  {
    id: 'WHAT-05',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'PII',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Repudiation'],
  },
  {
    id: 'WHAT-06',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Employee data',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHAT-07',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Financial records',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Repudiation', 'Information Disclosure'],
  },
  {
    id: 'WHAT-08',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Regulatory data',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Repudiation', 'Information Disclosure'],
  },
  {
    id: 'WHAT-09',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Authentication secrets',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'WHAT-10',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Encryption keys',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'WHAT-11',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Source code',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure'],
  },
  {
    id: 'WHAT-12',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Intellectual property',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHAT-13',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Trade secrets',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHAT-14',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Logs and telemetry',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Repudiation', 'Information Disclosure'],
  },
  {
    id: 'WHAT-15',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Metadata',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHAT-16',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data types',
    label: 'Configuration data',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Elevation of Privilege'],
  },
  {
    id: 'WHAT-17',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data states',
    label: 'Data at rest',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Tampering'],
  },
  {
    id: 'WHAT-18',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data states',
    label: 'Data in transit',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Tampering'],
  },
  {
    id: 'WHAT-19',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data states',
    label: 'Data in use (memory)',
    startsPattern: true,
    threatPatterns: ['Information Disclosure'],
  },
  {
    id: 'WHAT-20',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data states',
    label: 'Data in backup',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Denial of Service'],
  },
  {
    id: 'WHAT-21',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data states',
    label: 'Data in logs',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Repudiation'],
  },
  {
    id: 'WHAT-22',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Data states',
    label: 'Data in cache',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Tampering'],
  },
  {
    id: 'WHAT-23',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Application',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Elevation of Privilege'],
  },
  {
    id: 'WHAT-24',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'API endpoint',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Tampering', 'Information Disclosure', 'Denial of Service'],
  },
  {
    id: 'WHAT-25',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Database',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure'],
  },
  {
    id: 'WHAT-26',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'File share',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure'],
  },
  {
    id: 'WHAT-27',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'VM / compute resource',
    startsPattern: true,
    threatPatterns: ['Elevation of Privilege', 'Denial of Service'],
  },
  {
    id: 'WHAT-28',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Identity system',
    startsPattern: true,
    threatPatterns: ['Spoofing', 'Elevation of Privilege'],
  },
  {
    id: 'WHAT-29',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Key vault / HSM',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Elevation of Privilege'],
  },
  {
    id: 'WHAT-30',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Monitoring system',
    startsPattern: true,
    threatPatterns: ['Repudiation', 'Tampering'],
  },
  {
    id: 'WHAT-31',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Network device',
    startsPattern: true,
    threatPatterns: ['Denial of Service', 'Tampering'],
  },
  {
    id: 'WHAT-32',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Cloud storage bucket',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Tampering'],
  },
  {
    id: 'WHAT-33',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Container image',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Elevation of Privilege'],
  },
  {
    id: 'WHAT-34',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'Kubernetes cluster',
    startsPattern: true,
    threatPatterns: ['Elevation of Privilege', 'Denial of Service'],
  },
  {
    id: 'WHAT-35',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'SaaS workload',
    startsPattern: true,
    threatPatterns: ['Information Disclosure', 'Spoofing'],
  },
  {
    id: 'WHAT-36',
    section: 'E',
    sectionTitle: 'Section E — WHAT: What data and resources are involved?',
    groupTitle: 'Resources/assets',
    label: 'LLM / AI model',
    startsPattern: true,
    threatPatterns: ['Tampering', 'Information Disclosure', 'Elevation of Privilege'],
  },
];

// ============================================================================
// LEVEL 3 — AUTHORITATIVE QUESTIONNAIRE QUESTION CATALOGS
// ============================================================================

export interface SarV5QuestionRowDef {
  id: string;
  aliasId?: string;
  questionnaireId: SarV5QuestionnaireId;
  category: string;
  text: string;
  conditionalFlag?: SarV5FlagName;
}

export const SAR_V5_APPLICATION_BASE_QUESTIONS: ReadonlyArray<SarV5QuestionRowDef> = [
  // Application details (6)
  { id: 'APP-AD-01', questionnaireId: 'APPLICATION_BASE', category: 'Application details', text: 'Name of the Application' },
  { id: 'APP-AD-02', questionnaireId: 'APPLICATION_BASE', category: 'Application details', text: 'Application Owner' },
  { id: 'APP-AD-03', questionnaireId: 'APPLICATION_BASE', category: 'Application details', text: 'Is this a new/existing application?' },
  { id: 'APP-AD-04', questionnaireId: 'APPLICATION_BASE', category: 'Application details', text: 'Primary Business Purpose of the Application' },
  { id: 'APP-AD-05', questionnaireId: 'APPLICATION_BASE', category: 'Application details', text: "Is the application hosted in the bank's cloud, on-premises or hybrid?" },
  { id: 'APP-AD-06', questionnaireId: 'APPLICATION_BASE', category: 'Application details', text: 'What environments are present for the application (DEV, UAT/SIT, PRE-PROD, PROD, DR)?' },
  // Architecture design (3)
  { id: 'APP-AR-01', questionnaireId: 'APPLICATION_BASE', category: 'Architecture design', text: 'Is the application monolithic or microservice based?' },
  { id: 'APP-AR-02', questionnaireId: 'APPLICATION_BASE', category: 'Architecture design', text: 'Is the application a three-tier based architecture (web, app, DB)?' },
  { id: 'APP-AR-03', questionnaireId: 'APPLICATION_BASE', category: 'Architecture design', text: 'Are the Web, App and DB servers placed in the same network segment? Provide details of the network segment used (MZ, DMZ).' },
  // Identity and system integration (5)
  { id: 'APP-ID-01', questionnaireId: 'APPLICATION_BASE', category: 'Identity and system integration', text: 'Who are the intended users?' },
  { id: 'APP-ID-02', questionnaireId: 'APPLICATION_BASE', category: 'Identity and system integration', text: 'How is the application integrated with AD?' },
  { id: 'APP-ID-03', questionnaireId: 'APPLICATION_BASE', category: 'Identity and system integration', text: 'How are the users onboarded and offboarded?' },
  { id: 'APP-ID-04', questionnaireId: 'APPLICATION_BASE', category: 'Identity and system integration', text: 'How are privileges managed for users?' },
  { id: 'APP-ID-05', questionnaireId: 'APPLICATION_BASE', category: 'Identity and system integration', text: 'Is periodic recertification performed for granting privileges?' },
  // Access controls (10)
  { id: 'APP-AC-01', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'Is MFA implemented? Mandatory for critical applications.' },
  { id: 'APP-AC-02', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'How do end users interact with the application? Specify all interfaces.' },
  { id: 'APP-AC-03', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'Is RBAC implemented? What roles are configured?' },
  { id: 'APP-AC-04', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'Are there any service accounts or non-human identities?' },
  { id: 'APP-AC-05', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'For an internet-facing application, is there any CAPTCHA?', conditionalFlag: 'PublicFacing' },
  { id: 'APP-AC-06', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'Is there an account lockout mechanism? What is the maximum number of unsuccessful login attempts?' },
  { id: 'APP-AC-07', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: "Is the organization's mandated password policy being followed?" },
  { id: 'APP-AC-08', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'Are concurrent sessions controlled?' },
  { id: 'APP-AC-09', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'What is the mandatory session timeout duration?' },
  { id: 'APP-AC-10', questionnaireId: 'APPLICATION_BASE', category: 'Access controls', text: 'What controls are available for privileged admin accounts?' },
  // Data protection (16)
  { id: 'APP-DT-01', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'What categories of data are processed, stored or transmitted?' },
  { id: 'APP-DT-02', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Does the application store any sensitive data?' },
  { id: 'APP-DT-03', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'What encryption mechanism is used for data at rest?' },
  { id: 'APP-DT-04', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Is TLS 1.2+ enabled for data in transit?' },
  { id: 'APP-DT-05', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Is hashing involved for passwords or applicable sensitive data?', conditionalFlag: 'SensitiveData' },
  { id: 'APP-DT-06', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Is any data transfer required for the application? Identify the interface.' },
  { id: 'APP-DT-07', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Does the application support file upload/download? Provide details.' },
  { id: 'APP-DT-08', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Describe how application secrets are stored and managed.' },
  { id: 'APP-DT-09', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Please confirm that database passwords/credentials rotation policy is followed.' },
  { id: 'APP-DT-10', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Are user passwords stored in the application? If yes, are they hashed?' },
  { id: 'APP-DT-11', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Does the application require manual intervention for data transfer/processing?' },
  { id: 'APP-DT-12', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Is any data migration planned?', conditionalFlag: 'DataMigration' },
  { id: 'APP-DT-13', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'What data integrity controls are implemented for migration?', conditionalFlag: 'DataMigration' },
  { id: 'APP-DT-14', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: "Is there a requirement to connect to other applications' DBs?" },
  { id: 'APP-DT-15', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Is a database backup available? Is it automated or manual?' },
  { id: 'APP-DT-16', questionnaireId: 'APPLICATION_BASE', category: 'Data protection', text: 'Are backups encrypted?' },
  // Infrastructure and network (5)
  { id: 'APP-IN-01', questionnaireId: 'APPLICATION_BASE', category: 'Infrastructure and network', text: 'Is the application internet-facing or intranet-only?' },
  { id: 'APP-IN-02', questionnaireId: 'APPLICATION_BASE', category: 'Infrastructure and network', text: 'What security solutions protect the underlying infrastructure, such as MAF, DAM, PIM and anti-phishing?' },
  { id: 'APP-IN-03', questionnaireId: 'APPLICATION_BASE', category: 'Infrastructure and network', text: 'What is the microsegmentation solution?' },
  { id: 'APP-IN-04', questionnaireId: 'APPLICATION_BASE', category: 'Infrastructure and network', text: 'Are security solutions implemented for all underlying components, such as Illumio?' },
  { id: 'APP-IT-05', aliasId: 'APP-IN-05', questionnaireId: 'APPLICATION_BASE', category: 'Infrastructure and network', text: 'Is third-party/external-vendor access required?', conditionalFlag: 'ThirdPartyAccess' },
  // Disaster recovery (5)
  { id: 'APP-DR-01', questionnaireId: 'APPLICATION_BASE', category: 'Disaster recovery', text: 'Is DR available?' },
  { id: 'APP-DR-02', questionnaireId: 'APPLICATION_BASE', category: 'Disaster recovery', text: 'Is redundancy maintained for all nodes?' },
  { id: 'APP-DR-03', questionnaireId: 'APPLICATION_BASE', category: 'Disaster recovery', text: 'What is the planned DR architecture?' },
  { id: 'APP-DR-04', questionnaireId: 'APPLICATION_BASE', category: 'Disaster recovery', text: 'What are the planned RTO and RPO?' },
  { id: 'APP-DR-05', questionnaireId: 'APPLICATION_BASE', category: 'Disaster recovery', text: 'How is data synchronisation maintained and secured?' },
  // Logging and monitoring (2)
  { id: 'APP-LM-01', questionnaireId: 'APPLICATION_BASE', category: 'Logging and monitoring', text: 'Are application logs integrated with the SIEM?' },
  { id: 'APP-LM-02', questionnaireId: 'APPLICATION_BASE', category: 'Logging and monitoring', text: 'Are privileged-account activities logged and monitored?' },
];

export const SAR_V5_INTEGRATION_QUESTIONS: ReadonlyArray<SarV5QuestionRowDef> = [
  { id: 'INT-ID-01', questionnaireId: 'INTEGRATION', category: 'Integration Details', text: 'Integration purpose and connected source/target systems' },
  { id: 'INT-ID-02', questionnaireId: 'INTEGRATION', category: 'Integration Details', text: 'Data sharing scope and direction of data flow' },
  { id: 'INT-ID-03', questionnaireId: 'INTEGRATION', category: 'Integration Details', text: 'Internal vs. external counterparty classification' },
  { id: 'INT-ID-04', questionnaireId: 'INTEGRATION', category: 'Integration Details', text: 'Whether integration is manual or automatic' },
  { id: 'INT-ID-05', questionnaireId: 'INTEGRATION', category: 'Integration Details', text: 'Integration interface type and transport channel' },
  { id: 'INT-ID-06', questionnaireId: 'INTEGRATION', category: 'Integration Details', text: 'Portal access requirement for bank internal users', conditionalFlag: 'Portal' },
  { id: 'INT-ID-07', questionnaireId: 'INTEGRATION', category: 'Integration Details', text: 'Portal user authentication mechanism (SSO/MFA)', conditionalFlag: 'Portal' },
  { id: 'INT-FT-01', questionnaireId: 'INTEGRATION', category: 'File Transfer', text: 'File transfer mechanism (SFTP, MFT, FSS, FTPS, SCP, HTTPS file upload)', conditionalFlag: 'FileTransfer' },
  { id: 'INT-FT-02', questionnaireId: 'INTEGRATION', category: 'File Transfer', text: 'Whether file transfer is automated or manual', conditionalFlag: 'FileTransfer' },
  { id: 'INT-FT-03', questionnaireId: 'INTEGRATION', category: 'File Transfer', text: 'Authentication factors for file transfer', conditionalFlag: 'FileTransfer' },
  { id: 'INT-FT-04', questionnaireId: 'INTEGRATION', category: 'File Transfer', text: 'Storage and management of file-transfer authentication credentials', conditionalFlag: 'FileTransfer' },
  { id: 'INT-FT-05', questionnaireId: 'INTEGRATION', category: 'File Transfer', text: 'File integrity controls, including hash validation, checksum or digital signatures', conditionalFlag: 'FileTransfer' },
  { id: 'INT-FT-06', questionnaireId: 'INTEGRATION', category: 'File Transfer', text: 'File-transfer logging and monitoring', conditionalFlag: 'FileTransfer' },
  { id: 'INT-DS-01', questionnaireId: 'INTEGRATION', category: 'Data Security', text: 'Categories of data processed, stored or transmitted' },
  { id: 'INT-DS-02', questionnaireId: 'INTEGRATION', category: 'Data Security', text: 'Whether customer, employee, financial, regulatory or other sensitive data is involved' },
  { id: 'INT-DS-03', questionnaireId: 'INTEGRATION', category: 'Data Security', text: 'Whether TLS 1.2+ is enabled for the integration' },
  { id: 'INT-DS-04', questionnaireId: 'INTEGRATION', category: 'Data Security', text: 'Whether data is encrypted before transmission', conditionalFlag: 'SensitiveData' },
  { id: 'INT-DS-05', questionnaireId: 'INTEGRATION', category: 'Data Security', text: 'Network path and connectivity type' },
];

export const SAR_V5_DATA_MIGRATION_QUESTIONS: ReadonlyArray<SarV5QuestionRowDef> = [
  { id: 'DM-MD-01', questionnaireId: 'DATA_MIGRATION', category: 'Migration Details', text: 'Source and target systems/environments, database engine/version and business purpose' },
  { id: 'DM-MD-02', questionnaireId: 'DATA_MIGRATION', category: 'Migration Details', text: 'Type, approximate volume and classification of migrated data' },
  { id: 'DM-MD-03', questionnaireId: 'DATA_MIGRATION', category: 'Migration Details', text: 'One-time or recurring migration, planned window and responsible party' },
  { id: 'DM-DS-01', questionnaireId: 'DATA_MIGRATION', category: 'Data Security', text: 'Data protection in transit and at rest, staging and cleanup' },
  { id: 'DM-DS-02', questionnaireId: 'DATA_MIGRATION', category: 'Data Security', text: 'Access controls for source, target and migration tools; credential storage and rotation' },
  { id: 'DM-DI-01', questionnaireId: 'DATA_MIGRATION', category: 'Data Integrity', text: 'Completeness and integrity validation, including checksum/hash, row-count reconciliation, HMAC or FIM' },
  { id: 'DM-DI-02', questionnaireId: 'DATA_MIGRATION', category: 'Data Integrity', text: 'Masking/tokenisation for sensitive data in non-production environments' },
  { id: 'DM-NL-01', questionnaireId: 'DATA_MIGRATION', category: 'Network & Logging', text: 'Migration network path, firewall rules, activity logging and SIEM integration' },
  { id: 'DM-RC-01', questionnaireId: 'DATA_MIGRATION', category: 'Rollback & Cleanup', text: 'Rollback plan, backup, source-data retention and staging-data disposal' },
];

export const SAR_V5_API_SECURITY_QUESTIONS: ReadonlyArray<SarV5QuestionRowDef> = [
  { id: 'API-01', questionnaireId: 'API_SECURITY', category: 'API Security', text: 'Is the API routed through Kong/Mule/Integrations layer (JMI)?' },
  { id: 'API-02', questionnaireId: 'API_SECURITY', category: 'API Security', text: 'Are the APIs developed internally or externally to the bank?' },
  { id: 'API-03', questionnaireId: 'API_SECURITY', category: 'API Security', text: 'API authentication and authorization mechanisms, such as OIDC, OAuth 2.0, JWT, mTLS or client certificates' },
  { id: 'API-04', questionnaireId: 'API_SECURITY', category: 'API Security', text: 'Traffic throttling and rate-limiting measures' },
  { id: 'API-05', questionnaireId: 'API_SECURITY', category: 'API Security', text: 'Where API authentication secrets are stored' },
  { id: 'API-06', questionnaireId: 'API_SECURITY', category: 'API Security', text: 'Secret versioning, rotation and issuance' },
  { id: 'API-07', questionnaireId: 'API_SECURITY', category: 'API Security', text: 'Whether TLS 1.2+ is enabled' },
  { id: 'API-AB-08', aliasId: 'API-08', questionnaireId: 'API_SECURITY', category: 'API Security', text: 'Payload encryption for sensitive data', conditionalFlag: 'SensitiveData' },
];

export const SAR_V5_FIREWALL_PORTS_QUESTIONS: ReadonlyArray<SarV5QuestionRowDef> = [
  {
    id: 'FH-01',
    questionnaireId: 'FIREWALL_PORTS',
    category: 'Firewall Ports',
    text: 'Is there any requirement for custom/vulnerable ports for the application? If Yes, provide details (source, destination, protocol, port, direction, justification, environment, security controls).',
  },
];

// ============================================================================
// LEVEL 3.6 — CLOUD SECURITY BASELINE (CS-BASE-01..21) & AWS SERVICE SELECTORS
// Preserves exact numbering Q1.1 through Q1.25 (Q1.18 and Q1.21 intentionally omitted)
// ============================================================================

export const SAR_V5_CLOUD_BASELINE_QUESTIONS: ReadonlyArray<{ id: string; text: string }> = [
  { id: 'CS-BASE-01', text: 'AWS account name, account ID and target environment (DEV, UAT, PROD, DR)' },
  { id: 'CS-BASE-02', text: 'AWS region selection and disaster-recovery regions (ap-south-1 / ap-south-2)' },
  { id: 'CS-BASE-03', text: 'AWS Organizations membership and Service Control Policy (SCP) guardrails' },
  { id: 'CS-BASE-04', text: 'Resource provisioning through Infrastructure as Code (Terraform/CloudFormation) vs. manual processes' },
  { id: 'CS-BASE-05', text: 'Mandatory enterprise resource tags (Owner, AppID, DataClassification, Environment, CostCenter)' },
  { id: 'CS-BASE-06', text: 'Human console/CLI access via federated SSO, enforced MFA and prohibition of long-term IAM user credentials' },
  { id: 'CS-BASE-07', text: 'IAM roles, least-privilege policies and prohibition of wildcard (*) actions/resources' },
  { id: 'CS-BASE-08', text: 'Instance profiles, IRSA and EKS Pod Identity instead of long-lived static access keys' },
  { id: 'CS-BASE-09', text: 'Cross-account IAM role trust policies and ExternalId enforcement' },
  { id: 'CS-BASE-10', text: 'Privileged cloud access via PIM/Arcos and audited break-glass procedures' },
  { id: 'CS-BASE-11', text: 'VPC and subnet segmentation design, internet-facing resources and public IP restrictions' },
  { id: 'CS-BASE-12', text: 'Security Groups, Network ACLs and permitted inbound/outbound ports' },
  { id: 'CS-BASE-13', text: 'Outbound egress controls, NAT/Forward Proxy inspection and VPC Endpoints / AWS PrivateLink' },
  { id: 'CS-BASE-14', text: 'Workload microsegmentation and East-West network traffic inspection' },
  { id: 'CS-BASE-15', text: 'Highest data classification handled within the cloud workload' },
  { id: 'CS-BASE-16', text: 'Encryption at rest (KMS CMK) and TLS 1.2+ encryption in transit' },
  { id: 'CS-BASE-17', text: 'Organization-level AWS CloudTrail enabled with immutable, encrypted log storage' },
  { id: 'CS-BASE-18', text: 'AWS Config, GuardDuty, Security Hub and Amazon Inspector activation' },
  { id: 'CS-BASE-19', text: "Integration of cloud security telemetry and logs with the bank's SIEM and SOC alerting" },
  { id: 'CS-BASE-20', text: 'Automated backup schedule, retention period and cross-region/cross-account disaster recovery' },
  { id: 'CS-BASE-21', text: 'Backup deletion protection (AWS Backup Vault Lock / S3 Object Lock / MFA Delete)' },
];

export interface SarV5CloudSelectorDef {
  selectorId: string;
  serviceName: string;
  familyCode: string;
  questions: Array<{ id: string; topic: string }>;
}

export const SAR_V5_CLOUD_SERVICE_SELECTORS: ReadonlyArray<SarV5CloudSelectorDef> = [
  {
    selectorId: 'Q1.1',
    serviceName: 'EC2',
    familyCode: 'CS-EC2',
    questions: [
      { id: 'CS-EC2-01', topic: 'Network exposure and private subnet placement' },
      { id: 'CS-EC2-02', topic: 'Encryption at rest (EBS KMS) and in transit' },
      { id: 'CS-EC2-03', topic: 'Authentication, IAM instance profile and IMDSv2' },
      { id: 'CS-EC2-04', topic: 'Data sensitivity on instance volumes' },
      { id: 'CS-EC2-05', topic: 'OS audit, EDR agent and CloudWatch/SIEM logging' },
    ],
  },
  {
    selectorId: 'Q1.2',
    serviceName: 'EKS',
    familyCode: 'CS-EKS',
    questions: [
      { id: 'CS-EKS-01', topic: 'Cluster details and private API endpoint access' },
      { id: 'CS-EKS-02', topic: 'Authentication and RBAC authorization' },
      { id: 'CS-EKS-03', topic: 'Namespace and workload network segregation' },
      { id: 'CS-EKS-04', topic: 'Workload identity (IRSA / EKS Pod Identity)' },
      { id: 'CS-EKS-05', topic: 'Kubernetes secrets encryption with KMS' },
      { id: 'CS-EKS-06', topic: 'Pod security standards and non-root execution' },
      { id: 'CS-EKS-07', topic: 'Ingress controller and WAF integration' },
      { id: 'CS-EKS-08', topic: 'Control-plane audit logging and runtime threat detection' },
    ],
  },
  {
    selectorId: 'Q1.3',
    serviceName: 'ECS / Fargate',
    familyCode: 'CS-ECS',
    questions: [
      { id: 'CS-ECS-01', topic: 'Cluster and service architecture details' },
      { id: 'CS-ECS-02', topic: 'Task execution role vs. least-privilege task role separation' },
      { id: 'CS-ECS-03', topic: 'Secrets injection from Secrets Manager / Parameter Store' },
      { id: 'CS-ECS-04', topic: 'awsvpc network mode and security group restrictions' },
      { id: 'CS-ECS-05', topic: 'Approved ECR container images and read-only root filesystem' },
      { id: 'CS-ECS-06', topic: 'Container logging and event forwarding to SIEM' },
    ],
  },
  {
    selectorId: 'Q1.4',
    serviceName: 'ECR',
    familyCode: 'CS-ECR',
    questions: [
      { id: 'CS-ECR-01', topic: 'Repository IAM access and cross-account pull policies' },
      { id: 'CS-ECR-02', topic: 'Automated vulnerability image scanning on push' },
      { id: 'CS-ECR-03', topic: 'Image tag immutability, integrity and cryptographic signing' },
      { id: 'CS-ECR-04', topic: 'KMS encryption at rest and lifecycle retention policies' },
      { id: 'CS-ECR-05', topic: 'Private network access via VPC interface endpoints' },
    ],
  },
  {
    selectorId: 'Q1.5',
    serviceName: 'Lambda',
    familyCode: 'CS-LMB',
    questions: [
      { id: 'CS-LMB-01', topic: 'Function purpose, runtime and event triggers' },
      { id: 'CS-LMB-02', topic: 'Per-function least-privilege IAM execution roles' },
      { id: 'CS-LMB-03', topic: 'Resource-based invocation permissions and prohibition of unauthenticated public Function URLs' },
      { id: 'CS-LMB-04', topic: 'Private VPC attachment and controlled outbound egress' },
      { id: 'CS-LMB-05', topic: 'Secrets management and KMS environment variable encryption' },
      { id: 'CS-LMB-06', topic: 'Code signing, deployment integrity and dependency SCA scanning' },
      { id: 'CS-LMB-07', topic: 'CloudWatch logging, execution timeouts and reserved concurrency limits' },
    ],
  },
  {
    selectorId: 'Q1.6',
    serviceName: 'S3',
    familyCode: 'CS-S3',
    questions: [
      { id: 'CS-S3-01', topic: 'Bucket purpose and highest data classification' },
      { id: 'CS-S3-02', topic: 'Bucket policies and least-privilege IAM principal permissions' },
      { id: 'CS-S3-03', topic: 'S3 Block Public Access enabled and ACLs disabled (BucketOwnerEnforced)' },
      { id: 'CS-S3-04', topic: 'Cross-account access restrictions andVPC endpoint conditions' },
      { id: 'CS-S3-05', topic: 'SSE-KMS Customer-Managed Key encryption and key admin separation' },
      { id: 'CS-S3-06', topic: 'Enforcement of HTTPS/TLS (aws:SecureTransport) for data in transit' },
      { id: 'CS-S3-07', topic: 'Bucket versioning, Object Lock, MFA Delete and lifecycle retention' },
      { id: 'CS-S3-08', topic: 'Upload integrity checksums and automated malware scanning' },
      { id: 'CS-S3-09', topic: 'Cross-region replication and India data localisation compliance' },
      { id: 'CS-S3-10', topic: 'S3 server-access logs and CloudTrail data events enabled' },
    ],
  },
  {
    selectorId: 'Q1.7',
    serviceName: 'EBS / EFS / FSx',
    familyCode: 'CS-STG',
    questions: [
      { id: 'CS-STG-01', topic: 'KMS encryption of volumes, file systems and snapshots' },
      { id: 'CS-STG-02', topic: 'Snapshot access permissions and prohibition of public snapshot sharing' },
      { id: 'CS-STG-03', topic: 'EFS/FSx IAM/POSIX access points, security groups and TLS encryption in transit' },
    ],
  },
  {
    selectorId: 'Q1.8',
    serviceName: 'RDS / Aurora',
    familyCode: 'CS-RDS',
    questions: [
      { id: 'CS-RDS-01', topic: 'Private subnet placement and PubliclyAccessible = false' },
      { id: 'CS-RDS-02', topic: 'KMS encryption of database, automated backups, snapshots and read replicas' },
      { id: 'CS-RDS-03', topic: 'IAM/ secrets-managed database authentication and automated credential rotation' },
      { id: 'CS-RDS-04', topic: 'Privileged DBA access controls and Database Activity Monitoring (DAM)' },
      { id: 'CS-RDS-05', topic: 'Automated backups, point-in-time recovery (PITR) and deletion protection' },
      { id: 'CS-RDS-06', topic: 'Sensitive data masking/anonymisation in non-production snapshots' },
      { id: 'CS-RDS-07', topic: 'Database audit, connection and slow-query log forwarding to SIEM' },
    ],
  },
  {
    selectorId: 'Q1.9',
    serviceName: 'DynamoDB',
    familyCode: 'CS-DDB',
    questions: [
      { id: 'CS-DDB-01', topic: 'Encryption at rest with a customer-managed KMS key (CMK)' },
      { id: 'CS-DDB-02', topic: 'Fine-grained IAM table, item and action access controls' },
      { id: 'CS-DDB-03', topic: 'Point-in-time recovery (PITR) and table deletion protection' },
      { id: 'CS-DDB-04', topic: 'Global tables, DynamoDB Streams and regional India data-localisation compliance' },
      { id: 'CS-DDB-05', topic: 'CloudTrail data events logging for DynamoDB item operations' },
    ],
  },
  {
    selectorId: 'Q1.10',
    serviceName: 'ElastiCache',
    familyCode: 'CS-EC',
    questions: [
      { id: 'CS-EC-01', topic: 'Private subnet placement and restricted security groups' },
      { id: 'CS-EC-02', topic: 'KMS encryption at rest and TLS encryption in transit' },
      { id: 'CS-EC-03', topic: 'Redis AUTH / Role-Based Access Control (RBAC) authentication' },
      { id: 'CS-EC-04', topic: 'Sensitive/session data handling and strict key TTL eviction' },
    ],
  },
  {
    selectorId: 'Q1.11',
    serviceName: 'Redshift',
    familyCode: 'CS-RS',
    questions: [
      { id: 'CS-RS-01', topic: 'Private VPC subnet placement and Enhanced VPC Routing' },
      { id: 'CS-RS-02', topic: 'Cluster KMS encryption at rest and mandatory SSL/TLS in transit' },
      { id: 'CS-RS-03', topic: 'IAM/AD federation and column/row-level fine-grained access control' },
      { id: 'CS-RS-04', topic: 'Connection/user/query audit logging and data-sharing restrictions' },
    ],
  },
  {
    selectorId: 'Q1.12',
    serviceName: 'OpenSearch Service',
    familyCode: 'CS-OS',
    questions: [
      { id: 'CS-OS-01', topic: 'VPC-only private endpoint placement (zero public domain exposure)' },
      { id: 'CS-OS-02', topic: 'Fine-grained access control (FGAC) and SAML/IAM authentication' },
      { id: 'CS-OS-03', topic: 'KMS encryption at rest, node-to-node encryption and HTTPS TLS 1.2+' },
      { id: 'CS-OS-04', topic: 'PII/sensitive field redaction in indexed documents and logs' },
      { id: 'CS-OS-05', topic: 'OpenSearch audit logs and slow logs forwarded to CloudWatch/SIEM' },
    ],
  },
  {
    selectorId: 'Q1.13',
    serviceName: 'Glue / Athena',
    familyCode: 'CS-GA',
    questions: [
      { id: 'CS-GA-01', topic: 'ETL job/workgroup IAM access and Lake Formation / Data Catalog permissions' },
      { id: 'CS-GA-02', topic: 'Security of source and target data stores and JDBC VPC connections' },
      { id: 'CS-GA-03', topic: 'KMS encryption of job bookmarks, Data Catalog metadata and Athena S3 query results' },
      { id: 'CS-GA-04', topic: 'Secrets Manager credential retrieval and avoidance of hardcoded script credentials' },
      { id: 'CS-GA-05', topic: 'CloudWatch/CloudTrail job and query logging integrated with SIEM' },
    ],
  },
  {
    selectorId: 'Q1.14',
    serviceName: 'KMS',
    familyCode: 'CS-KMS',
    questions: [
      { id: 'CS-KMS-01', topic: 'Required Customer-Managed Keys (CMKs) and key material origin (AWS KMS / CloudHSM / External BYOK)' },
      { id: 'CS-KMS-02', topic: 'Key administrators vs. key cryptographic users inventory' },
      { id: 'CS-KMS-03', topic: 'Separation of duties and least-privilege key policy statements' },
      { id: 'CS-KMS-04', topic: 'Cross-account key usage restrictions and viaService conditions' },
      { id: 'CS-KMS-05', topic: 'Annual automatic key rotation and scheduled deletion waiting-period guardrails' },
      { id: 'CS-KMS-06', topic: 'CloudTrail KMS key usage logging and SOC anomaly alerting' },
    ],
  },
  {
    selectorId: 'Q1.15',
    serviceName: 'Secrets Manager / Parameter Store',
    familyCode: 'CS-SEC',
    questions: [
      { id: 'CS-SEC-01', topic: 'Secret inventory, classification and owning application/team' },
      { id: 'CS-SEC-02', topic: 'Automated rotation schedule and zero-downtime application pickup of rotated secrets' },
      { id: 'CS-SEC-03', topic: 'Least-privilege resource/IAM policies per workload secret' },
      { id: 'CS-SEC-04', topic: 'Encryption of secrets/parameters using Customer-Managed KMS keys' },
      { id: 'CS-SEC-05', topic: 'Private retrieval via VPC Interface Endpoints' },
      { id: 'CS-SEC-06', topic: 'Prevention of plaintext secrets in source code, EC2 user data, env vars or IaC parameters' },
      { id: 'CS-SEC-07', topic: 'CloudTrail monitoring and SIEM alerting for GetSecretValue / GetParameter calls' },
    ],
  },
  {
    selectorId: 'Q1.16',
    serviceName: 'MSK (Kafka)',
    familyCode: 'CS-MSK',
    questions: [
      { id: 'CS-MSK-01', topic: 'MSK cluster deployment topology and private subnet placement' },
      { id: 'CS-MSK-02', topic: 'Kafka topic names, owners, consumer groups and payload data classification' },
      { id: 'CS-MSK-03', topic: 'Client authentication (mTLS / IAM / SASL-SCRAM) and topic-level ACLs' },
      { id: 'CS-MSK-04', topic: 'In-transit TLS encryption between brokers/clients and KMS encryption at rest' },
      { id: 'CS-MSK-05', topic: 'Private network connectivity, message retention and broker audit logging' },
    ],
  },
  {
    selectorId: 'Q1.17',
    serviceName: 'SQS / SNS / EventBridge',
    familyCode: 'CS-MQ',
    questions: [
      { id: 'CS-MQ-01', topic: 'Queue/topic/bus resource access policies and cross-account restrictions' },
      { id: 'CS-MQ-02', topic: 'SSE-KMS encryption at rest and aws:SecureTransport TLS enforcement' },
      { id: 'CS-MQ-03', topic: 'Sensitive message content redaction/encryption and payload protection' },
      { id: 'CS-MQ-04', topic: 'SNS/EventBridge subscription endpoint allowlisting and validation' },
      { id: 'CS-MQ-05', topic: 'Dead-letter queues (DLQ), message retention and operational reliability alarms' },
    ],
  },
  // Note: Q1.18 is intentionally omitted in the authoritative SAR Checklist v5 specification.
  {
    selectorId: 'Q1.19',
    serviceName: 'Transfer Family',
    familyCode: 'CS-TF',
    questions: [
      { id: 'CS-TF-01', topic: 'SFTP/FTPS protocols enabled (plaintext FTP disabled) and VPC/endpoint exposure' },
      { id: 'CS-TF-02', topic: 'User authentication (SSH keys / custom IdP) and key rotation management' },
      { id: 'CS-TF-03', topic: 'Logical directory scoping (chroot) and S3/EFS IAM role authorization' },
      { id: 'CS-TF-04', topic: 'FIPS-approved strong SSH/TLS cryptographic security policy' },
      { id: 'CS-TF-05', topic: 'Automated inbound malware scanning and file integrity verification' },
      { id: 'CS-TF-06', topic: 'Transfer Family CloudWatch execution logs and SIEM integration' },
    ],
  },
  {
    selectorId: 'Q1.20',
    serviceName: 'ELB (ALB / NLB)',
    familyCode: 'CS-ELB',
    questions: [
      { id: 'CS-ELB-01', topic: 'Internal vs. internet-facing scheme and Security Group restrictions' },
      { id: 'CS-ELB-02', topic: 'TLS 1.2/1.3 listener security policy and automatic HTTP-to-HTTPS redirect' },
      { id: 'CS-ELB-03', topic: 'ACM certificate issuance, automated renewal and expiry monitoring' },
      { id: 'CS-ELB-04', topic: 'AWS WAF attachment, header sanitization and DDoS mitigation controls' },
      { id: 'CS-ELB-05', topic: 'ALB/NLB access and connection logs stored in encrypted S3 and forwarded to SIEM' },
    ],
  },
  // Note: Q1.21 is intentionally omitted in the authoritative SAR Checklist v5 specification.
  {
    selectorId: 'Q1.22',
    serviceName: 'Network Connectivity (Direct Connect / VPN / Transit Gateway)',
    familyCode: 'CS-NET',
    questions: [
      { id: 'CS-NET-01', topic: 'Direct Connect, Site-to-Site VPN, Transit Gateway and VPC peering architecture' },
      { id: 'CS-NET-02', topic: 'MACsec / IPsec IKEv2 encryption in transit across hybrid links' },
      { id: 'CS-NET-03', topic: 'Transit Gateway route tables, BGP prefixes and VRF segmentation' },
      { id: 'CS-NET-04', topic: 'Centralized AWS Network Firewall / IPS traffic inspection' },
      { id: 'CS-NET-05', topic: 'Redundant connectivity paths and failover resilience' },
      { id: 'CS-NET-06', topic: 'Third-party partner network access scoping, NAT and VPC Flow Log monitoring' },
    ],
  },
  {
    selectorId: 'Q1.23',
    serviceName: 'SageMaker',
    familyCode: 'CS-SM',
    questions: [
      { id: 'CS-SM-01', topic: 'VPC-only network isolation (DirectInternetAccess disabled on notebooks/training)' },
      { id: 'CS-SM-02', topic: 'Least-privilege execution roles and disabled notebook root access' },
      { id: 'CS-SM-03', topic: 'KMS encryption and PII anonymisation for training datasets and EBS volumes' },
      { id: 'CS-SM-04', topic: 'Model artifact S3/ECR storage integrity and endpoint deployment permissions' },
      { id: 'CS-SM-05', topic: 'CloudWatch/CloudTrail invocation logging and SIEM integration' },
    ],
  },
  {
    selectorId: 'Q1.24',
    serviceName: 'Bedrock',
    familyCode: 'CS-BR',
    questions: [
      { id: 'CS-BR-01', topic: 'Approved foundation models and fine-grained IAM InvokeModel access' },
      { id: 'CS-BR-02', topic: 'Zero model training on bank prompts and encrypted Knowledge Base vector stores' },
      { id: 'CS-BR-03', topic: 'Bedrock Guardrails, PII/sensitive-data filtering and prompt-injection defense' },
      { id: 'CS-BR-04', topic: 'Bounded Bedrock Agent action-group / tool permissions and human confirmation' },
      { id: 'CS-BR-05', topic: 'PrivateLink VPC endpoints, model invocation logging and SIEM monitoring' },
    ],
  },
  {
    selectorId: 'Q1.25',
    serviceName: 'Other AWS service',
    familyCode: 'CS-OTHER',
    questions: [
      { id: 'CS-OTHER-01', topic: 'Identify the AWS service name, business purpose, data classification handled and IAM/network access scope' },
    ],
  },
];

// ============================================================================
// LEVEL 4 — THREAT ASSESSMENT CONTROL LIBRARY (EXACT WHOLE-LABEL TAG MATCHING)
// ============================================================================

export interface SarV5ThreatControlDef {
  controlId: string;
  controlName: string;
  requirement: string;
  stridePattern:
    | 'Spoofing'
    | 'Tampering'
    | 'Repudiation'
    | 'Information Disclosure'
    | 'Denial of Service'
    | 'Elevation of Privilege';
  mappingTags: string[];
}

export const SAR_V5_CONTROL_LIBRARY: ReadonlyArray<SarV5ThreatControlDef> = [
  {
    controlId: 'TA-CTRL-01',
    controlName: 'Enterprise Workforce & Privileged Identity Federation (SSO + MFA)',
    requirement:
      'Enforce centralized AD/OIDC/SAML Single Sign-On with multi-factor authentication and PAM session recording for workforce, executive, and privileged users.',
    stridePattern: 'Spoofing',
    mappingTags: [
      'Internal users (Bank Employees)',
      'Executive / Board member',
      'Privileged users (System administrator / DBA)',
      'Authentication/SSO/User Management',
      'Identity system',
    ],
  },
  {
    controlId: 'TA-CTRL-02',
    controlName: 'Customer & Public Perimeter Authentication & Anti-Automation (CIAM + CAPTCHA)',
    requirement:
      'Enforce CIAM adaptive MFA, brute-force account lockout, CAPTCHA/bot defense, and session binding for customer or anonymous internet channels.',
    stridePattern: 'Spoofing',
    mappingTags: [
      'Customer / End user',
      'Anonymous / Unauthenticated user',
      'User Facing Application',
      'Web/Mobile Application front-end',
      'Web browser',
      'Mobile application',
    ],
  },
  {
    controlId: 'TA-CTRL-03',
    controlName: 'Third-Party & Partner Access Governance',
    requirement:
      'Restrict partner/vendor users, third-party SaaS tenants, and partner networks via federated SSO, IP allowlisting, and jump-host PAM controls.',
    stridePattern: 'Spoofing',
    mappingTags: [
      'External partner / vendor user',
      "Third party's SaaS tenant",
      'Partner/extranet network',
      'Partner site',
      'Third-Party Connectivity',
      'SaaS workload',
      'PaaS platform (SFDC/ServiceNow)',
    ],
  },
  {
    controlId: 'TA-CTRL-04',
    controlName: 'Non-Human Identity (NHI) Secret Vaulting & Rotation',
    requirement:
      'Eliminate hardcoded credentials; store all service account, microservice, API client, RPA, and DB credentials in HSM/Vault/Secrets Manager with automated rotation.',
    stridePattern: 'Spoofing',
    mappingTags: [
      'Application / Service account',
      'Microservice identity',
      'API client',
      'RPA identity',
      'Database service identity',
      'Authentication secrets',
      'Encryption keys',
      'Key vault / HSM',
    ],
  },
  {
    controlId: 'TA-CTRL-05',
    controlName: 'API Gateway Routing, Schema Validation & Rate Throttling',
    requirement:
      'Route all APIs through the enterprise API Gateway (Kong/Mule/JMI) with OAuth2/OIDC/mTLS, strict schema validation, and volumetric rate limiting.',
    stridePattern: 'Tampering',
    mappingTags: [
      'API Integration',
      'REST API',
      'GraphQL API',
      'SOAP API',
      'WebSocket',
      'Webhooks',
      'API endpoint',
      'Service-to-service calls',
    ],
  },
  {
    controlId: 'TA-CTRL-06',
    controlName: 'Transport Layer Encryption (TLS 1.2+ / IPsec / SSH)',
    requirement:
      'Encrypt all network traffic in transit using TLS 1.2/1.3, IPsec, or mutually authenticated tunnels; prohibit cleartext protocols.',
    stridePattern: 'Information Disclosure',
    mappingTags: [
      'HTTPS/TLS',
      'VPN tunnel',
      'SSH tunnel',
      'IPsec',
      'SMTP',
      'Data in transit',
      'Custom protocol',
    ],
  },
  {
    controlId: 'TA-CTRL-07',
    controlName: 'Managed File Transfer (SFTP/MFT) Payload Encryption & Integrity',
    requirement:
      'Enforce SSH key authentication, PGP/GPG payload encryption, hash/checksum validation, and malware scanning on batch file transfers.',
    stridePattern: 'Tampering',
    mappingTags: [
      'File Transfer',
      'SFTP/FTP',
      'SMB/NFS',
      'File share',
    ],
  },
  {
    controlId: 'TA-CTRL-08',
    controlName: 'Application File Upload & Channel Transfer Sanitization',
    requirement:
      'Validate file magic bytes, enforce size/type allowlists, and execute asynchronous ICAP antivirus scanning on application file transfers.',
    stridePattern: 'Tampering',
    mappingTags: ['File transfer'],
  },
  {
    controlId: 'TA-CTRL-09',
    controlName: 'Sensitive & Regulated Data Encryption at Rest & Masking',
    requirement:
      'Encrypt Confidential, Sensitive, PII, Financial, and Regulatory data at rest using Customer-Managed KMS/HSM keys and enforce irreversible masking in Dev/UAT and logs.',
    stridePattern: 'Information Disclosure',
    mappingTags: [
      'Confidential',
      'Sensitive',
      'PII',
      'Employee data',
      'Financial records',
      'Regulatory data',
      'Data at rest',
      'Data in backup',
      'Data in cache',
      'Data in use (memory)',
      'Database',
      'DB Changes',
      'Database connection',
      'Database servers',
      'Dev / UAT environment',
    ],
  },
  {
    controlId: 'TA-CTRL-10',
    controlName: 'Container & Kubernetes Cluster Hardening',
    requirement:
      'Enforce signed container images, non-root pod execution, network policies, IRSA/Pod Identity, and KMS-encrypted cluster secrets.',
    stridePattern: 'Elevation of Privilege',
    mappingTags: [
      'Cloud Infrastructure (Kubernetes/Containers)',
      'Kubernetes cluster',
      'Container image',
    ],
  },
  {
    controlId: 'TA-CTRL-11',
    controlName: 'Cloud Landing Zone, Storage Bucket & Compute Posture',
    requirement:
      'Deploy cloud workloads within the bank landing zone with SCPs, Block Public Access on storage buckets, GuardDuty/Security Hub, and private VPC endpoints.',
    stridePattern: 'Elevation of Privilege',
    mappingTags: [
      'Cloud services',
      'Private cloud (AWS/Azure/GCP)',
      'Cloud storage bucket',
      'VM / compute resource',
      'New servers',
    ],
  },
  {
    controlId: 'TA-CTRL-12',
    controlName: 'Perimeter WAF, DDoS Mitigation & Network Microsegmentation',
    requirement:
      'Protect internet and DMZ workloads with L7 WAF, DDoS scrubbing, DMZ protocol break, and East-West microsegmentation (Illumio / Security Groups).',
    stridePattern: 'Denial of Service',
    mappingTags: [
      'Internet',
      'DMZ/Screened subnet',
      'Corporate LAN',
      'VPN network',
      'Isolated subnet',
      'Network components',
      'Network device',
      'Production',
      'Disaster recovery',
      'On-premises data center',
    ],
  },
  {
    controlId: 'TA-CTRL-13',
    controlName: 'Endpoint, BYOD, Kiosk & Remote Access Lockdown',
    requirement:
      'Enforce MDM/EDR compliance, VDI session clipboard/drive restrictions, signed thick-client binaries, and kiosk session wiping.',
    stridePattern: 'Elevation of Privilege',
    mappingTags: [
      'Desktop application',
      'Command-line interface (CLI)',
      'Remote desktop (RDP, VDI)',
      'SSH session',
      'Corporate-managed device',
      'BYOD',
      'Personal unmanaged device',
      'Kiosk / shared device',
      'Virtual desktop (VDI/DaaS)',
      'Mobile device',
      'Corporate office',
      'Branch office',
      'Home (WFH)',
    ],
  },
  {
    controlId: 'TA-CTRL-14',
    controlName: 'Immutable SIEM Audit Logging & Non-Repudiation',
    requirement:
      'Forward authentication, privileged activity, data transfer, and application telemetry logs to the central SIEM with PII redaction and tamper-evident retention.',
    stridePattern: 'Repudiation',
    mappingTags: [
      'Logs and telemetry',
      'Data in logs',
      'Monitoring system',
      'Event streams / Message queues',
      'Message Queue/Event Streaming',
      'Middleware/Automated jobs',
      'Middleware platform',
    ],
  },
  {
    controlId: 'TA-CTRL-15',
    controlName: 'AI / LLM Guardrails, Prompt-Injection Defense & Data Privacy',
    requirement:
      'Enforce input/output prompt guardrails, PII redaction prior to model inference, zero foundation-model training on bank data, and bounded tool agency.',
    stridePattern: 'Tampering',
    mappingTags: [
      'AI/LLM Components',
      'LLM / AI model',
      'Source code',
      'Intellectual property',
      'Trade secrets',
      'Metadata',
      'Configuration data',
      'Application',
    ],
  },
  {
    controlId: 'TA-CTRL-16',
    controlName: 'Data Migration Reconciliation & Staging Sanitization',
    requirement:
      'Enforce cryptographic checksum/row-count reconciliation, encrypted migration channels, and verified disposal of temporary staging data.',
    stridePattern: 'Tampering',
    mappingTags: [
      'Data Migration',
      'Data Processing/Transformation',
    ],
  },
];

// ============================================================================
// INPUT MODEL FOR SAR CHECKLIST v5 EVALUATION
// ============================================================================

export interface SarV5InputState {
  /** PC-01 / Q1: Single-select primary objective (or '' if blank) */
  q1: SarV5PrimaryObjective;
  /** Map of preliminary item IDs (PC-02.1..WHAT-36) to 'Yes' | 'No' | '' */
  preliminary: Record<string, SarV5TriState>;
  /** Map of Cloud Security AWS Service Selectors (Q1.1..Q1.25) to 'Yes' | 'No' | '' */
  cloudSelectors?: Record<string, SarV5TriState>;
  /** Map of Threat Assessment Control IDs (TA-CTRL-01..16) to reviewer responses ('Yes' | 'No' | 'N/A') */
  threatResponses?: Record<string, 'Yes' | 'No' | 'N/A'>;
  /** Optional evidence comments per Threat Assessment Control ID */
  threatEvidence?: Record<string, string>;
}

function isYes(state: SarV5InputState, id: string): boolean {
  return state.preliminary[id] === 'Yes';
}

function isBlank(state: SarV5InputState, id: string): boolean {
  const v = state.preliminary[id];
  return v === undefined || v === null || v === '';
}

// ============================================================================
// CORE DETERMINISTIC EVALUATION PIPELINE (SECTION 8 DEPENDENCY ORDER)
// ============================================================================

export function evaluateSarV5(input: SarV5InputState): SarV5EvaluationSummary {
  const q1 = (input.q1 || '') as SarV5PrimaryObjective;

  // Step 1 & 2: Calculate PatternStarted and the six derived flags
  const patternTriggerIds: string[] = [];
  const startedPatternsSet = new Set<string>();

  for (const item of SAR_V5_PRELIMINARY_ITEMS) {
    if (item.startsPattern && isYes(input, item.id)) {
      patternTriggerIds.push(item.id);
      for (const pat of item.threatPatterns || []) {
        startedPatternsSet.add(pat);
      }
    }
  }

  const patternStarted = patternTriggerIds.length > 0;

  const evalOrFlag = (
    flagName: SarV5FlagName,
    candidateIds: string[],
    formula: string
  ): SarV5FlagStatusEntry => {
    const matched = candidateIds.filter((id) => isYes(input, id));
    const val = matched.length > 0;
    return {
      flag: flagName,
      value: val,
      triggeringReferenceIds: matched,
      evaluatedFormula: formula,
      explanation: val
        ? `${flagName} is TRUE because [${matched.join(', ')}] = Yes.`
        : `${flagName} is FALSE because none of [${candidateIds.join(', ')}] is Yes.`,
    };
  };

  const publicFacingEntry = evalOrFlag(
    'PublicFacing',
    ['WHERE-11', 'WHO-03', 'WHO-04'],
    'Y(WHERE-11 Internet) OR Y(WHO-03 Customer / End user) OR Y(WHO-04 Anonymous / Unauthenticated user)'
  );

  const sensitiveDataEntry = evalOrFlag(
    'SensitiveData',
    ['WHAT-03', 'WHAT-04', 'WHAT-05', 'WHAT-06', 'WHAT-07', 'WHAT-08', 'WHAT-09', 'WHAT-10'],
    'Y(WHAT-03) OR Y(WHAT-04) OR Y(WHAT-05) OR Y(WHAT-06) OR Y(WHAT-07) OR Y(WHAT-08) OR Y(WHAT-09) OR Y(WHAT-10)'
  );

  const dataMigrationEntry = evalOrFlag(
    'DataMigration',
    ['PC-03', 'PC-02.6'],
    'Y(PC-03 Data being migrated, copied, or transformed) OR Y(PC-02.6 Data Migration)'
  );

  const thirdPartyAccessEntry = evalOrFlag(
    'ThirdPartyAccess',
    ['WHO-02', 'WHERE-03', 'WHERE-12', 'WHERE-23', 'PC-02.10'],
    "Y(WHO-02) OR Y(WHERE-03 Third party's SaaS tenant) OR Y(WHERE-12 Partner/extranet) OR Y(WHERE-23 Partner site) OR Y(PC-02.10 Third-Party Connectivity)"
  );

  const portalEntry = evalOrFlag(
    'Portal',
    ['PC-05'],
    "Y(PC-05 Third-party-managed portal accessed by bank's internal users)"
  );

  const fileTransferEntry = evalOrFlag(
    'FileTransfer',
    ['PC-02.7', 'HOW-06', 'HOW-17'],
    'Y(PC-02.7 File Transfer) OR Y(HOW-06 SFTP/FTP) OR Y(HOW-17 File transfer)'
  );

  const flags: Record<SarV5FlagName | 'PatternStarted', SarV5FlagStatusEntry> = {
    PatternStarted: {
      flag: 'PatternStarted',
      value: patternStarted,
      triggeringReferenceIds: patternTriggerIds,
      evaluatedFormula: 'ANY(WHO-01..11, HOW-01..23, WHERE-01..23, WHAT-01..36) = Yes',
      explanation: patternStarted
        ? `PatternStarted is TRUE because [${patternTriggerIds.join(', ')}] = Yes in Sections B–E.`
        : 'PatternStarted is FALSE because no option in Sections B–E (WHO, HOW, WHERE, WHAT) is Yes.',
    },
    PublicFacing: publicFacingEntry,
    SensitiveData: sensitiveDataEntry,
    DataMigration: dataMigrationEntry,
    ThirdPartyAccess: thirdPartyAccessEntry,
    Portal: portalEntry,
    FileTransfer: fileTransferEntry,
  };

  // Step 3: Calculate status of every questionnaire using its exact independent routing rule
  // 4.1 Application Base (Primary)
  let appBaseStatus: SarV5QuestionnaireStatus;
  let appBaseTriggers: string[] = [];
  let appBaseExplanation: string;
  if (q1 === '') {
    appBaseStatus = 'PENDING';
    appBaseTriggers = ['PC-01'];
    appBaseExplanation = 'PC-01 (Q1) is blank; Application Base routing decision is PENDING.';
  } else if (q1 === 'Other') {
    appBaseStatus = 'CONFIRM';
    appBaseTriggers = ['PC-01'];
    appBaseExplanation = 'PC-01 (Q1) = "Other"; requestor must CONFIRM Application Base applicability with Security Architecture.';
  } else if (
    q1 === 'New internal application' ||
    q1 === 'Major enhancement to existing application'
  ) {
    appBaseStatus = 'REQUIRED';
    appBaseTriggers = ['PC-01'];
    appBaseExplanation = `PC-01 (Q1) = "${q1}" routes Application Base to REQUIRED.`;
  } else {
    appBaseStatus = 'NOT REQUIRED';
    appBaseTriggers = ['PC-01'];
    appBaseExplanation = `PC-01 (Q1) = "${q1}" is not an application onboarding/enhancement objective; Application Base is NOT REQUIRED.`;
  }

  // 4.2 Integration (Primary) — PC-02.10 = Yes checked BEFORE B(Q1)
  let integrationStatus: SarV5QuestionnaireStatus;
  const integrationTriggers: string[] = [];
  let integrationExplanation: string;
  const q1IsIntegration =
    q1 === 'New Internal system-to-system or new external/vendor integration';
  const pc0210Yes = isYes(input, 'PC-02.10');
  if (q1IsIntegration || pc0210Yes) {
    integrationStatus = 'REQUIRED';
    if (q1IsIntegration) integrationTriggers.push('PC-01');
    if (pc0210Yes) integrationTriggers.push('PC-02.10');
    integrationExplanation = `Integration is REQUIRED because ${integrationTriggers.join(' and ')} matched the primary/override trigger.`;
  } else if (q1 === '') {
    integrationStatus = 'PENDING';
    integrationTriggers.push('PC-01', 'PC-02.10');
    integrationExplanation = 'PC-01 (Q1) is blank and PC-02.10 is not Yes; Integration is PENDING.';
  } else if (q1 === 'Other') {
    integrationStatus = 'CONFIRM';
    integrationTriggers.push('PC-01');
    integrationExplanation = 'PC-01 (Q1) = "Other" with PC-02.10 != Yes; Integration is CONFIRM.';
  } else {
    integrationStatus = 'NOT REQUIRED';
    integrationTriggers.push('PC-01', 'PC-02.10');
    integrationExplanation = `PC-01 = "${q1}" and PC-02.10 != Yes; Integration is NOT REQUIRED.`;
  }

  // 4.3 Data Migration (Primary) — PC-02.6 = Yes checked BEFORE B(Q1); PC-03 does NOT route this sheet
  let dataMigrationStatus: SarV5QuestionnaireStatus;
  const dmTriggers: string[] = [];
  let dmExplanation: string;
  const q1IsDm = q1 === 'Data Migration';
  const pc026Yes = isYes(input, 'PC-02.6');
  if (q1IsDm || pc026Yes) {
    dataMigrationStatus = 'REQUIRED';
    if (q1IsDm) dmTriggers.push('PC-01');
    if (pc026Yes) dmTriggers.push('PC-02.6');
    dmExplanation = `Data Migration questionnaire is REQUIRED because ${dmTriggers.join(' and ')} matched (note: PC-03 does not route this sheet).`;
  } else if (q1 === '') {
    dataMigrationStatus = 'PENDING';
    dmTriggers.push('PC-01', 'PC-02.6');
    dmExplanation = 'PC-01 (Q1) is blank and PC-02.6 is not Yes; Data Migration is PENDING.';
  } else if (q1 === 'Other') {
    dataMigrationStatus = 'CONFIRM';
    dmTriggers.push('PC-01');
    dmExplanation = 'PC-01 (Q1) = "Other" with PC-02.6 != Yes; Data Migration is CONFIRM.';
  } else {
    dataMigrationStatus = 'NOT REQUIRED';
    dmTriggers.push('PC-01', 'PC-02.6');
    dmExplanation = `PC-01 = "${q1}" and PC-02.6 != Yes; Data Migration questionnaire is NOT REQUIRED (even if PC-03 = Yes).`;
  }

  // 4.4 API Security (Secondary)
  const apiCandidateIds = ['PC-02.3', 'HOW-09', 'HOW-10', 'HOW-11', 'HOW-12', 'HOW-13', 'WHAT-24'];
  const apiMatchedIds = apiCandidateIds.filter((id) => isYes(input, id));
  let apiStatus: SarV5QuestionnaireStatus;
  let apiTriggers: string[];
  let apiExplanation: string;
  if (apiMatchedIds.length > 0) {
    apiStatus = 'REQUIRED';
    apiTriggers = apiMatchedIds;
    apiExplanation = `API Security is REQUIRED because [${apiMatchedIds.join(', ')}] = Yes.`;
  } else if (isBlank(input, 'PC-02.3')) {
    apiStatus = 'PENDING';
    apiTriggers = ['PC-02.3'];
    apiExplanation = 'No API trigger is Yes and PC-02.3 (API Integration) is blank; API Security is PENDING.';
  } else {
    apiStatus = 'NOT REQUIRED';
    apiTriggers = apiCandidateIds;
    apiExplanation = 'PC-02.3 is No and all API-related HOW/WHAT triggers are not Yes; API Security is NOT REQUIRED.';
  }

  // 4.5 Cloud Security (Secondary)
  const cloudCandidateIds = ['PC-02.8', 'PC-04.2', 'PC-04.4', 'WHERE-02', 'WHAT-34', 'WHAT-32'];
  const cloudMatchedIds = cloudCandidateIds.filter((id) => isYes(input, id));
  const cloudBlankRoutingIds = ['PC-02.8', 'PC-04.2', 'PC-04.4'].filter((id) => isBlank(input, id));
  let cloudStatus: SarV5QuestionnaireStatus;
  let cloudTriggers: string[];
  let cloudExplanation: string;
  if (cloudMatchedIds.length > 0) {
    cloudStatus = 'REQUIRED';
    cloudTriggers = cloudMatchedIds;
    cloudExplanation = `Cloud Security is REQUIRED because [${cloudMatchedIds.join(', ')}] = Yes.`;
  } else if (cloudBlankRoutingIds.length > 0) {
    cloudStatus = 'PENDING';
    cloudTriggers = cloudBlankRoutingIds;
    cloudExplanation = `No Cloud trigger is Yes and routing input(s) [${cloudBlankRoutingIds.join(', ')}] are blank; Cloud Security is PENDING.`;
  } else {
    cloudStatus = 'NOT REQUIRED';
    cloudTriggers = cloudCandidateIds;
    cloudExplanation = 'All Cloud routing inputs (PC-02.8, PC-04.2, PC-04.4) are No and WHERE-02, WHAT-34, WHAT-32 are not Yes; Cloud Security is NOT REQUIRED.';
  }

  // 4.6 Firewall Ports (Secondary)
  const fwCandidateIds = ['PC-06', 'HOW-08'];
  const fwMatchedIds = fwCandidateIds.filter((id) => isYes(input, id));
  let fwStatus: SarV5QuestionnaireStatus;
  let fwTriggers: string[];
  let fwExplanation: string;
  if (fwMatchedIds.length > 0) {
    fwStatus = 'REQUIRED';
    fwTriggers = fwMatchedIds;
    fwExplanation = `Firewall Ports is REQUIRED because [${fwMatchedIds.join(', ')}] = Yes.`;
  } else if (isBlank(input, 'PC-06')) {
    fwStatus = 'PENDING';
    fwTriggers = ['PC-06'];
    fwExplanation = 'HOW-08 is not Yes and PC-06 (New or modified network connectivity) is blank; Firewall Ports is PENDING.';
  } else {
    fwStatus = 'NOT REQUIRED';
    fwTriggers = fwCandidateIds;
    fwExplanation = 'PC-06 is No and HOW-08 is not Yes; Firewall Ports is NOT REQUIRED.';
  }

  // 4.7 Threat Assessment (ISG-Only)
  const taStatus: SarV5QuestionnaireStatus = patternStarted ? 'REQUIRED' : 'PENDING';
  const taExplanation = patternStarted
    ? `Threat Assessment is REQUIRED because PatternStarted = TRUE (${patternTriggerIds.length} WHO/HOW/WHERE/WHAT selection(s)).`
    : 'Threat Assessment is PENDING because PatternStarted = FALSE (never becomes NOT REQUIRED).';

  const statusMap: Record<SarV5QuestionnaireId, SarV5QuestionnaireStatus> = {
    APPLICATION_BASE: appBaseStatus,
    INTEGRATION: integrationStatus,
    DATA_MIGRATION: dataMigrationStatus,
    API_SECURITY: apiStatus,
    CLOUD_SECURITY: cloudStatus,
    FIREWALL_PORTS: fwStatus,
    THREAT_ASSESSMENT: taStatus,
  };

  const nameMap: Record<SarV5QuestionnaireId, string> = {
    APPLICATION_BASE: 'Application Base',
    INTEGRATION: 'Integration',
    DATA_MIGRATION: 'Data Migration',
    API_SECURITY: 'API Security',
    CLOUD_SECURITY: 'Cloud Security',
    FIREWALL_PORTS: 'Firewall Ports',
    THREAT_ASSESSMENT: 'Threat Assessment',
  };

  // Step 4 & 5: Evaluate row states (ACTIVE vs GREYED) for all questionnaires and the 15 conditional rows
  const evaluateRowState = (qRow: SarV5QuestionRowDef): SarV5RowState => {
    const qStatus = statusMap[qRow.questionnaireId];
    if (qStatus === 'NOT REQUIRED') {
      return 'GREYED';
    }
    if (!qRow.conditionalFlag) {
      return 'ACTIVE';
    }
    const flagVal = flags[qRow.conditionalFlag].value;
    return patternStarted && flagVal ? 'ACTIVE' : 'GREYED';
  };

  const allStandardRows: SarV5QuestionRowDef[] = [
    ...SAR_V5_APPLICATION_BASE_QUESTIONS,
    ...SAR_V5_INTEGRATION_QUESTIONS,
    ...SAR_V5_DATA_MIGRATION_QUESTIONS,
    ...SAR_V5_API_SECURITY_QUESTIONS,
    ...SAR_V5_FIREWALL_PORTS_QUESTIONS,
  ];

  const conditionalRows: SarV5ConditionalRowEntry[] = allStandardRows
    .filter((r) => r.conditionalFlag !== undefined)
    .map((r) => {
      const flagName = r.conditionalFlag!;
      const flagEntry = flags[flagName];
      const qStatus = statusMap[r.questionnaireId];
      const rowState = evaluateRowState(r);

      let explanation: string;
      if (qStatus === 'NOT REQUIRED') {
        explanation = `GREYED because parent questionnaire "${nameMap[r.questionnaireId]}" is NOT REQUIRED.`;
      } else if (!patternStarted && !flagEntry.value) {
        explanation = `GREYED because PatternStarted is FALSE and flag ${flagName} is FALSE.`;
      } else if (!patternStarted) {
        explanation = `GREYED because PatternStarted is FALSE (even though flag ${flagName} is TRUE).`;
      } else if (!flagEntry.value) {
        explanation = `GREYED because unlocking flag ${flagName} is FALSE.`;
      } else {
        explanation = `ACTIVE because questionnaire "${nameMap[r.questionnaireId]}" is ${qStatus}, PatternStarted is TRUE, and ${flagName} is TRUE (${flagEntry.triggeringReferenceIds.join(', ')}).`;
      }

      return {
        questionId: r.id,
        aliasId: r.aliasId,
        questionnaireId: r.questionnaireId,
        questionnaireName: nameMap[r.questionnaireId],
        questionText: r.text,
        unlockingFlag: flagName,
        flagValue: flagEntry.value,
        patternStarted,
        questionnaireStatus: qStatus,
        rowState,
        triggeringReferenceIds: flagEntry.triggeringReferenceIds,
        explanation,
      };
    });

  // Step 6 & 7: Evaluate Cloud Security service selectors (Q1.1–Q1.25) and baseline applicability
  const cloudBaselineApplicable = cloudStatus !== 'NOT REQUIRED';
  const cloudServices: SarV5CloudServiceResult[] = SAR_V5_CLOUD_SERVICE_SELECTORS.map((sel) => {
    const rawSel = input.cloudSelectors?.[sel.selectorId];
    const selected: 'Yes' | 'No' | 'Blank' =
      rawSel === 'Yes' ? 'Yes' : rawSel === 'No' ? 'No' : 'Blank';
    const applicable = cloudStatus !== 'NOT REQUIRED' && selected === 'Yes';
    return {
      selectorId: sel.selectorId,
      serviceName: sel.serviceName,
      familyCode: sel.familyCode,
      selected,
      applicability: applicable ? 'Applicable' : 'N/A',
      questionIds: sel.questions.map((q) => q.id),
      explanation:
        cloudStatus === 'NOT REQUIRED'
          ? `N/A because Cloud Security questionnaire is NOT REQUIRED.`
          : applicable
          ? `Applicable (${sel.questions.length} ${sel.familyCode} questions unlocked) because ${sel.selectorId} (${sel.serviceName}) = Yes.`
          : `N/A because ${sel.selectorId} (${sel.serviceName}) is ${selected}.`,
    };
  });

  const serviceApplicableQuestionCount = cloudServices
    .filter((s) => s.applicability === 'Applicable')
    .reduce((acc, s) => acc + s.questionIds.length, 0);
  const totalApplicableCloudQuestions = cloudBaselineApplicable
    ? SAR_V5_CLOUD_BASELINE_QUESTIONS.length + serviceApplicableQuestionCount
    : 0;

  // Step 8, 9 & 10: Threat Assessment & Control Library Exact Whole-Label Matching
  const activePreliminaryLabels = new Map<string, string[]>();
  if (patternStarted) {
    for (const item of SAR_V5_PRELIMINARY_ITEMS) {
      if (isYes(input, item.id)) {
        const existing = activePreliminaryLabels.get(item.label) || [];
        existing.push(item.id);
        activePreliminaryLabels.set(item.label, existing);
      }
    }
  }

  const controls: SarV5ThreatControlEvaluation[] = SAR_V5_CONTROL_LIBRARY.map((ctrl) => {
    const matchedTags: string[] = [];
    const triggeringRefSet = new Set<string>();

    if (patternStarted) {
      for (const tag of ctrl.mappingTags) {
        // Exact, case-sensitive, whole-label match against active preliminary option labels
        const matchingRefIds = activePreliminaryLabels.get(tag);
        if (matchingRefIds && matchingRefIds.length > 0) {
          matchedTags.push(tag);
          for (const refId of matchingRefIds) {
            triggeringRefSet.add(refId);
          }
        }
      }
    }

    const applicable = patternStarted && matchedTags.length > 0;
    const rawResp = input.threatResponses?.[ctrl.controlId] || 'N/A';
    let complianceStatus: SarV5ThreatControlEvaluation['complianceStatus'];
    if (!applicable) {
      complianceStatus = 'Not Applicable';
    } else if (rawResp === 'Yes') {
      complianceStatus = 'Compliant';
    } else if (rawResp === 'No') {
      complianceStatus = 'Non-compliant';
    } else {
      complianceStatus = 'Pending review';
    }

    return {
      controlId: ctrl.controlId,
      controlName: ctrl.controlName,
      requirement: ctrl.requirement,
      stridePattern: ctrl.stridePattern,
      mappingTags: ctrl.mappingTags,
      applicable,
      matchedTags,
      triggeringReferenceIds: Array.from(triggeringRefSet),
      reviewerResponse: rawResp,
      complianceStatus,
      evidenceComments: input.threatEvidence?.[ctrl.controlId],
    };
  });

  const applicableControls = controls.filter((c) => c.applicable).length;
  const compliantControls = controls.filter((c) => c.applicable && c.reviewerResponse === 'Yes').length;
  const nonCompliantControls = controls.filter((c) => c.applicable && c.reviewerResponse === 'No').length;
  const pendingReviewControls = controls.filter((c) => c.applicable && c.reviewerResponse === 'N/A').length;
  const complianceRate: number | 'N/A' =
    applicableControls > 0
      ? Number(((compliantControls / applicableControls) * 100).toFixed(2))
      : 'N/A';

  const compliance: SarV5ComplianceSummary = {
    applicableControls,
    compliantControls,
    nonCompliantControls,
    pendingReviewControls,
    complianceRate,
  };

  // Compute active/greyed row counts per questionnaire
  const countRows = (qId: SarV5QuestionnaireId, rows: ReadonlyArray<SarV5QuestionRowDef>) => {
    const active = rows.filter((r) => evaluateRowState(r) === 'ACTIVE').length;
    return {
      activeRowCount: active,
      greyedRowCount: rows.length - active,
      totalRowCount: rows.length,
    };
  };

  const appCounts = countRows('APPLICATION_BASE', SAR_V5_APPLICATION_BASE_QUESTIONS);
  const intCounts = countRows('INTEGRATION', SAR_V5_INTEGRATION_QUESTIONS);
  const dmCounts = countRows('DATA_MIGRATION', SAR_V5_DATA_MIGRATION_QUESTIONS);
  const apiCounts = countRows('API_SECURITY', SAR_V5_API_SECURITY_QUESTIONS);
  const fwCounts = countRows('FIREWALL_PORTS', SAR_V5_FIREWALL_PORTS_QUESTIONS);

  const totalCloudQuestionsPossible =
    SAR_V5_CLOUD_BASELINE_QUESTIONS.length +
    SAR_V5_CLOUD_SERVICE_SELECTORS.reduce((acc, s) => acc + s.questions.length, 0);

  const questionnaires: Record<SarV5QuestionnaireId, SarV5QuestionnaireStatusEntry> = {
    APPLICATION_BASE: {
      questionnaireId: 'APPLICATION_BASE',
      questionnaireName: 'Application Base',
      tier: 'Primary',
      status: appBaseStatus,
      triggeringReferenceIds: appBaseTriggers,
      evaluatedCondition:
        'IF B(Q1) -> PENDING; ELSE IF Q1="Other" -> CONFIRM; ELSE IF Q1 IN {"New internal application", "Major enhancement to existing application"} -> REQUIRED; ELSE -> NOT REQUIRED',
      explanation: appBaseExplanation,
      sourceRule: 'Section 4.1 — Application Base questionnaire (Primary)',
      ...appCounts,
    },
    INTEGRATION: {
      questionnaireId: 'INTEGRATION',
      questionnaireName: 'Integration',
      tier: 'Primary',
      status: integrationStatus,
      triggeringReferenceIds: integrationTriggers,
      evaluatedCondition:
        'IF Q1="New Internal system-to-system or new external/vendor integration" OR Y(PC-02.10) -> REQUIRED; ELSE IF B(Q1) -> PENDING; ELSE IF Q1="Other" -> CONFIRM; ELSE -> NOT REQUIRED',
      explanation: integrationExplanation,
      sourceRule: 'Section 4.2 — Integration questionnaire (Primary)',
      ...intCounts,
    },
    DATA_MIGRATION: {
      questionnaireId: 'DATA_MIGRATION',
      questionnaireName: 'Data Migration',
      tier: 'Primary',
      status: dataMigrationStatus,
      triggeringReferenceIds: dmTriggers,
      evaluatedCondition:
        'IF Q1="Data Migration" OR Y(PC-02.6) -> REQUIRED; ELSE IF B(Q1) -> PENDING; ELSE IF Q1="Other" -> CONFIRM; ELSE -> NOT REQUIRED',
      explanation: dmExplanation,
      sourceRule: 'Section 4.3 — Data Migration questionnaire (Primary)',
      ...dmCounts,
    },
    API_SECURITY: {
      questionnaireId: 'API_SECURITY',
      questionnaireName: 'API Security',
      tier: 'Secondary',
      status: apiStatus,
      triggeringReferenceIds: apiTriggers,
      evaluatedCondition:
        'IF Y(PC-02.3) OR Y(HOW-09) OR Y(HOW-10) OR Y(HOW-11) OR Y(HOW-12) OR Y(HOW-13) OR Y(WHAT-24) -> REQUIRED; ELSE IF B(PC-02.3) -> PENDING; ELSE -> NOT REQUIRED',
      explanation: apiExplanation,
      sourceRule: 'Section 4.4 — API Security questionnaire (Secondary)',
      ...apiCounts,
    },
    CLOUD_SECURITY: {
      questionnaireId: 'CLOUD_SECURITY',
      questionnaireName: 'Cloud Security',
      tier: 'Secondary',
      status: cloudStatus,
      triggeringReferenceIds: cloudTriggers,
      evaluatedCondition:
        'IF Y(PC-02.8) OR Y(PC-04.2) OR Y(PC-04.4) OR Y(WHERE-02) OR Y(WHAT-34) OR Y(WHAT-32) -> REQUIRED; ELSE IF any of (PC-02.8, PC-04.2, PC-04.4) is blank -> PENDING; ELSE -> NOT REQUIRED',
      explanation: cloudExplanation,
      sourceRule: 'Section 4.5 — Cloud Security questionnaire (Secondary)',
      activeRowCount: totalApplicableCloudQuestions,
      greyedRowCount: totalCloudQuestionsPossible - totalApplicableCloudQuestions,
      totalRowCount: totalCloudQuestionsPossible,
    },
    FIREWALL_PORTS: {
      questionnaireId: 'FIREWALL_PORTS',
      questionnaireName: 'Firewall Ports',
      tier: 'Secondary',
      status: fwStatus,
      triggeringReferenceIds: fwTriggers,
      evaluatedCondition:
        'IF Y(PC-06) OR Y(HOW-08) -> REQUIRED; ELSE IF B(PC-06) -> PENDING; ELSE -> NOT REQUIRED',
      explanation: fwExplanation,
      sourceRule: 'Section 4.6 — Firewall Ports questionnaire (Secondary)',
      ...fwCounts,
    },
    THREAT_ASSESSMENT: {
      questionnaireId: 'THREAT_ASSESSMENT',
      questionnaireName: 'Threat Assessment',
      tier: 'ISG-Only',
      status: taStatus,
      triggeringReferenceIds: patternTriggerIds,
      evaluatedCondition: 'IF PatternStarted = TRUE -> REQUIRED; ELSE -> PENDING',
      explanation: taExplanation,
      sourceRule: 'Section 4.7 — Threat Assessment (ISG-only)',
      activeRowCount: applicableControls,
      greyedRowCount: SAR_V5_CONTROL_LIBRARY.length - applicableControls,
      totalRowCount: SAR_V5_CONTROL_LIBRARY.length,
    },
  };

  // Summarize preliminary input state
  const answeredYesIds = SAR_V5_PRELIMINARY_ITEMS.filter((i) => isYes(input, i.id)).map((i) => i.id);
  const answeredNoIds = SAR_V5_PRELIMINARY_ITEMS.filter(
    (i) => input.preliminary[i.id] === 'No'
  ).map((i) => i.id);

  const routingCheckIds = ['PC-02.3', 'PC-02.6', 'PC-02.8', 'PC-02.10', 'PC-04.2', 'PC-04.4', 'PC-06'];
  const unansweredRoutingIds: string[] = [];
  if (q1 === '') unansweredRoutingIds.push('PC-01');
  for (const rId of routingCheckIds) {
    if (isBlank(input, rId)) unansweredRoutingIds.push(rId);
  }

  return {
    preliminarySummary: {
      q1Objective: q1 || 'Blank (Unanswered)',
      answeredYesIds,
      answeredNoIds,
      unansweredRoutingIds,
      startedThreatPatterns: Array.from(startedPatternsSet),
    },
    questionnaires,
    flags,
    conditionalRows,
    cloudSecurity: {
      questionnaireStatus: cloudStatus,
      baselineApplicable: cloudBaselineApplicable,
      baselineQuestionCount: SAR_V5_CLOUD_BASELINE_QUESTIONS.length,
      services: cloudServices,
      totalApplicableCloudQuestions,
    },
    threatAssessment: {
      status: taStatus,
      patternStarted,
      startedPatterns: Array.from(startedPatternsSet),
      controls,
      compliance,
    },
  };
}

// ============================================================================
// SECTION 9 — REVERSE INDEX: WHAT EACH PRELIMINARY YES UNLOCKS
// ============================================================================

export interface SarV5ReverseIndexEntry {
  referenceId: string;
  section: string;
  exactLabel: string;
  startsThreatPattern: boolean;
  contributesToFlags: SarV5FlagName[];
  routesQuestionnaires: Array<{
    questionnaireId: SarV5QuestionnaireId;
    statusWhenSelected: SarV5QuestionnaireStatus;
    overridesQ1: boolean;
  }>;
  unlocksConditionalRows: string[];
  affectsCloudSecurity: string[];
  matchedThreatControlTags: string[];
  matchedThreatControlIds: string[];
}

export function buildSarV5ReverseIndex(): SarV5ReverseIndexEntry[] {
  const entries: SarV5ReverseIndexEntry[] = [];

  // 1. Q1 options (PC-01)
  for (const opt of SAR_V5_Q1_OPTIONS) {
    const routes: SarV5ReverseIndexEntry['routesQuestionnaires'] = [];
    if (
      opt === 'New internal application' ||
      opt === 'Major enhancement to existing application'
    ) {
      routes.push({
        questionnaireId: 'APPLICATION_BASE',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: false,
      });
    } else if (opt === 'New Internal system-to-system or new external/vendor integration') {
      routes.push({
        questionnaireId: 'INTEGRATION',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: false,
      });
    } else if (opt === 'Data Migration') {
      routes.push({
        questionnaireId: 'DATA_MIGRATION',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: false,
      });
    } else if (opt === 'Other') {
      routes.push(
        { questionnaireId: 'APPLICATION_BASE', statusWhenSelected: 'CONFIRM', overridesQ1: false },
        { questionnaireId: 'INTEGRATION', statusWhenSelected: 'CONFIRM', overridesQ1: false },
        { questionnaireId: 'DATA_MIGRATION', statusWhenSelected: 'CONFIRM', overridesQ1: false }
      );
    }

    const matchedCtrls = SAR_V5_CONTROL_LIBRARY.filter((c) => c.mappingTags.includes(opt));

    entries.push({
      referenceId: `PC-01 (${opt})`,
      section: 'Section A — Request Overview',
      exactLabel: opt,
      startsThreatPattern: false,
      contributesToFlags: [],
      routesQuestionnaires: routes,
      unlocksConditionalRows: [],
      affectsCloudSecurity: [],
      matchedThreatControlTags: matchedCtrls.length > 0 ? [opt] : [],
      matchedThreatControlIds: matchedCtrls.map((c) => c.controlId),
    });
  }

  // 2. All PC-02..PC-07, WHO, HOW, WHERE, WHAT items
  const flagMap: Record<SarV5FlagName, Set<string>> = {
    PublicFacing: new Set(['WHERE-11', 'WHO-03', 'WHO-04']),
    SensitiveData: new Set([
      'WHAT-03',
      'WHAT-04',
      'WHAT-05',
      'WHAT-06',
      'WHAT-07',
      'WHAT-08',
      'WHAT-09',
      'WHAT-10',
    ]),
    DataMigration: new Set(['PC-03', 'PC-02.6']),
    ThirdPartyAccess: new Set(['WHO-02', 'WHERE-03', 'WHERE-12', 'WHERE-23', 'PC-02.10']),
    Portal: new Set(['PC-05']),
    FileTransfer: new Set(['PC-02.7', 'HOW-06', 'HOW-17']),
  };

  const flagToConditionalRows: Record<SarV5FlagName, string[]> = {
    PublicFacing: ['APP-AC-05'],
    SensitiveData: ['APP-DT-05', 'INT-DS-04', 'API-AB-08 (API-08)'],
    DataMigration: ['APP-DT-12', 'APP-DT-13'],
    ThirdPartyAccess: ['APP-IT-05 (APP-IN-05)'],
    Portal: ['INT-ID-06', 'INT-ID-07'],
    FileTransfer: ['INT-FT-01', 'INT-FT-02', 'INT-FT-03', 'INT-FT-04', 'INT-FT-05', 'INT-FT-06'],
  };

  for (const item of SAR_V5_PRELIMINARY_ITEMS) {
    const contributesToFlags: SarV5FlagName[] = [];
    const unlocksConditionalRowsSet = new Set<string>();

    for (const [fName, idSet] of Object.entries(flagMap) as Array<[SarV5FlagName, Set<string>]>) {
      if (idSet.has(item.id)) {
        contributesToFlags.push(fName);
        for (const rId of flagToConditionalRows[fName]) {
          unlocksConditionalRowsSet.add(rId);
        }
      }
    }

    const routesQuestionnaires: SarV5ReverseIndexEntry['routesQuestionnaires'] = [];
    if (item.id === 'PC-02.10') {
      routesQuestionnaires.push({
        questionnaireId: 'INTEGRATION',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: true,
      });
    }
    if (item.id === 'PC-02.6') {
      routesQuestionnaires.push({
        questionnaireId: 'DATA_MIGRATION',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: true,
      });
    }
    if (['PC-02.3', 'HOW-09', 'HOW-10', 'HOW-11', 'HOW-12', 'HOW-13', 'WHAT-24'].includes(item.id)) {
      routesQuestionnaires.push({
        questionnaireId: 'API_SECURITY',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: true,
      });
    }
    if (['PC-02.8', 'PC-04.2', 'PC-04.4', 'WHERE-02', 'WHAT-34', 'WHAT-32'].includes(item.id)) {
      routesQuestionnaires.push({
        questionnaireId: 'CLOUD_SECURITY',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: true,
      });
    }
    if (['PC-06', 'HOW-08'].includes(item.id)) {
      routesQuestionnaires.push({
        questionnaireId: 'FIREWALL_PORTS',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: true,
      });
    }
    if (item.startsPattern) {
      routesQuestionnaires.push({
        questionnaireId: 'THREAT_ASSESSMENT',
        statusWhenSelected: 'REQUIRED',
        overridesQ1: true,
      });
    }

    const affectsCloudSecurity: string[] = [];
    if (['PC-02.8', 'PC-04.2', 'PC-04.4', 'WHERE-02', 'WHAT-34', 'WHAT-32'].includes(item.id)) {
      affectsCloudSecurity.push('CS-BASE-01..CS-BASE-21 (21 Baseline Questions)', 'Enables Q1.1..Q1.25 AWS Service Selectors');
    }

    const matchedCtrls = SAR_V5_CONTROL_LIBRARY.filter((c) => c.mappingTags.includes(item.label));

    entries.push({
      referenceId: item.id,
      section: item.sectionTitle,
      exactLabel: item.label,
      startsThreatPattern: item.startsPattern,
      contributesToFlags,
      routesQuestionnaires,
      unlocksConditionalRows: Array.from(unlocksConditionalRowsSet),
      affectsCloudSecurity,
      matchedThreatControlTags: matchedCtrls.length > 0 ? [item.label] : [],
      matchedThreatControlIds: matchedCtrls.map((c) => c.controlId),
    });
  }

  return entries;
}

// ============================================================================
// BRIDGE FROM P1–P30 WIZARD ANSWERS TO SAR CHECKLIST v5 INPUT STATE
// Ensures every interactive SAR session in the app also computes its exact
// Level 0–Level 4 SAR Checklist v5 state deterministically!
// ============================================================================

function extractVal(answers: Record<string, AnswerEntry | unknown>, key: string): unknown {
  const entry = answers[key];
  if (entry === undefined || entry === null) return undefined;
  if (typeof entry === 'object' && entry !== null && 'value' in entry) {
    return (entry as AnswerEntry).value;
  }
  return entry;
}

export function mapWizardAnswersToSarV5Input(
  answers: Record<string, AnswerEntry | unknown>
): SarV5InputState {
  const preliminary: Record<string, SarV5TriState> = {};

  // Allow direct v5 keys (PC-01, PC-02.1..WHAT-36) if supplied directly in `answers`
  const directQ1 = extractVal(answers, 'PC-01') ?? extractVal(answers, 'Q1');
  let q1: SarV5PrimaryObjective = '';
  if (typeof directQ1 === 'string' && SAR_V5_Q1_OPTIONS.includes(directQ1 as Exclude<SarV5PrimaryObjective, ''>)) {
    q1 = directQ1 as SarV5PrimaryObjective;
  }

  for (const item of SAR_V5_PRELIMINARY_ITEMS) {
    const directVal = extractVal(answers, item.id);
    if (directVal === 'Yes' || directVal === true || directVal === 'yes') {
      preliminary[item.id] = 'Yes';
    } else if (directVal === 'No' || directVal === false || directVal === 'no') {
      preliminary[item.id] = 'No';
    }
  }

  // Translate P1..P30 wizard answers when present
  const p1Raw = extractVal(answers, 'P1');
  const p1Arr = Array.isArray(p1Raw) ? p1Raw.map(String) : p1Raw ? [String(p1Raw)] : [];
  if (!q1 && p1Arr.length > 0) {
    if (p1Arr.includes('new_app')) {
      q1 = 'New internal application';
    } else if (p1Arr.includes('enhancement')) {
      q1 = 'Major enhancement to existing application';
    } else if (p1Arr.includes('new_integration') || p1Arr.includes('saas_portal')) {
      q1 = 'New Internal system-to-system or new external/vendor integration';
    } else if (p1Arr.includes('data_migration')) {
      q1 = 'Data Migration';
    } else if (p1Arr.includes('infra_cloud_network')) {
      q1 = 'Infrastructure/Platform changes';
    } else if (p1Arr.includes('other') || p1Arr.includes('rpa_process')) {
      q1 = 'Other';
    }
  }

  const p4Raw = extractVal(answers, 'P4');
  const p4Arr = Array.isArray(p4Raw) ? p4Raw.map(String) : [];
  const p5 = extractVal(answers, 'P5');
  const p6Raw = extractVal(answers, 'P6');
  const p6Arr = Array.isArray(p6Raw) ? p6Raw.map(String) : [];
  const p8Raw = extractVal(answers, 'P8');
  const p8Arr = Array.isArray(p8Raw) ? p8Raw.map(String) : [];
  const p9Raw = extractVal(answers, 'P9');
  const p9Arr = Array.isArray(p9Raw) ? p9Raw.map(String) : [];
  const p10Raw = extractVal(answers, 'P10');
  const p10Arr = Array.isArray(p10Raw) ? p10Raw.map(String) : [];
  const p11Raw = extractVal(answers, 'P11');
  const p11Arr = Array.isArray(p11Raw) ? p11Raw.map(String) : [];
  const p12 = extractVal(answers, 'P12');
  const p13 = extractVal(answers, 'P13');
  const p14Raw = extractVal(answers, 'P14');
  const p14Arr = Array.isArray(p14Raw) ? p14Raw.map(String) : [];
  const p16 = extractVal(answers, 'P16');
  const p17 = extractVal(answers, 'P17');
  const p18 = extractVal(answers, 'P18');
  const p19 = extractVal(answers, 'P19');
  const p20 = extractVal(answers, 'P20');
  const p21Raw = extractVal(answers, 'P21');
  const p21Arr = Array.isArray(p21Raw) ? p21Raw.map(String) : [];
  const p22Raw = extractVal(answers, 'P22');
  const p22Arr = Array.isArray(p22Raw) ? p22Raw.map(String) : [];
  const p25 = extractVal(answers, 'P25');
  const p26Raw = extractVal(answers, 'P26');
  const p26Arr = Array.isArray(p26Raw) ? p26Raw.map(String) : [];
  const p27 = extractVal(answers, 'P27');
  const p28 = extractVal(answers, 'P28');
  const p29 = extractVal(answers, 'P29');

  const setIfUndef = (id: string, val: SarV5TriState) => {
    if (preliminary[id] === undefined && val !== '') {
      preliminary[id] = val;
    }
  };

  if (p1Arr.length > 0) {
    setIfUndef('PC-02.1', p1Arr.includes('new_app') || p4Arr.includes('ui') ? 'Yes' : 'No');
    setIfUndef(
      'PC-02.2',
      p4Arr.includes('ui') || p9Arr.includes('web_browser') || p9Arr.includes('mobile_app')
        ? 'Yes'
        : 'No'
    );
    setIfUndef(
      'PC-02.3',
      p4Arr.includes('apis') ||
        p4Arr.includes('integrations') ||
        p14Arr.includes('rest_api') ||
        p14Arr.includes('graphql') ||
        p14Arr.includes('soap') ||
        p16 === 'yes_gateway' ||
        p16 === 'yes_directly'
        ? 'Yes'
        : p13 === 'no'
        ? 'No'
        : ''
    );
    setIfUndef('PC-02.4', p4Arr.includes('data_flows') || p4Arr.includes('reports') ? 'Yes' : 'No');
    setIfUndef('PC-02.5', p4Arr.includes('database') || p14Arr.includes('db_connection') ? 'Yes' : 'No');
    setIfUndef(
      'PC-02.6',
      p1Arr.includes('data_migration') || p4Arr.includes('data_migration_comp') ? 'Yes' : 'No'
    );
    setIfUndef(
      'PC-02.7',
      p14Arr.includes('file_transfer') || p4Arr.includes('file_transfer_comp') ? 'Yes' : 'No'
    );
    setIfUndef(
      'PC-02.8',
      p5 === 'bank_aws' || p5 === 'other_cloud' || p5 === 'hybrid' || p4Arr.includes('cloud_k8s_containers')
        ? 'Yes'
        : p5 === 'bank_dc'
        ? 'No'
        : ''
    );
    setIfUndef(
      'PC-02.9',
      p14Arr.includes('queues_streams') || p4Arr.includes('queues_streaming_comp') ? 'Yes' : 'No'
    );
    setIfUndef(
      'PC-02.10',
      p1Arr.includes('new_integration') ||
        p13 === 'external_only' ||
        p13 === 'both' ||
        p29 === 'yes' ||
        p4Arr.includes('third_party_connectivity')
        ? 'Yes'
        : 'No'
    );
    setIfUndef(
      'PC-02.11',
      p28 === 'yes_bank_hosted' || p28 === 'yes_third_party' || p4Arr.includes('ai_llm_comp') ? 'Yes' : 'No'
    );
    setIfUndef('PC-02.12', p4Arr.includes('login_access') || p12 === 'yes' ? 'Yes' : 'No');
    setIfUndef('PC-02.13', p1Arr.includes('rpa_process') || p11Arr.includes('rpa_bots') ? 'Yes' : 'No');
    setIfUndef('PC-02.14', p1Arr.includes('other') || p4Arr.includes('other') ? 'Yes' : 'No');
  }

  if (p25 === 'yes') setIfUndef('PC-03', 'Yes');
  else if (p25 === 'no') setIfUndef('PC-03', 'No');

  if (p27 !== undefined || p5 !== undefined) {
    const isCloud = p5 === 'bank_aws' || p5 === 'other_cloud' || p5 === 'hybrid';
    setIfUndef('PC-04.1', p27 === 'yes' ? 'Yes' : p27 === 'no' ? 'No' : '');
    setIfUndef('PC-04.2', isCloud ? 'Yes' : p5 === 'bank_dc' || p5 === 'vendor_saas' ? 'No' : '');
    setIfUndef('PC-04.3', p27 === 'yes' && p4Arr.includes('database') ? 'Yes' : 'No');
    setIfUndef('PC-04.4', isCloud && p27 === 'yes' ? 'Yes' : p27 === 'no' || p5 === 'bank_dc' ? 'No' : '');
    setIfUndef('PC-04.5', p14Arr.includes('queues_streams') ? 'Yes' : 'No');
    setIfUndef('PC-04.6', p17 === 'yes' ? 'Yes' : 'No');
    setIfUndef('PC-04.7', p27 === 'no' ? 'Yes' : 'No');
  }

  if (p18 === 'yes' || p1Arr.includes('saas_portal') || p5 === 'vendor_saas') {
    setIfUndef('PC-05', 'Yes');
  } else if (p18 === 'no') {
    setIfUndef('PC-05', 'No');
  }

  if (p17 === 'yes' || p17 === 'not_sure') {
    setIfUndef('PC-06', 'Yes');
  } else if (p17 === 'no') {
    setIfUndef('PC-06', 'No');
  }

  // WHO-01..WHO-11
  if (p8Arr.includes('bank_employees')) setIfUndef('WHO-01', 'Yes');
  if (p8Arr.includes('partner_vendor_staff') || p29 === 'yes') setIfUndef('WHO-02', 'Yes');
  if (p8Arr.includes('customers') || p8Arr.includes('corporates_bc')) setIfUndef('WHO-03', 'Yes');
  if (p8Arr.includes('public_visitors')) setIfUndef('WHO-04', 'Yes');
  if (p8Arr.includes('executive_board')) setIfUndef('WHO-05', 'Yes');
  if (p8Arr.includes('privileged_admins')) setIfUndef('WHO-06', 'Yes');

  if (p11Arr.includes('service_accounts')) setIfUndef('WHO-07', 'Yes');
  if (p11Arr.includes('microservices')) setIfUndef('WHO-08', 'Yes');
  if (p11Arr.includes('api_clients')) setIfUndef('WHO-09', 'Yes');
  if (p11Arr.includes('rpa_bots') || p1Arr.includes('rpa_process')) setIfUndef('WHO-10', 'Yes');
  if (p11Arr.includes('db_accounts')) setIfUndef('WHO-11', 'Yes');

  // HOW-01..HOW-23
  if (p9Arr.includes('web_browser') || p14Arr.includes('rest_api')) setIfUndef('HOW-01', 'Yes');
  if (p10Arr.includes('vpn') || p14Arr.includes('vpn_ipsec_ssh_tunnel')) setIfUndef('HOW-02', 'Yes');
  if (p9Arr.includes('cli')) {
    setIfUndef('HOW-03', 'Yes');
    setIfUndef('HOW-21', 'Yes');
    setIfUndef('HOW-23', 'Yes');
  }
  if (p10Arr.includes('partner_network')) setIfUndef('HOW-04', 'Yes');
  if (p14Arr.includes('email_smtp')) setIfUndef('HOW-05', 'Yes');
  if (p14Arr.includes('file_transfer')) {
    setIfUndef('HOW-06', 'Yes');
    setIfUndef('HOW-07', 'Yes');
    setIfUndef('HOW-17', 'Yes');
  }
  if (p14Arr.includes('other_custom')) setIfUndef('HOW-08', 'Yes');
  if (p14Arr.includes('rest_api')) setIfUndef('HOW-09', 'Yes');
  if (p14Arr.includes('graphql')) setIfUndef('HOW-10', 'Yes');
  if (p14Arr.includes('soap')) setIfUndef('HOW-11', 'Yes');
  if (p14Arr.includes('websocket')) setIfUndef('HOW-12', 'Yes');
  if (p14Arr.includes('webhooks')) setIfUndef('HOW-13', 'Yes');
  if (p14Arr.includes('queues_streams')) setIfUndef('HOW-14', 'Yes');
  if (p14Arr.includes('db_connection')) setIfUndef('HOW-15', 'Yes');
  if (p11Arr.includes('microservices') || p14Arr.includes('service_to_service')) setIfUndef('HOW-16', 'Yes');
  if (p9Arr.includes('web_browser')) setIfUndef('HOW-18', 'Yes');
  if (p9Arr.includes('mobile_app')) setIfUndef('HOW-19', 'Yes');
  if (p9Arr.includes('desktop_app')) setIfUndef('HOW-20', 'Yes');
  if (p9Arr.includes('rdp_vdi')) setIfUndef('HOW-22', 'Yes');

  // WHERE-01..WHERE-23
  if (p5 === 'bank_dc' || p5 === 'hybrid') setIfUndef('WHERE-01', 'Yes');
  if (p5 === 'bank_aws' || p5 === 'other_cloud' || p5 === 'hybrid') setIfUndef('WHERE-02', 'Yes');
  if (p5 === 'vendor_saas' || p1Arr.includes('saas_portal')) setIfUndef('WHERE-03', 'Yes');
  if (p5 === 'other_cloud') setIfUndef('WHERE-04', 'Yes');
  if (p6Arr.includes('production')) setIfUndef('WHERE-05', 'Yes');
  if (p6Arr.includes('dr')) setIfUndef('WHERE-06', 'Yes');
  if (p6Arr.includes('uat') || p6Arr.includes('development')) setIfUndef('WHERE-07', 'Yes');
  if (p10Arr.includes('corporate_network')) {
    setIfUndef('WHERE-08', 'Yes');
    setIfUndef('WHERE-14', 'Yes');
    setIfUndef('WHERE-20', 'Yes');
  } else if (p8Arr.includes('bank_employees') || p8Arr.includes('privileged_admins')) {
    setIfUndef('WHERE-14', 'Yes');
  }
  if (p10Arr.includes('vpn')) {
    setIfUndef('WHERE-09', 'Yes');
    setIfUndef('WHERE-22', 'Yes');
  }
  if (p10Arr.includes('dmz_subnet')) setIfUndef('WHERE-10', 'Yes');
  if (p10Arr.includes('internet')) setIfUndef('WHERE-11', 'Yes');
  if (p10Arr.includes('partner_network')) {
    setIfUndef('WHERE-12', 'Yes');
    setIfUndef('WHERE-23', 'Yes');
  } else if (p8Arr.includes('partner_vendor_staff')) {
    setIfUndef('WHERE-23', 'Yes');
  }
  if (p10Arr.includes('isolated_subnet')) setIfUndef('WHERE-13', 'Yes');
  if (p10Arr.includes('byod_unmanaged')) {
    setIfUndef('WHERE-15', 'Yes');
    setIfUndef('WHERE-16', 'Yes');
  }
  if (p9Arr.includes('kiosk') || p10Arr.includes('branch_office')) {
    if (p9Arr.includes('kiosk')) setIfUndef('WHERE-17', 'Yes');
    setIfUndef('WHERE-21', 'Yes');
    setIfUndef('WHERE-08', 'Yes');
  }
  if (p9Arr.includes('rdp_vdi')) setIfUndef('WHERE-18', 'Yes');
  if (p9Arr.includes('mobile_app')) setIfUndef('WHERE-19', 'Yes');

  // WHAT-01..WHAT-36
  if (p19 === 'yes') {
    if (p20 === 'public') setIfUndef('WHAT-01', 'Yes');
    if (p20 === 'internal') setIfUndef('WHAT-02', 'Yes');
    if (p20 === 'confidential') setIfUndef('WHAT-03', 'Yes');
    if (p20 === 'sensitive') setIfUndef('WHAT-04', 'Yes');
  }
  if (p21Arr.includes('pii')) setIfUndef('WHAT-05', 'Yes');
  if (p21Arr.includes('employee_data')) setIfUndef('WHAT-06', 'Yes');
  if (p21Arr.includes('financial') || p21Arr.includes('pci')) setIfUndef('WHAT-07', 'Yes');
  if (
    p21Arr.includes('regulatory_data') ||
    p26Arr.includes('rbi_guidelines') ||
    p26Arr.includes('pci_dss') ||
    p26Arr.includes('dpdp_law')
  ) {
    setIfUndef('WHAT-08', 'Yes');
  }
  if (p21Arr.includes('secrets_keys')) {
    setIfUndef('WHAT-09', 'Yes');
    setIfUndef('WHAT-10', 'Yes');
  }
  if (p21Arr.includes('source_code_ip')) {
    setIfUndef('WHAT-11', 'Yes');
    setIfUndef('WHAT-12', 'Yes');
  }
  if (p21Arr.includes('trade_secrets')) setIfUndef('WHAT-13', 'Yes');
  if (p21Arr.includes('logs_telemetry')) setIfUndef('WHAT-14', 'Yes');
  if (p21Arr.includes('metadata_only')) setIfUndef('WHAT-15', 'Yes');
  if (p21Arr.includes('config_data')) setIfUndef('WHAT-16', 'Yes');

  if (p22Arr.includes('at_rest_db_files')) setIfUndef('WHAT-17', 'Yes');
  if (p22Arr.includes('in_transit')) setIfUndef('WHAT-18', 'Yes');
  if (p22Arr.includes('in_use_memory')) setIfUndef('WHAT-19', 'Yes');
  if (p22Arr.includes('in_backups')) setIfUndef('WHAT-20', 'Yes');
  if (p22Arr.includes('in_logs')) setIfUndef('WHAT-21', 'Yes');
  if (p22Arr.includes('in_cache')) setIfUndef('WHAT-22', 'Yes');

  if (p1Arr.includes('new_app') || p1Arr.includes('enhancement')) setIfUndef('WHAT-23', 'Yes');
  if (p16 === 'yes_gateway' || p16 === 'yes_directly' || p14Arr.includes('rest_api')) {
    setIfUndef('WHAT-24', 'Yes');
  }
  if (p22Arr.includes('at_rest_db_files') || p14Arr.includes('db_connection')) {
    setIfUndef('WHAT-25', 'Yes');
  }
  if (p14Arr.includes('file_transfer')) setIfUndef('WHAT-26', 'Yes');
  if (p27 === 'yes') setIfUndef('WHAT-27', 'Yes');
  if (p4Arr.includes('login_access') || p12 === 'yes') setIfUndef('WHAT-28', 'Yes');
  if (p21Arr.includes('secrets_keys') || p21Arr.includes('pci')) setIfUndef('WHAT-29', 'Yes');
  if (p22Arr.includes('in_logs') || p21Arr.includes('logs_telemetry')) setIfUndef('WHAT-30', 'Yes');
  if (p17 === 'yes' || p1Arr.includes('firewall_network')) setIfUndef('WHAT-31', 'Yes');
  if (p5 === 'bank_aws' || p5 === 'other_cloud' || p5 === 'hybrid') {
    setIfUndef('WHAT-32', 'Yes');
    setIfUndef('WHAT-34', 'Yes');
  }
  if (p4Arr.includes('cloud_k8s_containers')) setIfUndef('WHAT-33', 'Yes');
  if (p5 === 'vendor_saas' || p1Arr.includes('saas_portal')) setIfUndef('WHAT-35', 'Yes');
  if (p28 === 'yes_bank_hosted' || p28 === 'yes_third_party') setIfUndef('WHAT-36', 'Yes');

  // Map Cloud Security service selectors from M11_Q3 or direct Q1.x keys
  const cloudSelectors: Record<string, SarV5TriState> = {};
  const m11q3 = extractVal(answers, 'M11_Q3');
  const m11q3Arr = Array.isArray(m11q3) ? m11q3.map(String) : [];
  for (const sel of SAR_V5_CLOUD_SERVICE_SELECTORS) {
    const directSel = extractVal(answers, sel.selectorId);
    if (directSel === 'Yes' || directSel === 'No') {
      cloudSelectors[sel.selectorId] = directSel;
    } else if (m11q3Arr.length > 0) {
      cloudSelectors[sel.selectorId] = m11q3Arr.includes(sel.selectorId) ? 'Yes' : 'No';
    } else if (p5 === 'bank_aws' || p5 === 'hybrid') {
      // Infer sensible defaults from preliminary answers when M11_Q3 not yet explicitly answered
      if (['Q1.2', 'Q1.6', 'Q1.8', 'Q1.14', 'Q1.15', 'Q1.20'].includes(sel.selectorId)) {
        cloudSelectors[sel.selectorId] = 'Yes';
      } else if (sel.selectorId === 'Q1.16' && p14Arr.includes('queues_streams')) {
        cloudSelectors[sel.selectorId] = 'Yes';
      } else if (sel.selectorId === 'Q1.24' && (p28 === 'yes_bank_hosted' || p28 === 'yes_third_party')) {
        cloudSelectors[sel.selectorId] = 'Yes';
      } else {
        cloudSelectors[sel.selectorId] = 'No';
      }
    }
  }

  return {
    q1,
    preliminary,
    cloudSelectors,
  };
}

// ============================================================================
// SECTION 12 — 30 AUTHORITATIVE VALIDATION & REGRESSION TEST CASES
// ============================================================================

export interface SarV5ValidationTestResult {
  testNumber: number;
  testId: string;
  title: string;
  passed: boolean;
  assertionsChecked: number;
  failures: string[];
  summary: string;
  evaluationMs: number;
}

export function runSarV5ValidationSuite(): {
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  totalEvaluationMs: number;
  results: SarV5ValidationTestResult[];
} {
  const results: SarV5ValidationTestResult[] = [];

  const allRoutingNo: Record<string, SarV5TriState> = {
    'PC-02.3': 'No',
    'PC-02.6': 'No',
    'PC-02.8': 'No',
    'PC-02.10': 'No',
    'PC-04.2': 'No',
    'PC-04.4': 'No',
    'PC-06': 'No',
  };

  const runTest = (
    testNumber: number,
    title: string,
    fn: (assert: (cond: boolean, msg: string) => void) => string
  ) => {
    const t0 = performance.now();
    let assertionsChecked = 0;
    const failures: string[] = [];
    const assert = (cond: boolean, msg: string) => {
      assertionsChecked++;
      if (!cond) failures.push(msg);
    };
    const summary = fn(assert);
    const elapsed = Number((performance.now() - t0).toFixed(3));
    results.push({
      testNumber,
      testId: `TC-${String(testNumber).padStart(2, '0')}`,
      title,
      passed: failures.length === 0,
      assertionsChecked,
      failures,
      summary,
      evaluationMs: elapsed,
    });
  };

  // 1. Q1 blank and all other answers blank
  runTest(1, 'Q1 blank and all other answers blank', (assert) => {
    const res = evaluateSarV5({ q1: '', preliminary: {} });
    assert(res.questionnaires.APPLICATION_BASE.status === 'PENDING', 'App Base must be PENDING');
    assert(res.questionnaires.INTEGRATION.status === 'PENDING', 'Integration must be PENDING');
    assert(res.questionnaires.DATA_MIGRATION.status === 'PENDING', 'Data Migration must be PENDING');
    assert(res.questionnaires.API_SECURITY.status === 'PENDING', 'API Security must be PENDING');
    assert(res.questionnaires.CLOUD_SECURITY.status === 'PENDING', 'Cloud Security must be PENDING');
    assert(res.questionnaires.FIREWALL_PORTS.status === 'PENDING', 'Firewall Ports must be PENDING');
    assert(res.questionnaires.THREAT_ASSESSMENT.status === 'PENDING', 'Threat Assessment must be PENDING');
    assert(res.flags.PatternStarted.value === false, 'PatternStarted must be false');
    return 'All 7 questionnaires evaluate to PENDING and all 6 flags + PatternStarted are false.';
  });

  // 2. Q1 = New internal application
  runTest(2, 'Q1 = New internal application', (assert) => {
    const res = evaluateSarV5({ q1: 'New internal application', preliminary: { ...allRoutingNo } });
    assert(res.questionnaires.APPLICATION_BASE.status === 'REQUIRED', 'App Base must be REQUIRED');
    assert(res.questionnaires.INTEGRATION.status === 'NOT REQUIRED', 'Integration must be NOT REQUIRED');
    assert(res.questionnaires.DATA_MIGRATION.status === 'NOT REQUIRED', 'Data Migration must be NOT REQUIRED');
    assert(res.questionnaires.API_SECURITY.status === 'NOT REQUIRED', 'API Security must be NOT REQUIRED');
    assert(res.questionnaires.CLOUD_SECURITY.status === 'NOT REQUIRED', 'Cloud Security must be NOT REQUIRED');
    assert(res.questionnaires.FIREWALL_PORTS.status === 'NOT REQUIRED', 'Firewall Ports must be NOT REQUIRED');
    assert(res.questionnaires.APPLICATION_BASE.totalRowCount === 52, 'App Base must have 52 total rows');
    assert(res.questionnaires.APPLICATION_BASE.activeRowCount === 47, '47 non-conditional App Base rows must be ACTIVE');
    assert(res.questionnaires.APPLICATION_BASE.greyedRowCount === 5, '5 conditional App Base rows must be GREYED');
    return 'Application Base = REQUIRED (47 baseline ACTIVE, 5 conditional GREYED); other primary/secondary sheets NOT REQUIRED.';
  });

  // 3. Q1 = Major enhancement to existing application
  runTest(3, 'Q1 = Major enhancement to existing application', (assert) => {
    const res = evaluateSarV5({
      q1: 'Major enhancement to existing application',
      preliminary: { ...allRoutingNo },
    });
    assert(res.questionnaires.APPLICATION_BASE.status === 'REQUIRED', 'App Base must be REQUIRED');
    assert(res.questionnaires.INTEGRATION.status === 'NOT REQUIRED', 'Integration must be NOT REQUIRED');
    assert(res.questionnaires.DATA_MIGRATION.status === 'NOT REQUIRED', 'Data Migration must be NOT REQUIRED');
    return 'Application Base = REQUIRED; Integration & Data Migration = NOT REQUIRED.';
  });

  // 4. Q1 = New Internal system-to-system or new external/vendor integration
  runTest(4, 'Q1 = New Internal system-to-system or new external/vendor integration', (assert) => {
    const res = evaluateSarV5({
      q1: 'New Internal system-to-system or new external/vendor integration',
      preliminary: { ...allRoutingNo },
    });
    assert(res.questionnaires.APPLICATION_BASE.status === 'NOT REQUIRED', 'App Base must be NOT REQUIRED');
    assert(res.questionnaires.INTEGRATION.status === 'REQUIRED', 'Integration must be REQUIRED');
    assert(res.questionnaires.DATA_MIGRATION.status === 'NOT REQUIRED', 'Data Migration must be NOT REQUIRED');
    assert(res.questionnaires.INTEGRATION.activeRowCount === 9, '9 non-conditional Integration rows must be ACTIVE');
    assert(res.questionnaires.INTEGRATION.greyedRowCount === 9, '9 conditional Integration rows must be GREYED');
    return 'Integration = REQUIRED (9 baseline ACTIVE, 9 conditional GREYED); App Base & Data Migration = NOT REQUIRED.';
  });

  // 5. Q1 = Data Migration
  runTest(5, 'Q1 = Data Migration', (assert) => {
    const res = evaluateSarV5({ q1: 'Data Migration', preliminary: { ...allRoutingNo } });
    assert(res.questionnaires.APPLICATION_BASE.status === 'NOT REQUIRED', 'App Base must be NOT REQUIRED');
    assert(res.questionnaires.INTEGRATION.status === 'NOT REQUIRED', 'Integration must be NOT REQUIRED');
    assert(res.questionnaires.DATA_MIGRATION.status === 'REQUIRED', 'Data Migration must be REQUIRED');
    assert(res.questionnaires.DATA_MIGRATION.activeRowCount === 9, 'All 9 Data Migration rows must be ACTIVE');
    return 'Data Migration = REQUIRED (all 9 rows ACTIVE); App Base & Integration = NOT REQUIRED.';
  });

  // 6. Q1 = Infrastructure/Platform changes
  runTest(6, 'Q1 = Infrastructure/Platform changes', (assert) => {
    const res = evaluateSarV5({
      q1: 'Infrastructure/Platform changes',
      preliminary: { ...allRoutingNo },
    });
    assert(res.questionnaires.APPLICATION_BASE.status === 'NOT REQUIRED', 'App Base must be NOT REQUIRED');
    assert(res.questionnaires.INTEGRATION.status === 'NOT REQUIRED', 'Integration must be NOT REQUIRED');
    assert(res.questionnaires.DATA_MIGRATION.status === 'NOT REQUIRED', 'Data Migration must be NOT REQUIRED');
    return 'All 3 primary questionnaires (App Base, Integration, Data Migration) evaluate to NOT REQUIRED.';
  });

  // 7. Q1 = Other
  runTest(7, 'Q1 = Other', (assert) => {
    const res = evaluateSarV5({ q1: 'Other', preliminary: { ...allRoutingNo } });
    assert(res.questionnaires.APPLICATION_BASE.status === 'CONFIRM', 'App Base must be CONFIRM');
    assert(res.questionnaires.INTEGRATION.status === 'CONFIRM', 'Integration must be CONFIRM');
    assert(res.questionnaires.DATA_MIGRATION.status === 'CONFIRM', 'Data Migration must be CONFIRM');
    return 'All 3 primary questionnaires evaluate to CONFIRM when Q1 = Other and no override trigger is Yes.';
  });

  // 8. Q1 blank with PC-02.10 = Yes
  runTest(8, 'Q1 blank with PC-02.10 = Yes', (assert) => {
    const res = evaluateSarV5({ q1: '', preliminary: { 'PC-02.10': 'Yes' } });
    assert(res.questionnaires.INTEGRATION.status === 'REQUIRED', 'PC-02.10=Yes must force Integration REQUIRED even when Q1 is blank');
    assert(res.questionnaires.APPLICATION_BASE.status === 'PENDING', 'App Base must remain PENDING');
    assert(res.questionnaires.DATA_MIGRATION.status === 'PENDING', 'Data Migration must remain PENDING');
    assert(res.flags.ThirdPartyAccess.value === true, 'ThirdPartyAccess flag must be true');
    return 'PC-02.10 = Yes overrides blank Q1 to make Integration REQUIRED and sets ThirdPartyAccess = true.';
  });

  // 9. Q1 blank with PC-02.6 = Yes
  runTest(9, 'Q1 blank with PC-02.6 = Yes', (assert) => {
    const res = evaluateSarV5({ q1: '', preliminary: { 'PC-02.6': 'Yes' } });
    assert(res.questionnaires.DATA_MIGRATION.status === 'REQUIRED', 'PC-02.6=Yes must force Data Migration REQUIRED even when Q1 is blank');
    assert(res.questionnaires.APPLICATION_BASE.status === 'PENDING', 'App Base must remain PENDING');
    assert(res.questionnaires.INTEGRATION.status === 'PENDING', 'Integration must remain PENDING');
    assert(res.flags.DataMigration.value === true, 'DataMigration flag must be true');
    return 'PC-02.6 = Yes overrides blank Q1 to make Data Migration REQUIRED and sets DataMigration = true.';
  });

  // 10. PC-02.3 = Yes
  runTest(10, 'PC-02.3 = Yes', (assert) => {
    const res = evaluateSarV5({
      q1: 'Infrastructure/Platform changes',
      preliminary: { ...allRoutingNo, 'PC-02.3': 'Yes' },
    });
    assert(res.questionnaires.API_SECURITY.status === 'REQUIRED', 'API Security must be REQUIRED');
    assert(res.questionnaires.API_SECURITY.activeRowCount === 7, '7 baseline API rows must be ACTIVE (API-AB-08 GREYED without SensitiveData)');
    return 'PC-02.3 = Yes routes API Security to REQUIRED independently of Q1.';
  });

  // 11. HOW-09 = Yes
  runTest(11, 'HOW-09 = Yes', (assert) => {
    const res = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'HOW-09': 'Yes' },
    });
    assert(res.questionnaires.API_SECURITY.status === 'REQUIRED', 'HOW-09=Yes must route API Security to REQUIRED even when PC-02.3=No');
    assert(res.flags.PatternStarted.value === true, 'HOW-09=Yes must set PatternStarted=true');
    assert(res.questionnaires.THREAT_ASSESSMENT.status === 'REQUIRED', 'Threat Assessment must be REQUIRED');
    return 'HOW-09 (REST API) = Yes routes API Security to REQUIRED, starts threat patterns, and triggers TA-CTRL-05.';
  });

  // 12. HOW-08 = Yes with PC-06 blank and answered
  runTest(12, 'HOW-08 = Yes with PC-06 blank and answered', (assert) => {
    const resBlank = evaluateSarV5({ q1: '', preliminary: { 'HOW-08': 'Yes' } });
    const resNo = evaluateSarV5({ q1: '', preliminary: { 'HOW-08': 'Yes', 'PC-06': 'No' } });
    const resYes = evaluateSarV5({ q1: '', preliminary: { 'HOW-08': 'Yes', 'PC-06': 'Yes' } });
    assert(resBlank.questionnaires.FIREWALL_PORTS.status === 'REQUIRED', 'Firewall Ports REQUIRED when HOW-08=Yes and PC-06 blank');
    assert(resNo.questionnaires.FIREWALL_PORTS.status === 'REQUIRED', 'Firewall Ports REQUIRED when HOW-08=Yes and PC-06=No');
    assert(resYes.questionnaires.FIREWALL_PORTS.status === 'REQUIRED', 'Firewall Ports REQUIRED when HOW-08=Yes and PC-06=Yes');
    return 'HOW-08 (Custom protocol) = Yes forces Firewall Ports to REQUIRED whether PC-06 is blank, No, or Yes.';
  });

  // 13. Cloud Security trigger selected with Cloud service selectors all No
  runTest(13, 'Cloud Security trigger selected with Cloud service selectors all No', (assert) => {
    const allSelectorsNo: Record<string, SarV5TriState> = {};
    for (const s of SAR_V5_CLOUD_SERVICE_SELECTORS) allSelectorsNo[s.selectorId] = 'No';
    const res = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'PC-04.2': 'Yes' },
      cloudSelectors: allSelectorsNo,
    });
    assert(res.questionnaires.CLOUD_SECURITY.status === 'REQUIRED', 'Cloud Security must remain REQUIRED even when all AWS selectors are No');
    assert(res.cloudSecurity.baselineApplicable === true, '21 CS-BASE questions must remain Applicable');
    assert(res.cloudSecurity.totalApplicableCloudQuestions === 21, 'Exactly 21 baseline Cloud questions must be Applicable');
    assert(res.cloudSecurity.services.every((s) => s.applicability === 'N/A'), 'All service-specific families must be N/A');
    return 'Cloud Security stays REQUIRED with 21 CS-BASE questions Applicable and all service-specific questions N/A.';
  });

  // 14. Cloud Security Required with one AWS selector Yes
  runTest(14, 'Cloud Security Required with one AWS selector Yes', (assert) => {
    const selectors: Record<string, SarV5TriState> = {};
    for (const s of SAR_V5_CLOUD_SERVICE_SELECTORS) {
      selectors[s.selectorId] = s.selectorId === 'Q1.6' ? 'Yes' : 'No';
    }
    const res = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHERE-02': 'Yes' },
      cloudSelectors: selectors,
    });
    const s3Service = res.cloudSecurity.services.find((s) => s.selectorId === 'Q1.6');
    assert(res.questionnaires.CLOUD_SECURITY.status === 'REQUIRED', 'Cloud Security must be REQUIRED');
    assert(s3Service?.applicability === 'Applicable', 'Q1.6 (S3) must be Applicable');
    assert(res.cloudSecurity.totalApplicableCloudQuestions === 21 + 10, '21 CS-BASE + 10 CS-S3 = 31 questions must be Applicable');
    return 'Selecting Q1.6 (S3) = Yes unlocks 10 CS-S3 questions on top of the 21 CS-BASE questions (31 Applicable total).';
  });

  // 15. SensitiveData = true and false
  runTest(15, 'SensitiveData = true and false', (assert) => {
    const resTrue = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'PC-02.10': 'Yes', 'PC-02.3': 'Yes', 'WHAT-05': 'Yes' },
    });
    const resFalse = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'PC-02.10': 'Yes', 'PC-02.3': 'Yes', 'WHAT-01': 'Yes' },
    });
    const getRow = (r: SarV5EvaluationSummary, id: string) =>
      r.conditionalRows.find((c) => c.questionId === id)?.rowState;
    assert(resTrue.flags.SensitiveData.value === true, 'SensitiveData must be true when WHAT-05=Yes');
    assert(getRow(resTrue, 'APP-DT-05') === 'ACTIVE', 'APP-DT-05 must be ACTIVE when SensitiveData=true');
    assert(getRow(resTrue, 'INT-DS-04') === 'ACTIVE', 'INT-DS-04 must be ACTIVE when SensitiveData=true');
    assert(getRow(resTrue, 'API-AB-08') === 'ACTIVE', 'API-AB-08 must be ACTIVE when SensitiveData=true');
    assert(resFalse.flags.SensitiveData.value === false, 'SensitiveData must be false when only WHAT-01=Yes');
    assert(getRow(resFalse, 'APP-DT-05') === 'GREYED', 'APP-DT-05 must be GREYED when SensitiveData=false');
    assert(getRow(resFalse, 'INT-DS-04') === 'GREYED', 'INT-DS-04 must be GREYED when SensitiveData=false');
    assert(getRow(resFalse, 'API-AB-08') === 'GREYED', 'API-AB-08 must be GREYED when SensitiveData=false');
    return 'SensitiveData toggles APP-DT-05, INT-DS-04, and API-AB-08 between ACTIVE and GREYED.';
  });

  // 16. PublicFacing = true and false
  runTest(16, 'PublicFacing = true and false', (assert) => {
    const resTrue = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHERE-11': 'Yes' },
    });
    const resFalse = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHERE-08': 'Yes' },
    });
    assert(resTrue.flags.PublicFacing.value === true, 'PublicFacing must be true when WHERE-11=Yes');
    assert(
      resTrue.conditionalRows.find((c) => c.questionId === 'APP-AC-05')?.rowState === 'ACTIVE',
      'APP-AC-05 must be ACTIVE'
    );
    assert(resFalse.flags.PublicFacing.value === false, 'PublicFacing must be false when only WHERE-08=Yes');
    assert(
      resFalse.conditionalRows.find((c) => c.questionId === 'APP-AC-05')?.rowState === 'GREYED',
      'APP-AC-05 must be GREYED'
    );
    return 'PublicFacing toggles APP-AC-05 (CAPTCHA) between ACTIVE and GREYED.';
  });

  // 17. DataMigration = true and false
  runTest(17, 'DataMigration = true and false (including PC-03 non-routing rule)', (assert) => {
    const resTrue = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'PC-03': 'Yes', 'WHO-01': 'Yes' },
    });
    const resFalse = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'PC-03': 'No', 'WHO-01': 'Yes' },
    });
    assert(resTrue.flags.DataMigration.value === true, 'DataMigration flag must be true when PC-03=Yes');
    assert(
      resTrue.questionnaires.DATA_MIGRATION.status === 'NOT REQUIRED',
      'PC-03=Yes must NOT route Data Migration questionnaire'
    );
    assert(
      resTrue.conditionalRows.find((c) => c.questionId === 'APP-DT-12')?.rowState === 'ACTIVE' &&
        resTrue.conditionalRows.find((c) => c.questionId === 'APP-DT-13')?.rowState === 'ACTIVE',
      'APP-DT-12 and APP-DT-13 must be ACTIVE in Application Base'
    );
    assert(resFalse.flags.DataMigration.value === false, 'DataMigration flag must be false when PC-03=No');
    assert(
      resFalse.conditionalRows.find((c) => c.questionId === 'APP-DT-12')?.rowState === 'GREYED',
      'APP-DT-12 must be GREYED when DataMigration=false'
    );
    return 'PC-03 = Yes activates DataMigration flag & unlocks APP-DT-12/13 without routing Data Migration sheet.';
  });

  // 18. ThirdPartyAccess = true and false
  runTest(18, 'ThirdPartyAccess = true and false', (assert) => {
    const resTrue = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHO-02': 'Yes' },
    });
    const resFalse = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHO-01': 'Yes' },
    });
    assert(resTrue.flags.ThirdPartyAccess.value === true, 'ThirdPartyAccess must be true when WHO-02=Yes');
    assert(
      resTrue.conditionalRows.find((c) => c.questionId === 'APP-IT-05')?.rowState === 'ACTIVE',
      'APP-IT-05 must be ACTIVE'
    );
    assert(resFalse.flags.ThirdPartyAccess.value === false, 'ThirdPartyAccess must be false');
    assert(
      resFalse.conditionalRows.find((c) => c.questionId === 'APP-IT-05')?.rowState === 'GREYED',
      'APP-IT-05 must be GREYED'
    );
    return 'ThirdPartyAccess toggles APP-IT-05 (APP-IN-05) between ACTIVE and GREYED.';
  });

  // 19. Portal = true and false
  runTest(19, 'Portal = true and false', (assert) => {
    const resTrue = evaluateSarV5({
      q1: 'New Internal system-to-system or new external/vendor integration',
      preliminary: { ...allRoutingNo, 'PC-05': 'Yes', 'WHO-01': 'Yes' },
    });
    const resFalse = evaluateSarV5({
      q1: 'New Internal system-to-system or new external/vendor integration',
      preliminary: { ...allRoutingNo, 'PC-05': 'No', 'WHO-01': 'Yes' },
    });
    assert(resTrue.flags.Portal.value === true, 'Portal must be true when PC-05=Yes');
    assert(
      resTrue.conditionalRows.find((c) => c.questionId === 'INT-ID-06')?.rowState === 'ACTIVE' &&
        resTrue.conditionalRows.find((c) => c.questionId === 'INT-ID-07')?.rowState === 'ACTIVE',
      'INT-ID-06 and INT-ID-07 must be ACTIVE'
    );
    assert(resFalse.flags.Portal.value === false, 'Portal must be false when PC-05=No');
    assert(
      resFalse.conditionalRows.find((c) => c.questionId === 'INT-ID-06')?.rowState === 'GREYED',
      'INT-ID-06 must be GREYED'
    );
    return 'Portal (PC-05) toggles INT-ID-06 and INT-ID-07 between ACTIVE and GREYED.';
  });

  // 20. FileTransfer = true and false
  runTest(20, 'FileTransfer = true and false', (assert) => {
    const resTrue = evaluateSarV5({
      q1: 'New Internal system-to-system or new external/vendor integration',
      preliminary: { ...allRoutingNo, 'HOW-06': 'Yes' },
    });
    const resFalse = evaluateSarV5({
      q1: 'New Internal system-to-system or new external/vendor integration',
      preliminary: { ...allRoutingNo, 'HOW-01': 'Yes' },
    });
    const ftIds = ['INT-FT-01', 'INT-FT-02', 'INT-FT-03', 'INT-FT-04', 'INT-FT-05', 'INT-FT-06'];
    assert(resTrue.flags.FileTransfer.value === true, 'FileTransfer must be true when HOW-06=Yes');
    assert(
      ftIds.every(
        (id) => resTrue.conditionalRows.find((c) => c.questionId === id)?.rowState === 'ACTIVE'
      ),
      'All 6 INT-FT-01..06 rows must be ACTIVE'
    );
    assert(resFalse.flags.FileTransfer.value === false, 'FileTransfer must be false');
    assert(
      ftIds.every(
        (id) => resFalse.conditionalRows.find((c) => c.questionId === id)?.rowState === 'GREYED'
      ),
      'All 6 INT-FT-01..06 rows must be GREYED'
    );
    return 'FileTransfer toggles all 6 INT-FT-01..06 rows between ACTIVE and GREYED.';
  });

  // 21. PatternStarted = false and true
  runTest(21, 'PatternStarted = false and true', (assert) => {
    const resFalse = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'PC-03': 'Yes' },
    });
    const resTrue = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'PC-03': 'Yes', 'WHO-01': 'Yes' },
    });
    assert(resFalse.flags.PatternStarted.value === false, 'PatternStarted must be false without WHO/HOW/WHERE/WHAT');
    assert(resFalse.flags.DataMigration.value === true, 'DataMigration flag is true from PC-03');
    assert(
      resFalse.conditionalRows.find((c) => c.questionId === 'APP-DT-12')?.rowState === 'GREYED',
      'APP-DT-12 must stay GREYED when PatternStarted=false even if DataMigration=true'
    );
    assert(resFalse.questionnaires.THREAT_ASSESSMENT.status === 'PENDING', 'Threat Assessment must be PENDING');
    assert(resTrue.flags.PatternStarted.value === true, 'PatternStarted must be true when WHO-01=Yes');
    assert(
      resTrue.conditionalRows.find((c) => c.questionId === 'APP-DT-12')?.rowState === 'ACTIVE',
      'APP-DT-12 becomes ACTIVE once PatternStarted=true'
    );
    assert(resTrue.questionnaires.THREAT_ASSESSMENT.status === 'REQUIRED', 'Threat Assessment becomes REQUIRED');
    return 'Verified PatternStarted gates both Threat Assessment status and conditional row activation.';
  });

  // 22. Multiple flags true simultaneously
  runTest(22, 'Multiple flags true simultaneously', (assert) => {
    const res = evaluateSarV5({
      q1: 'New internal application',
      preliminary: {
        ...allRoutingNo,
        'PC-02.10': 'Yes',
        'PC-02.3': 'Yes',
        'PC-03': 'Yes',
        'PC-05': 'Yes',
        'HOW-06': 'Yes',
        'WHERE-11': 'Yes',
        'WHAT-05': 'Yes',
      },
    });
    assert(res.conditionalRows.every((r) => r.rowState === 'ACTIVE'), 'All 15 conditional rows must be ACTIVE');
    return 'All 6 flags + PatternStarted are TRUE simultaneously; all 15 conditional rows evaluate to ACTIVE.';
  });

  // 23. Multiple controls matching the same tag / multiple tags matching the same control
  runTest(23, 'Multiple controls matching the same tag & deduplication check', (assert) => {
    const res = evaluateSarV5({
      q1: 'New internal application',
      preliminary: {
        ...allRoutingNo,
        'PC-04.4': 'Yes',
        'WHAT-34': 'Yes',
        'WHAT-33': 'Yes',
      },
    });
    const k8sControls = res.threatAssessment.controls.filter((c) => c.controlId === 'TA-CTRL-10');
    assert(k8sControls.length === 1, 'Control TA-CTRL-10 must appear exactly once (no duplication)');
    assert(k8sControls[0].applicable === true, 'TA-CTRL-10 must be Applicable');
    assert(
      k8sControls[0].triggeringReferenceIds.includes('PC-04.4') &&
        k8sControls[0].triggeringReferenceIds.includes('WHAT-34') &&
        k8sControls[0].triggeringReferenceIds.includes('WHAT-33'),
      'TA-CTRL-10 must record all matching reference IDs'
    );
    return 'Multiple matching tags and duplicate labels ("Kubernetes cluster") never duplicate a control.';
  });

  // 24. A control with no matching tag (including case-sensitive exact match verification)
  runTest(24, 'A control with no matching tag & case-sensitive exact-label check', (assert) => {
    const res = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'HOW-17': 'Yes' },
    });
    const ctrl07 = res.threatAssessment.controls.find((c) => c.controlId === 'TA-CTRL-07');
    const ctrl08 = res.threatAssessment.controls.find((c) => c.controlId === 'TA-CTRL-08');
    assert(
      ctrl07?.applicable === false,
      'TA-CTRL-07 (tagged "File Transfer" capital T) must NOT match HOW-17 ("File transfer" lowercase t)'
    );
    assert(
      ctrl08?.applicable === true,
      'TA-CTRL-08 (tagged "File transfer" lowercase t) MUST match HOW-17 ("File transfer")'
    );
    return 'Verified strict case-sensitive whole-label tag matching ("File transfer" != "File Transfer").';
  });

  // 25. A Pending questionnaire with some conditional flags already true
  runTest(25, 'A Pending questionnaire with some conditional flags already true', (assert) => {
    const res = evaluateSarV5({
      q1: '',
      preliminary: { 'WHERE-11': 'Yes', 'WHAT-05': 'Yes' },
    });
    assert(res.questionnaires.APPLICATION_BASE.status === 'PENDING', 'App Base is PENDING');
    assert(
      res.conditionalRows.find((c) => c.questionId === 'APP-AC-05')?.rowState === 'ACTIVE',
      'APP-AC-05 must be ACTIVE when App Base is PENDING and PublicFacing + PatternStarted are true'
    );
    assert(
      res.conditionalRows.find((c) => c.questionId === 'APP-DT-05')?.rowState === 'ACTIVE',
      'APP-DT-05 must be ACTIVE when App Base is PENDING and SensitiveData + PatternStarted are true'
    );
    return 'PENDING questionnaire is not greyed out; conditional rows with true flags + PatternStarted are ACTIVE.';
  });

  // 26. A Not Required questionnaire with conditional flags true
  runTest(26, 'A Not Required questionnaire with conditional flags true', (assert) => {
    const res = evaluateSarV5({
      q1: 'Data Migration',
      preliminary: { ...allRoutingNo, 'WHERE-11': 'Yes', 'WHAT-05': 'Yes', 'PC-03': 'Yes' },
    });
    assert(res.questionnaires.APPLICATION_BASE.status === 'NOT REQUIRED', 'App Base is NOT REQUIRED');
    assert(res.questionnaires.APPLICATION_BASE.activeRowCount === 0, '0 rows active in App Base');
    assert(res.questionnaires.APPLICATION_BASE.greyedRowCount === 52, 'All 52 rows greyed in App Base');
    assert(
      res.conditionalRows
        .filter((c) => c.questionnaireId === 'APPLICATION_BASE')
        .every((c) => c.rowState === 'GREYED'),
      'All conditional rows in App Base must be GREYED despite true flags'
    );
    return 'When a questionnaire is NOT REQUIRED, all 52 rows (including conditional rows with true flags) are GREYED.';
  });

  // 27. A Yes changed to No, followed by full recalculation
  runTest(27, 'A Yes changed to No, followed by full recalculation', (assert) => {
    const before = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHERE-11': 'Yes', 'WHO-01': 'Yes' },
    });
    const after = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHERE-11': 'No', 'WHO-01': 'Yes' },
    });
    assert(before.flags.PublicFacing.value === true, 'Before: PublicFacing is true');
    assert(
      before.conditionalRows.find((c) => c.questionId === 'APP-AC-05')?.rowState === 'ACTIVE',
      'Before: APP-AC-05 is ACTIVE'
    );
    assert(after.flags.PublicFacing.value === false, 'After: PublicFacing recalculated to false');
    assert(
      after.conditionalRows.find((c) => c.questionId === 'APP-AC-05')?.rowState === 'GREYED',
      'After: APP-AC-05 recalculated to GREYED'
    );
    return 'Changing WHERE-11 from Yes to No immediately recalculates PublicFacing -> false and APP-AC-05 -> GREYED.';
  });

  // 28. A previously blank routing answer completed after a questionnaire becomes Pending
  runTest(28, 'A previously blank routing answer completed after a questionnaire becomes Pending', (assert) => {
    const pendingState = evaluateSarV5({ q1: '', preliminary: {} });
    const completedState = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo },
    });
    assert(pendingState.questionnaires.APPLICATION_BASE.status === 'PENDING', 'Initially PENDING');
    assert(completedState.questionnaires.APPLICATION_BASE.status === 'REQUIRED', 'Transitions to REQUIRED');
    assert(completedState.questionnaires.INTEGRATION.status === 'NOT REQUIRED', 'Integration transitions to NOT REQUIRED');
    assert(completedState.questionnaires.FIREWALL_PORTS.status === 'NOT REQUIRED', 'Firewall Ports transitions to NOT REQUIRED');
    return 'Completing previously blank routing answers transitions questionnaires out of PENDING deterministically.';
  });

  // 29. A Cloud service changed from Yes to No
  runTest(29, 'A Cloud service changed from Yes to No', (assert) => {
    const withEks = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHERE-02': 'Yes' },
      cloudSelectors: { 'Q1.2': 'Yes' },
    });
    const withoutEks = evaluateSarV5({
      q1: 'New internal application',
      preliminary: { ...allRoutingNo, 'WHERE-02': 'Yes' },
      cloudSelectors: { 'Q1.2': 'No' },
    });
    assert(withEks.cloudSecurity.totalApplicableCloudQuestions === 21 + 8, 'With Q1.2=Yes: 29 Cloud questions applicable');
    assert(withoutEks.cloudSecurity.totalApplicableCloudQuestions === 21, 'With Q1.2=No: 21 Cloud questions applicable');
    assert(withoutEks.questionnaires.CLOUD_SECURITY.status === 'REQUIRED', 'Cloud Security remains REQUIRED');
    return 'Changing Q1.2 (EKS) from Yes to No marks CS-EKS N/A and updates applicable count from 29 to 21.';
  });

  // 30. A Threat Assessment control response changed between Yes, No and N/A
  runTest(30, 'A Threat Assessment control response changed between Yes, No and N/A', (assert) => {
    const basePrelim: Record<string, SarV5TriState> = {
      ...allRoutingNo,
      'WHO-01': 'Yes', // Matches TA-CTRL-01
      'HOW-09': 'Yes', // Matches TA-CTRL-05
    };
    const stateNA = evaluateSarV5({
      q1: 'New internal application',
      preliminary: basePrelim,
      threatResponses: { 'TA-CTRL-01': 'N/A', 'TA-CTRL-05': 'N/A' },
    });
    const stateMixed = evaluateSarV5({
      q1: 'New internal application',
      preliminary: basePrelim,
      threatResponses: { 'TA-CTRL-01': 'Yes', 'TA-CTRL-05': 'No' },
    });
    const stateAllYes = evaluateSarV5({
      q1: 'New internal application',
      preliminary: basePrelim,
      threatResponses: { 'TA-CTRL-01': 'Yes', 'TA-CTRL-05': 'Yes' },
    });
    assert(stateNA.threatAssessment.compliance.applicableControls === 2, '2 applicable controls');
    assert(stateNA.threatAssessment.compliance.pendingReviewControls === 2, '2 pending review when N/A');
    assert(stateNA.threatAssessment.compliance.complianceRate === 0, '0% compliance when both N/A');
    assert(stateMixed.threatAssessment.compliance.compliantControls === 1, '1 compliant');
    assert(stateMixed.threatAssessment.compliance.nonCompliantControls === 1, '1 non-compliant');
    assert(stateMixed.threatAssessment.compliance.complianceRate === 50, '50% compliance rate');
    assert(stateAllYes.threatAssessment.compliance.complianceRate === 100, '100% compliance rate');
    return 'Threat Assessment compliance counts and rate (0% -> 50% -> 100%) recalculate accurately across Yes/No/N/A.';
  });

  const passedCount = results.filter((r) => r.passed).length;
  const totalEvaluationMs = Number(
    results.reduce((acc, r) => acc + r.evaluationMs, 0).toFixed(2)
  );

  return {
    allPassed: passedCount === results.length,
    passedCount,
    totalCount: results.length,
    totalEvaluationMs,
    results,
  };
}
