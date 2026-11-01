export type UserRole = 'requester' | 'contributor' | 'analyst' | 'admin';

export interface UserPersona {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  department: string;
}

export interface CMDBApplication {
  id: string;
  canonicalName: string;
  code: string;
  aliases: string[];
  owner: string;
  ownerEmail: string;
  technicalSpoc: string;
  securitySpoc: string;
  businessUnit: string;
  hostingType: 'On-Prem' | 'AWS Cloud' | 'Hybrid' | 'Vendor SaaS';
  dataClassification: 'Public' | 'Internal' | 'Confidential' | 'Sensitive';
  existingSarId?: string;
  description: string;
}

export type ModuleCode =
  | 'M0'
  | 'M1'
  | 'M2'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'M7'
  | 'M8'
  | 'M9'
  | 'M10'
  | 'M11'
  | 'M12'
  | 'M13'
  | 'M14'
  | 'M15'
  | 'M16'
  | 'M17';

export type DerivedFlagId =
  | 'internet_facing'
  | 'external_party_involved'
  | 'new_trust_boundary_crossing'
  | 'external_file_transfer'
  | 'pii_or_pci_in_scope'
  | 'customer_facing_with_sensitive_data'
  | 'non_human_identity_present'
  | 'cloud_hosted'
  | 'on_prem_hosted'
  | 'hybrid'
  | 'scope_narrowed'
  | 'outside_india_data'
  | 'unknown_count_high'
  | 'vendor_involved'
  | 'api_exposed'
  | 'external_ai_present'
  | 'public_facing'
  | 'sensitive_data_v5'
  | 'data_migration_v5'
  | 'third_party_access_v5'
  | 'portal_access_v5'
  | 'file_transfer_v5'
  | 'pattern_started';

export type AnswerType =
  | 'single_select'
  | 'multi_select'
  | 'yes_no'
  | 'yes_no_not_sure'
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'ip_cidr'
  | 'port_range'
  | 'url_fqdn'
  | 'email'
  | 'app_picker';

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  setsFacts?: Record<string, string | string[] | boolean>;
  triggersModules?: ModuleCode[];
  unlocksQuestions?: string[];
  exclusive?: boolean;
  hostingFilter?: ('on_prem' | 'cloud' | 'saas')[];
}

export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'in'
  | 'containsAny'
  | 'containsAll'
  | 'greaterThan'
  | 'isUnknown'
  | 'isAnswered';

export interface LeafCondition {
  kind: 'leaf';
  source: 'answer' | 'fact' | 'flag';
  key: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface GroupCondition {
  kind: 'all' | 'any' | 'not';
  conditions: ConditionNode[];
}

export type ConditionNode = LeafCondition | GroupCondition;

export interface QuestionDefinition {
  id: string;
  code: string;
  moduleId: ModuleCode;
  stage?: 1 | 2 | 3 | 4 | 5 | 6;
  stageTitle?: string;
  text: string;
  hint: string;
  whyWeAsk: string;
  answerType: AnswerType;
  options?: QuestionOption[];
  required: boolean;
  hardRequired?: boolean;
  requireIf?: ConditionNode;
  requireIfReason?: string;
  hardRequireIf?: ConditionNode;
  hardRequireIfReason?: string;
  justificationRequired?: boolean;
  allowNotSure?: boolean;
  allowNotApplicable?: boolean;
  showOnlyIf?: ConditionNode;
  showOnlyIfText?: string;
  appliesToIntents?: string[];
  setsFacts?: Record<string, string | string[] | boolean>;
  triggersModules?: ModuleCode[];
  glossaryTerms?: string[];
}

export type RepeaterTableType = 'servers' | 'firewall_rules' | 'api_endpoints' | 'integrations';

export interface ModuleDefinition {
  code: ModuleCode;
  title: string;
  shortTitle: string;
  description: string;
  estimatedMinutes: number;
  typicallyTriggeredBy: string;
  repeaterTable?: RepeaterTableType;
}

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  condition: ConditionNode;
  includeModules?: ModuleCode[];
  showQuestions?: string[];
  requireQuestions?: string[];
  setFlags?: DerivedFlagId[];
  reasonTemplate: string;
  categoryLabel?: string;
}

export interface DefinitionVersion {
  versionId: string;
  versionNumber: number;
  publishedAt: string;
  publishedBy: string;
  changelog: string;
  modules: ModuleDefinition[];
  questions: QuestionDefinition[];
  rules: RuleDefinition[];
}

export interface AnswerHistoryItem {
  value: unknown;
  comment?: string;
  naReason?: string;
  unknownOwner?: string;
  unknownNote?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AnswerEntry {
  questionId: string;
  value: unknown;
  state: 'active' | 'inactive';
  comment?: string;
  naReason?: string;
  unknownOwner?: string;
  unknownNote?: string;
  updatedBy: string;
  updatedAt: string;
  history: AnswerHistoryItem[];
}

export interface RowValidationIssue {
  field: string;
  severity: 'warning' | 'error';
  message: string;
}

export interface ServerRow {
  id: string;
  hostname: string;
  role: string;
  os: string;
  environment: 'Production' | 'DR' | 'UAT' | 'Development';
  ip: string;
  location: string;
  issues?: RowValidationIssue[];
}

export interface FirewallRuleRow {
  id: string;
  source: string;
  destination: string;
  port: string;
  protocol: 'HTTPS' | 'TCP' | 'SSH' | 'SFTP' | 'TLS' | 'SMTP' | 'ICMP' | 'UDP' | 'Custom';
  direction: 'Inbound' | 'Outbound' | 'Bidirectional';
  purpose: string;
  environment: 'Production' | 'DR' | 'UAT' | 'Development';
  issues?: RowValidationIssue[];
}

export interface ApiEndpointRow {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'GraphQL' | 'gRPC';
  authType: 'OAuth2 / OIDC' | 'mTLS' | 'API Key' | 'JWT Bearer' | 'Basic Auth' | 'None (Public)';
  dataClassification: 'Public' | 'Internal' | 'Confidential' | 'Sensitive';
  exposure: 'Internal Only' | 'API Gateway (External)' | 'Direct Internet' | 'Partner VPN';
  issues?: RowValidationIssue[];
}

export interface IntegrationRow {
  id: string;
  counterparty: string;
  direction: 'Inbound' | 'Outbound' | 'Bidirectional';
  channel: 'REST API' | 'SFTP / File' | 'Kafka / Queue' | 'Webhook' | 'DB Link' | 'SOAP';
  frequency: 'Real-time' | 'Hourly Batch' | 'Daily Nightly' | 'Weekly' | 'On-Demand';
  dataShared: string;
  issues?: RowValidationIssue[];
}

export interface RepeaterTablesData {
  servers: ServerRow[];
  firewall_rules: FirewallRuleRow[];
  api_endpoints: ApiEndpointRow[];
  integrations: IntegrationRow[];
}

export interface AttachmentFile {
  id: string;
  slotId: string;
  filename: string;
  sanitizedName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  magicBytesStatus: 'verified' | 'mismatch_quarantined';
  scanStatus: 'clean' | 'quarantined' | 'scanning';
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface AttachmentSlotState {
  slotId: 'architecture_diagram' | 'data_flow_diagram' | 'api_sequence_diagram' | 'other_evidence';
  title: string;
  description: string;
  files: AttachmentFile[];
}

export interface RequestBasicsData {
  projectName: string;
  businessRequirement: string;
  architectureSummary: string;
  businessUnit: string;
  targetGoLiveDate: string;
  connectedAppIds: string[];
  customConnectedApps: string[];
  preliminaryDataTypes: string[];
  businessOwner: string;
  businessOwnerEmail: string;
  technicalOwner: string;
  technicalOwnerEmail: string;
  securityContact: string;
  ticketNo: string;
}

export interface ContradictionWarning {
  id: string;
  code: string;
  severity: 'warning' | 'critical';
  title: string;
  explanation: string;
  involvedQuestions: string[];
  moduleCode: ModuleCode;
}

export interface ContradictionOverride {
  warningId: string;
  acknowledgedBy: string;
  acknowledgedAt: string;
  justification: string;
}

export interface UnlockedModuleInfo {
  code: ModuleCode;
  title: string;
  shortTitle: string;
  estimatedMinutes: number;
  reasons: string[];
  visibleQuestionCount: number;
  requiredQuestionCount: number;
  isManuallyAdded?: boolean;
  isNarrowedOut?: boolean;
}

export interface DetectedCategory {
  id: string;
  label: string;
  isPrimary: boolean;
  reason: string;
  sourceQuestionIds: string[];
  isManualOverride?: boolean;
}

export interface OpenItemEntry {
  questionId: string;
  questionCode: string;
  questionText: string;
  moduleCode: ModuleCode;
  hardRequired: boolean;
  owner?: string;
  note?: string;
}

export interface EvaluationResult {
  facts: Record<string, string[]>;
  flags: Record<DerivedFlagId, boolean>;
  activeModules: UnlockedModuleInfo[];
  suppressedByNarrowing: ModuleCode[];
  overrideTriggersFired: string[];
  detectedCategories: DetectedCategory[];
  visibleQuestionIds: string[];
  requiredQuestionIds: string[];
  hardRequiredQuestionIds: string[];
  questionReasons: Record<string, string[]>;
  questionRequirementReasons: Record<string, string>;
  contradictions: ContradictionWarning[];
  openItems: OpenItemEntry[];
  missingRequiredQuestionIds: string[];
  estimatedMinutes: number;
  completionPercentage: number;
  minimalPathIndicator: boolean;
  evaluatedAt: string;
  versionId: string;
  v5Evaluation?: SarV5EvaluationSummary;
}

export type SarV5QuestionnaireId =
  | 'APPLICATION_BASE'
  | 'INTEGRATION'
  | 'DATA_MIGRATION'
  | 'API_SECURITY'
  | 'CLOUD_SECURITY'
  | 'FIREWALL_PORTS'
  | 'THREAT_ASSESSMENT';

export type SarV5QuestionnaireStatus = 'REQUIRED' | 'NOT REQUIRED' | 'PENDING' | 'CONFIRM';

export type SarV5RowState = 'ACTIVE' | 'GREYED';

export type SarV5FlagName =
  | 'PublicFacing'
  | 'SensitiveData'
  | 'DataMigration'
  | 'ThirdPartyAccess'
  | 'Portal'
  | 'FileTransfer';

export interface SarV5QuestionnaireStatusEntry {
  questionnaireId: SarV5QuestionnaireId;
  questionnaireName: string;
  tier: 'Primary' | 'Secondary' | 'ISG-Only';
  status: SarV5QuestionnaireStatus;
  triggeringReferenceIds: string[];
  evaluatedCondition: string;
  explanation: string;
  sourceRule: string;
  activeRowCount: number;
  greyedRowCount: number;
  totalRowCount: number;
}

export interface SarV5FlagStatusEntry {
  flag: SarV5FlagName | 'PatternStarted';
  value: boolean;
  triggeringReferenceIds: string[];
  evaluatedFormula: string;
  explanation: string;
}

export interface SarV5ConditionalRowEntry {
  questionId: string;
  aliasId?: string;
  questionnaireId: SarV5QuestionnaireId;
  questionnaireName: string;
  questionText: string;
  unlockingFlag: SarV5FlagName;
  flagValue: boolean;
  patternStarted: boolean;
  questionnaireStatus: SarV5QuestionnaireStatus;
  rowState: SarV5RowState;
  triggeringReferenceIds: string[];
  explanation: string;
}

export interface SarV5CloudServiceResult {
  selectorId: string;
  serviceName: string;
  familyCode: string;
  selected: 'Yes' | 'No' | 'Blank';
  applicability: 'Applicable' | 'N/A';
  questionIds: string[];
  explanation: string;
}

export interface SarV5ThreatControlEvaluation {
  controlId: string;
  controlName: string;
  requirement: string;
  stridePattern: string;
  mappingTags: string[];
  applicable: boolean;
  matchedTags: string[];
  triggeringReferenceIds: string[];
  reviewerResponse: 'Yes' | 'No' | 'N/A';
  complianceStatus: 'Compliant' | 'Non-compliant' | 'Pending review' | 'Not Applicable';
  evidenceComments?: string;
}

export interface SarV5ComplianceSummary {
  applicableControls: number;
  compliantControls: number;
  nonCompliantControls: number;
  pendingReviewControls: number;
  complianceRate: number | 'N/A';
}

export interface SarV5EvaluationSummary {
  preliminarySummary: {
    q1Objective: string;
    answeredYesIds: string[];
    answeredNoIds: string[];
    unansweredRoutingIds: string[];
    startedThreatPatterns: string[];
  };
  questionnaires: Record<SarV5QuestionnaireId, SarV5QuestionnaireStatusEntry>;
  flags: Record<SarV5FlagName | 'PatternStarted', SarV5FlagStatusEntry>;
  conditionalRows: SarV5ConditionalRowEntry[];
  cloudSecurity: {
    questionnaireStatus: SarV5QuestionnaireStatus;
    baselineApplicable: boolean;
    baselineQuestionCount: number;
    services: SarV5CloudServiceResult[];
    totalApplicableCloudQuestions: number;
  };
  threatAssessment: {
    status: SarV5QuestionnaireStatus;
    patternStarted: boolean;
    startedPatterns: string[];
    controls: SarV5ThreatControlEvaluation[];
    compliance: SarV5ComplianceSummary;
  };
}

export interface SectionDelegation {
  moduleCode: ModuleCode;
  assigneeName: string;
  assigneeEmail: string;
  assignedBy: string;
  assignedAt: string;
  note?: string;
  status: 'pending' | 'completed';
}

export interface ReportSnapshot {
  id: string;
  revisionNo: number;
  generatedAt: string;
  generatedBy: string;
  sha256: string;
  versionId: string;
  summaryText: string;
}

export interface RevisionSnapshot {
  revisionNo: number;
  submittedAt: string;
  submittedBy: string;
  sha256: string;
  basics: RequestBasicsData;
  answers: Record<string, AnswerEntry>;
  tables: RepeaterTablesData;
  activeModuleCodes: ModuleCode[];
}

export interface SarAiStageHighlight {
  stageOrModule: string;
  summary: string;
}

export interface SarAiObservation {
  domain: string;
  citedCodes: string[];
  severity: 'Info' | 'Low' | 'Medium' | 'High' | 'Critical';
  observation: string;
  recommendation: string;
}

export interface SarAiSummaryResult {
  generatedAt: string;
  model: string;
  executiveSummary: string;
  changeScopeAndArchitecture: string;
  overallRiskPosture: 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Critical';
  stageHighlights: SarAiStageHighlight[];
  keySecurityObservations: SarAiObservation[];
  recommendedReviewerFocus: string[];
  tokenMetrics: {
    compactPayloadChars: number;
    estimatedCompactTokens: number;
    fullStaticBaselineChars: number;
    tokenSavingsPercent: number;
  };
}

export interface SARRecord {
  id: string;
  displayId: string;
  status: 'draft' | 'submitted' | 'archived';
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  createdBy: string;
  updatedBy: string;
  pinnedVersionId: string;
  revisionNo: number;
  sectionRevisions: Record<string, number>;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  submittedBy?: string;
  submissionSha256?: string;
  lastActiveScreen: string;
  lastActiveStage: number;
  lastActiveModule: ModuleCode;
  basics: RequestBasicsData;
  answers: Record<string, AnswerEntry>;
  tables: RepeaterTablesData;
  attachments: AttachmentSlotState[];
  manualCategories: { added: string[]; removed: string[]; fullReviewRequested: boolean; reason?: string };
  contradictionOverrides: Record<string, ContradictionOverride>;
  delegations: Record<string, SectionDelegation>;
  evaluation?: EvaluationResult;
  aiSummary?: SarAiSummaryResult;
  reports: ReportSnapshot[];
  revisionHistory: RevisionSnapshot[];
  changeSummaryBanner?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action:
    | 'SAR_CREATED'
    | 'SAR_UPDATED'
    | 'SAR_SUBMITTED'
    | 'SAR_REOPENED_REVISION'
    | 'SAR_EXPORTED_PDF'
    | 'SAR_EXPORTED_EXCEL'
    | 'SAR_AI_SUMMARY_GENERATED'
    | 'SAR_DUPLICATED'
    | 'ATTACHMENT_UPLOADED'
    | 'CONTRADICTION_OVERRIDDEN'
    | 'SECTION_DELEGATED'
    | 'RULES_PUBLISHED'
    | 'VERSION_UPGRADED'
    | 'ROLE_SWITCHED';
  sarId?: string;
  sarDisplayId?: string;
  summary: string;
  prevHash: string;
  eventHash: string;
}

export interface ScenarioTestCase {
  id: string;
  name: string;
  category: 'Base Intent' | 'Multi-Pattern' | 'Hybrid Hosting' | 'Enhancement Narrowing' | 'Override Trigger' | 'Historical Backtest';
  description: string;
  answers: Record<string, unknown>;
  expectedModules: ModuleCode[];
  expectedFlags: Partial<Record<DerivedFlagId, boolean>>;
  mustNotIncludeModules?: ModuleCode[];
  expectedVisibleQuestions?: string[];
  expectedHiddenQuestions?: string[];
}

// ============================================================================
// FUTURISTIC SAR PATTERN LEARNING, TAGGING & PREDICTIVE INTELLIGENCE TYPES
// ============================================================================

export type PatternTagCategory =
  | 'ARCHETYPE'
  | 'TOPOLOGY'
  | 'TECH'
  | 'DATA'
  | 'IDENTITY'
  | 'CHANNEL'
  | 'CONTROL'
  | 'COMPLIANCE'
  | 'MODULE'
  | 'FLAG';

export interface CanonicalPatternTag {
  tag: string; // e.g. "TECH:AWS_EKS", "DATA:PCI_PAN", "CONTROL:MTLS_OAUTH2"
  category: PatternTagCategory;
  label: string;
  sourceCodes: string[]; // e.g. ["P5", "M11_Q3"]
}

export interface SARPatternGenome {
  idempotencyKey: string; // "${displayId}::rev${revisionNo}::${submissionSha256}"
  displayId: string;
  revisionNo: number;
  submittedAt: string;
  businessUnit: string;
  genomeHash: string; // 16-char deterministic hex structural fingerprint
  archetypeId: string;
  archetypeLabel: string;
  moduleBitmask: number; // 32-bit bitmask of unlocked modules M0..M17
  flagBitmask: number; // 32-bit bitmask of active derived flags
  v5ControlBitmask: number; // 32-bit bitmask of applicable TA-CTRL-01..TA-CTRL-16
  tags: string[]; // Sorted canonical tag strings
  tagDetails: CanonicalPatternTag[];
  questionResponses: Record<string, string[]>; // Normalized questionCode -> optionIds
  riskScore: number; // 0..100 deterministic structural risk index
}

export interface LearnedTagStat {
  tag: string;
  category: PatternTagCategory;
  label: string;
  count: number;
  supportPct: number; // Percentage of submitted SARs containing this tag (0..100)
}

export interface PatternCoOccurrenceEdge {
  antecedentTag: string;
  consequentTag: string;
  coOccurrenceCount: number;
  confidencePct: number; // P(consequent | antecedent) * 100
  lift: number; // P(A,B) / (P(A) * P(B))
  insight: string;
}

export interface ArchetypeClusterSummary {
  archetypeId: string;
  archetypeLabel: string;
  submittedCount: number;
  sharePct: number;
  dominantTags: string[];
  typicalModules: ModuleCode[];
  averageRiskScore: number;
}

export interface PredictedControlPattern {
  questionCode: string;
  questionTopic: string;
  predictedOptionId: string;
  predictedOptionLabel: string;
  confidencePct: number;
  supportingTagPair: string;
  currentRequestValue?: string;
  status: 'aligned' | 'deviation' | 'predicted_for_unanswered';
  rationale: string;
}

export interface PatternAnomalyFinding {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggeringTags: string[];
  expectedPattern: string;
  observedPattern: string;
  historicalSupportPct: number;
  recommendation: string;
}

export interface SimilarSubmittedSarMatch {
  displayId: string;
  revisionNo: number;
  businessUnit: string;
  archetypeLabel: string;
  genomeHash: string;
  similarityPct: number;
  sharedKeyTags: string[];
  submittedAt: string;
}

export interface SarAiPatternReasoningResult {
  generatedAt: string;
  model: string;
  archetypeDiagnosis: string;
  coOccurrenceSynthesis: string;
  predictiveControlRecommendations: string[];
  anomalyRiskAssessment: string;
  confidenceScore: number;
}

export interface PatternAnalysisResult {
  genome: SARPatternGenome;
  matchedArchetype: {
    archetypeId: string;
    archetypeLabel: string;
    confidencePct: number;
    historicalCount: number;
  };
  nearestNeighbors: SimilarSubmittedSarMatch[];
  predictedControls: PredictedControlPattern[];
  anomalies: PatternAnomalyFinding[];
  topCoOccurrences: PatternCoOccurrenceEdge[];
  corpusAlignmentScore: number; // 0..100 alignment with approved submitted SAR patterns
  evaluatedInMs: number;
  aiPatternReasoning?: SarAiPatternReasoningResult;
}

export interface PatternCorpusSnapshot {
  engineVersion: string;
  totalSubmittedLearned: number;
  rejectedNonSubmittedCount: number;
  deduplicatedCount: number;
  maxCapacity: number;
  lastLearnedAt: string;
  archetypeClusters: ArchetypeClusterSummary[];
  topTags: LearnedTagStat[];
  strongestCoOccurrences: PatternCoOccurrenceEdge[];
  questionConsensus: Record<
    string,
    { topOptionId: string; topOptionLabel: string; consensusPct: number; totalResponses: number }
  >;
}

export interface PatternBacktestResult {
  passed: boolean;
  executedAt: string;
  totalDurationMs: number;
  gates: Array<{
    gateId: string;
    name: string;
    passed: boolean;
    metrics: string;
    detail: string;
  }>;
  concurrencyBenchmark: {
    simulatedConcurrentUsers: number;
    totalOperations: number;
    totalElapsedMs: number;
    avgLatencyMs: number;
    p99LatencyMs: number;
    throughputOpsPerSec: number;
    memoryDeltaKb: number;
  };
}

