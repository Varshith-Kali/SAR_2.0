import { CMDB_APPLICATIONS, DEFAULT_DEFINITION_VERSION } from './definitions';
import { redactSensitivePatterns } from './rulesEngine';
import { DefinitionVersion, QuestionDefinition, SARRecord } from './types';

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
  const vals = Array.isArray(rawVal) ? rawVal.map(String) : [String(rawVal)];
  if (q.options && q.options.length > 0) {
    return vals
      .map((v) => {
        const match = q.options?.find((o) => o.id === v);
        return match ? match.label : v;
      })
      .join(' | ');
  }
  return vals.join(' | ');
}

export function formatAvailableOptionsForDisplay(q: QuestionDefinition): string {
  if (q.answerType === 'long_text') {
    return 'Free-Text Input';
  }
  if (!q.options || q.options.length === 0) {
    return 'Free-Text Input';
  }
  return q.options
    .map((opt, idx) => `${idx + 1}. ${opt.label}`)
    .join(' | ');
}

export function formatQuestionTypeLabel(q: QuestionDefinition): string {
  switch (q.answerType) {
    case 'single_select':
      return 'Single-Select Option';
    case 'multi_select':
      return 'Multi-Select Options';
    case 'long_text':
      return 'Free-Text Input';
    default:
      return 'Structured Input';
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

export function buildTwoSheetWorkbookData(
  sar: SARRecord,
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): TwoSheetWorkbookPreviewData {
  const evalRes = sar.evaluation;
  const dateGenerated = new Date().toISOString().slice(0, 10);

  const connectedApps = sar.basics.connectedAppIds
    .map((id) => CMDB_APP_BY_ID.get(id) || id)
    .concat(sar.basics.customConnectedApps);

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
      field: 'Project / Initiative Name',
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
      category: 'Project Context',
      field: 'Connected CMDB Applications',
      value: connectedApps.join(' | '),
    },
    {
      category: 'Project Context',
      field: 'Preliminary Data Classifications',
      value: sar.basics.preliminaryDataTypes.join(' | '),
    },
    {
      category: 'Architecture Scope',
      field: 'Business Requirement & Scope',
      value: sar.basics.businessRequirement || '',
    },
  ];

  // Only include metadata fields that have a non-empty requester value
  const metadataRows = rawMetadataRows.filter((row) => row.value.trim().length > 0);

  const visibleIdSet = evalRes?.visibleQuestionIds
    ? new Set(evalRes.visibleQuestionIds)
    : null;
  const modTitleByCode = new Map(definition.modules.map((m) => [m.code, m.title]));

  // Sheet 1: Preliminary Questions (P1 to P30) — ONLY requester-responded visible questions
  const prelimQs = definition.questions.filter((q) => q.stage !== undefined);
  const preliminaryRows: PreliminaryExcelRow[] = prelimQs
    .filter((q) => {
      const isVisible = visibleIdSet ? visibleIdSet.has(q.id) : true;
      const ans = sar.answers[q.id];
      return isVisible && hasRequesterResponse(ans?.value);
    })
    .map((q) => {
      const ans = sar.answers[q.id];
      const commentSuffix =
        ans?.comment && ans.comment.trim() ? ` (Comment: ${ans.comment.trim()})` : '';
      const typeLabel = formatQuestionTypeLabel(q);
      return {
        stageNumber: q.stage || 1,
        stageLabel: `Stage ${q.stage}: ${q.stageTitle}`,
        code: q.code,
        questionText: q.text,
        answerTypeLabel: typeLabel,
        inputFormat: typeLabel,
        availableOptions: formatAvailableOptionsForDisplay(q),
        selectedResponse: `${formatAnswerForDisplay(q, ans?.value)}${commentSuffix}`,
        dateGenerated,
      };
    });

  // Sheet 2: Detailed Security Questionnaire (M1 to M16) — ONLY requester-responded visible questions
  const detailedQs = definition.questions.filter((q) => q.stage === undefined);
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
      const extraNote = ans?.naReason
        ? ` (N/A Justification: ${ans.naReason})`
        : ans?.unknownNote
        ? ` (Note: ${ans.unknownNote})`
        : '';
      const commentSuffix =
        ans?.comment && ans.comment.trim() && q.answerType !== 'long_text'
          ? ` (Notes: ${ans.comment.trim()})`
          : '';

      return {
        moduleCode: q.moduleId,
        moduleTitle: modTitleByCode.get(q.moduleId) || q.moduleId,
        code: q.code,
        questionText: q.text,
        inputFormat: formatQuestionTypeLabel(q),
        availableOptions: formatAvailableOptionsForDisplay(q),
        selectedResponse: `${formatAnswerForDisplay(q, rawVal)}${extraNote}${commentSuffix}`,
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
    const wrapLimit = c.mergeAcross && c.mergeAcross >= 2 ? 95 : 58;
    for (const line of explicitLines) {
      totalWrappedLines += Math.max(1, Math.ceil(line.length / wrapLimit));
    }
    if (totalWrappedLines > maxLines) {
      maxLines = totalWrappedLines;
    }
  }
  return Math.min(180, Math.max(22, maxLines * 15 + 7));
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
 * Generates a clean, simple, properly formatted 2-Sheet Excel Workbook (.xls SpreadsheetML):
 *  - Sheet 1: Preliminary Checklist (Project Details & Preliminary Responses)
 *  - Sheet 2: Security Checklist (Detailed Section Responses, Firewall Rules, Integrations & Attachments)
 * Both sheets use a consistent 5-column grid with automatic text wrapping and row height calculation.
 */
export function generateExcelWorkbookXML(
  sar: SARRecord,
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): string {
  const data = buildTwoSheetWorkbookData(sar, definition);

  // ==========================================================================
  // SHEET 1: Preliminary Checklist (Clean 5-Column Layout)
  // ==========================================================================
  const sheet1Rows: string[] = [
    makeStyledXmlRow(
      [
        {
          value: `SAR ASSIST — SHEET 1: PRELIMINARY CHECKLIST · ${sar.displayId} · Date: ${data.dateGenerated}`,
          styleId: 'TitleBanner',
          mergeAcross: 4,
        },
      ],
      30
    ),
    makeStyledXmlRow(
      [
        {
          value: 'SECTION 1A: PROJECT & REQUEST DETAILS',
          styleId: 'SectionBanner',
          mergeAcross: 4,
        },
      ],
      24
    ),
    makeStyledXmlRow(
      [
        { value: 'Category', styleId: 'Header' },
        { value: 'Field', styleId: 'Header' },
        { value: 'Project Details / Recorded Value', styleId: 'Header', mergeAcross: 2 },
      ],
      24
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
                value: `SECTION 1B: AI ARCHITECTURE REVIEW SUMMARY — TAGGED TO "${
                  sar.aiSummary.projectName || sar.basics.projectName || sar.displayId
                }" (${sar.aiSummary.overallRiskPosture.toUpperCase()})`,
                styleId: 'SectionBanner',
                mergeAcross: 4,
              },
            ],
            24
          ),
          makeStyledXmlRow([
            { value: 'Tagged Project / Request Name', styleId: 'SubHeader' },
            { value: sar.displayId, styleId: 'CodeCell' },
            {
              value: `${sar.aiSummary.projectName || sar.basics.projectName || sar.displayId} (${
                sar.aiSummary.businessUnit || sar.basics.businessUnit || 'Enterprise Banking'
              })`,
              styleId: 'AnswerCell',
              mergeAcross: 2,
            },
          ]),
          makeStyledXmlRow([
            { value: 'Executive Summary (What This Review Is About)', styleId: 'SubHeader' },
            { value: 'Overview', styleId: 'CodeCell' },
            { value: sar.aiSummary.executiveSummary, styleId: 'AnswerCell', mergeAcross: 2 },
          ]),
          makeStyledXmlRow([
            { value: 'Change Scope & Architecture', styleId: 'SubHeader' },
            { value: 'Scope', styleId: 'CodeCell' },
            {
              value: sar.aiSummary.changeScopeAndArchitecture,
              styleId: 'Body',
              mergeAcross: 2,
            },
          ]),
          ...(sar.aiSummary.stageHighlights.length > 0
            ? [
                makeStyledXmlRow([
                  { value: 'Checklist Scope & Major Control Points', styleId: 'SubHeader' },
                  { value: 'Highlights', styleId: 'CodeCell' },
                  {
                    value: sar.aiSummary.stageHighlights
                      .map(
                        (h) =>
                          `${h.stageTitle}: ${h.summary}${
                            h.keySelections && h.keySelections.length > 0
                              ? ` [${h.keySelections.join('; ')}]`
                              : ''
                          }`
                      )
                      .join(' | '),
                    styleId: 'Body',
                    mergeAcross: 2,
                  },
                ]),
              ]
            : []),
          ...(sar.aiSummary.recommendedReviewerFocus.length > 0
            ? [
                makeStyledXmlRow([
                  { value: 'Priority Reviewer Focus', styleId: 'SubHeader' },
                  { value: 'Sign-Off Focus', styleId: 'CodeCell' },
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
          value: `SECTION 1C: PRELIMINARY CHECKLIST RESPONSES (${data.preliminaryRows.length} ANSWERED)`,
          styleId: 'SectionBanner',
          mergeAcross: 4,
        },
      ],
      24
    ),
    makeStyledXmlRow(
      [
        { value: 'Stage & Category', styleId: 'Header' },
        { value: 'Code', styleId: 'Header' },
        { value: 'Preliminary Question', styleId: 'Header' },
        { value: 'Recorded Response', styleId: 'Header' },
        { value: 'Input Type', styleId: 'Header' },
      ],
      25
    ),
    ...data.preliminaryRows.map((r, idx) => {
      const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
      return makeStyledXmlRow([
        { value: r.stageLabel, styleId: baseStyle },
        { value: r.code, styleId: 'CodeCell' },
        { value: r.questionText, styleId: baseStyle },
        { value: r.selectedResponse, styleId: 'AnswerCell' },
        { value: r.answerTypeLabel, styleId: baseStyle },
      ]);
    }),
  ];

  // ==========================================================================
  // SHEET 2: Detailed Security Checklist (Clean 5-Column Layout)
  // ==========================================================================
  const sheet2Rows: string[] = [
    makeStyledXmlRow(
      [
        {
          value: `SAR ASSIST — SHEET 2: DETAILED SECURITY CHECKLIST · ${sar.displayId} · Date: ${data.dateGenerated}`,
          styleId: 'TitleBanner',
          mergeAcross: 4,
        },
      ],
      30
    ),
    makeStyledXmlRow(
      [
        {
          value: `SECTION 2A: DETAILED SECURITY CHECKLIST RESPONSES (${data.securityQuestionnaireRows.length} ANSWERED)`,
          styleId: 'SectionBanner',
          mergeAcross: 4,
        },
      ],
      24
    ),
    makeStyledXmlRow(
      [
        { value: 'Checklist Section', styleId: 'Header' },
        { value: 'Code', styleId: 'Header' },
        { value: 'Security Question', styleId: 'Header' },
        { value: 'Recorded Response', styleId: 'Header' },
        { value: 'Input Format', styleId: 'Header' },
      ],
      25
    ),
    ...data.securityQuestionnaireRows.map((r, idx) => {
      const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
      const inputFormat =
        r.availableOptions === 'Free-Text Input' ? 'Free-Text Input' : 'Selected Option(s)';
      return makeStyledXmlRow([
        { value: `${r.moduleCode} — ${r.moduleTitle}`, styleId: baseStyle },
        { value: r.code, styleId: 'CodeCell' },
        { value: r.questionText, styleId: baseStyle },
        { value: r.selectedResponse, styleId: 'AnswerCell' },
        { value: inputFormat, styleId: baseStyle },
      ]);
    }),
  ];

  // Section 2B: Firewall Port Rules (Aligned to 5 columns)
  if (sar.tables.firewall_rules.length > 0) {
    sheet2Rows.push(
      makeStyledXmlRow([{ value: '', styleId: 'Body', mergeAcross: 4 }], 10),
      makeStyledXmlRow(
        [
          {
            value: `SECTION 2B: NETWORK & FIREWALL PORT RULES (${sar.tables.firewall_rules.length} ROWS)`,
            styleId: 'SectionBanner',
            mergeAcross: 4,
          },
        ],
        24
      ),
      makeStyledXmlRow(
        [
          { value: 'Environment & Direction', styleId: 'Header' },
          { value: 'Port / Protocol', styleId: 'Header' },
          { value: 'Source IP -> Destination IP', styleId: 'Header' },
          { value: 'Business Purpose', styleId: 'Header' },
          { value: 'Date Recorded', styleId: 'Header' },
        ],
        24
      ),
      ...sar.tables.firewall_rules.map((f, idx) => {
        const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
        return makeStyledXmlRow([
          { value: `${f.environment} (${f.direction})`, styleId: baseStyle },
          { value: `${f.port} / ${f.protocol}`, styleId: 'CodeCell' },
          { value: `${f.source}  ->  ${f.destination}`, styleId: 'CodeCell' },
          { value: f.purpose, styleId: baseStyle },
          { value: data.dateGenerated, styleId: baseStyle },
        ]);
      })
    );
  }

  // Section 2C: API Endpoints & System Integrations (Aligned to 5 columns)
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
        24
      ),
      makeStyledXmlRow(
        [
          { value: 'Type & Method / Direction', styleId: 'Header' },
          { value: 'Auth / Channel', styleId: 'Header' },
          { value: 'Endpoint Path / Connected System', styleId: 'Header' },
          { value: 'Exposure / Data Shared', styleId: 'Header' },
          { value: 'Classification / Frequency', styleId: 'Header' },
        ],
        24
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
          { value: `Integration (${i.direction})`, styleId: baseStyle },
          { value: i.channel, styleId: 'CodeCell' },
          { value: i.counterparty, styleId: baseStyle },
          { value: i.dataShared, styleId: baseStyle },
          { value: i.frequency, styleId: baseStyle },
        ]);
      })
    );
  }

  const uploadedAttachments = sar.attachments.flatMap((slot) =>
    slot.files.map((f) => ({ slotTitle: slot.title, file: f }))
  );

  // Section 2D: Uploaded Supporting Documents (Aligned to 5 columns)
  if (uploadedAttachments.length > 0) {
    sheet2Rows.push(
      makeStyledXmlRow([{ value: '', styleId: 'Body', mergeAcross: 4 }], 10),
      makeStyledXmlRow(
        [
          {
            value: 'SECTION 2D: UPLOADED ARCHITECTURE DIAGRAMS & SUPPORTING DOCUMENTS',
            styleId: 'SectionBanner',
            mergeAcross: 4,
          },
        ],
        24
      ),
      makeStyledXmlRow(
        [
          { value: 'Document Category', styleId: 'Header' },
          { value: 'Version', styleId: 'Header' },
          { value: 'File Name', styleId: 'Header' },
          { value: 'SHA-256 Checksum', styleId: 'Header' },
          { value: 'Verification Status', styleId: 'Header' },
        ],
        24
      ),
      ...uploadedAttachments.map((item, idx) => {
        const baseStyle: CellStyleId = idx % 2 === 0 ? 'Body' : 'BodyAlt';
        return makeStyledXmlRow([
          { value: item.slotTitle, styleId: baseStyle },
          { value: `v${item.file.version}`, styleId: 'CodeCell' },
          { value: item.file.sanitizedName, styleId: 'AnswerCell' },
          { value: item.file.sha256, styleId: 'CodeCell' },
          { value: item.file.scanStatus === 'clean' ? 'Verified' : 'Quarantined', styleId: baseStyle },
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
   <Alignment ss:Vertical="Top" ss:Horizontal="Left" ss:WrapText="1"/>
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
   <Column ss:Width="175"/>
   <Column ss:Width="95"/>
   <Column ss:Width="310"/>
   <Column ss:Width="360"/>
   <Column ss:Width="135"/>
   ${sheet1Rows.join('\n   ')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup><Layout x:Orientation="Landscape"/></PageSetup>
  </WorksheetOptions>
 </Worksheet>
 <Worksheet ss:Name="2_Security_Checklist">
  <Table>
   <Column ss:Width="185"/>
   <Column ss:Width="85"/>
   <Column ss:Width="320"/>
   <Column ss:Width="380"/>
   <Column ss:Width="130"/>
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

  <h2>2. Sheet 1 — Preliminary Questions &amp; Options (${data.preliminaryRows.length} Requester Responses)</h2>
  <table>
    <thead>
      <tr><th style="width: 150px;">Stage</th><th style="width: 60px;">Code</th><th>Preliminary Question</th><th>Available Options</th><th style="width: 220px;">Requester Response</th><th style="width: 100px;">Date Generated</th></tr>
    </thead>
    <tbody>
      ${data.preliminaryRows
        .map(
          (r) =>
            `<tr><td>${escapeHtml(r.stageLabel)}</td><td class="mono">${escapeHtml(r.code)}</td><td>${escapeHtml(
              r.questionText
            )}</td><td style="font-size: 11px; color: #475569;">${escapeHtml(
              r.availableOptions
            )}</td><td><strong>${escapeHtml(r.selectedResponse)}</strong></td><td class="mono">${escapeHtml(
              r.dateGenerated
            )}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>3. Sheet 2 — Security Checklist (${data.securityQuestionnaireRows.length} Requester Responses)</h2>
  <table>
    <thead>
      <tr><th style="width: 70px;">Section</th><th style="width: 150px;">Security Domain</th><th style="width: 65px;">Control</th><th>Security Control / Requirement</th><th>Available Options / Format</th><th style="width: 230px;">Requester Response</th><th style="width: 100px;">Date Generated</th></tr>
    </thead>
    <tbody>
      ${data.securityQuestionnaireRows
        .map(
          (r) =>
            `<tr><td class="mono">${escapeHtml(r.moduleCode)}</td><td>${escapeHtml(
              r.moduleTitle
            )}</td><td class="mono">${escapeHtml(r.code)}</td><td>${escapeHtml(
              r.questionText
            )}</td><td style="font-size: 11px; color: #475569;">${escapeHtml(
              r.availableOptions
            )}</td><td><strong>${escapeHtml(r.selectedResponse)}</strong></td><td class="mono">${escapeHtml(
              r.dateGenerated
            )}</td></tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer mono">
    <div>SAR ASSIST — SECURITY ARCHITECTURE REVIEW RECORD</div>
    <div>Date Generated: ${escapeHtml(data.dateGenerated)}</div>
  </div>
</body>
</html>`;
}


