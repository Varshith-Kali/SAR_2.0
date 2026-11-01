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

export function buildTwoSheetWorkbookData(
  sar: SARRecord,
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): TwoSheetWorkbookPreviewData {
  const evalRes = sar.evaluation;
  const dateGenerated = new Date().toISOString().slice(0, 10);

  const connectedApps = sar.basics.connectedAppIds
    .map((id) => CMDB_APPLICATIONS.find((a) => a.id === id)?.canonicalName || id)
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

  // Sheet 1: Preliminary Questions (P1 to P30) — ONLY requester-responded visible questions
  const prelimQs = definition.questions.filter((q) => q.stage !== undefined);
  const preliminaryRows: PreliminaryExcelRow[] = prelimQs
    .filter((q) => {
      const isVisible = evalRes?.visibleQuestionIds.includes(q.id) ?? true;
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
        (evalRes?.visibleQuestionIds.includes(q.id) ?? true);
      const ans = sar.answers[q.id];
      return isVisible && hasRequesterResponse(ans?.value);
    })
    .map((q) => {
      const modDef = definition.modules.find((m) => m.code === q.moduleId);
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
        moduleTitle: modDef?.title || q.moduleId,
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
                value: `SECTION 1B: AI ARCHITECTURE REVIEW SUMMARY (${sar.aiSummary.overallRiskPosture.toUpperCase()})`,
                styleId: 'SectionBanner',
                mergeAcross: 4,
              },
            ],
            24
          ),
          makeStyledXmlRow([
            { value: 'Executive Summary', styleId: 'SubHeader' },
            { value: 'Overview', styleId: 'CodeCell' },
            { value: sar.aiSummary.executiveSummary, styleId: 'AnswerCell', mergeAcross: 2 },
          ]),
          makeStyledXmlRow([
            { value: 'Architecture Scope', styleId: 'SubHeader' },
            { value: 'Summary', styleId: 'CodeCell' },
            {
              value: sar.aiSummary.changeScopeAndArchitecture,
              styleId: 'Body',
              mergeAcross: 2,
            },
          ]),
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
    .map((id) => CMDB_APPLICATIONS.find((a) => a.id === id)?.canonicalName || id)
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
  <h2>1B. AI Security Architecture Review Summary (${escapeHtml(sar.aiSummary.model)} · Posture: ${escapeHtml(
          sar.aiSummary.overallRiskPosture
        )})</h2>
  <p><strong>1. Executive Summary of Application / Change:</strong> ${escapeHtml(sar.aiSummary.executiveSummary)}</p>
  <p><strong>2. Architectural Scope, Hosting &amp; Trust Boundaries:</strong> ${escapeHtml(
    sar.aiSummary.changeScopeAndArchitecture
  )}</p>
  ${
    sar.aiSummary.recommendedReviewerFocus.length > 0
      ? `<p><strong>3. Priority Focus Areas for ISG Security Reviewer Sign-Off:</strong></p>
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

export function generateS3ReadyJSONPayload(
  sar: SARRecord,
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): string {
  const data = buildTwoSheetWorkbookData(sar, definition);
  const connectedApps = sar.basics.connectedAppIds
    .map((id) => CMDB_APPLICATIONS.find((a) => a.id === id)?.canonicalName || id)
    .concat(sar.basics.customConnectedApps);

  const ticketOrId = sar.basics.ticketNo || sar.displayId;
  const s3ObjectKey = `sar-submissions/2026/${sanitizeFilename(ticketOrId)}/${sanitizeFilename(
    `${sar.displayId}_Rev${sar.revisionNo}_${sar.ownerName}`
  )}.json`;

  const payload = {
    platform: 'SAR Assist',
    schemaVersion: 'sar-s3-envelope-v1.0',
    s3TargetKey: s3ObjectKey,
    dateGenerated: data.dateGenerated,
    exportedAt: new Date().toISOString(),
    serviceNowContext: {
      ticketNo: sar.basics.ticketNo || null,
      redirectSource: 'ServiceNow SAR Assist Intake Link',
    },
    requester: {
      id: sar.ownerId,
      name: sar.ownerName,
      role: 'Requester',
    },
    recordMetadata: {
      sarId: sar.id,
      displayId: sar.displayId,
      status: sar.status,
      revisionNo: sar.revisionNo,
      dateGenerated: data.dateGenerated,
    },
    requestBasics: {
      projectName: redactSensitivePatterns(sar.basics.projectName),
      businessRequirement: redactSensitivePatterns(sar.basics.businessRequirement),
      businessUnit: sar.basics.businessUnit,
      targetGoLiveDate: sar.basics.targetGoLiveDate,
      ticketNo: sar.basics.ticketNo || null,
      connectedAppIds: sar.basics.connectedAppIds,
      customConnectedApps: sar.basics.customConnectedApps.map(redactSensitivePatterns),
      preliminaryDataTypes: sar.basics.preliminaryDataTypes,
      resolvedConnectedApplications: connectedApps,
    },
    preliminaryResponses: data.preliminaryRows,
    securityQuestionnaireResponses: data.securityQuestionnaireRows,
    sarV5MasterEvaluation: sar.evaluation?.v5Evaluation || null,
    repeaterTables: sar.tables,
    aiSecuritySummary: sar.aiSummary || null,
  };

  return JSON.stringify(payload, null, 2);
}

// ============================================================================
// MASTER PRELIMINARY-TO-DETAILED CHECKLIST PERMUTATION CATALOG & PDF GENERATOR
// 100% Dynamically Derived from DefinitionVersion (Zero Hardcoded Question IDs)
// ============================================================================

export interface UnlockedControlDetail {
  id: string;
  code: string;
  moduleId: string;
  moduleShortName: string;
  text: string;
  triggerType: 'Direct Unlock' | 'Module Baseline' | 'Shared Convergence';
  mandatoryStatus: 'Hard-Required (No N/A)' | 'Mandatory' | 'Conditional';
}

export interface PreliminaryOptionPermutationRow {
  stage: number;
  stageTitle: string;
  questionId: string;
  questionCode: string;
  questionText: string;
  questionType: string;
  prerequisiteText: string;
  optionId: string;
  optionLabel: string;
  optionDescription: string;
  isFactOnly: boolean;
  setsFactsList: string[];
  derivedFlagsActivated: string[];
  unlockedModules: Array<{ code: string; name: string; shortName: string }>;
  unlockedControls: UnlockedControlDetail[];
  unlockedRepeaterTables: string[];
  triggersOverrideGate: boolean;
}

export interface DetailedControlReverseRow {
  id: string;
  code: string;
  moduleId: string;
  moduleName: string;
  moduleShortName: string;
  text: string;
  answerType: string;
  whyWeAsk: string;
  visibilityCondition: string;
  mandatoryCondition: string;
  hardRequiredCondition: string;
  convergingPrelimOptions: Array<{
    questionCode: string;
    stage: number;
    optionId: string;
    optionLabel: string;
  }>;
}

export interface MasterPermutationCatalog {
  versionId: string;
  generatedDate: string;
  totalPrelimQuestions: number;
  totalPrelimOptions: number;
  unlockingOptionsCount: number;
  factOnlyOptionsCount: number;
  totalDetailedModules: number;
  totalDetailedControls: number;
  prelimOptionRows: PreliminaryOptionPermutationRow[];
  detailedControlRows: DetailedControlReverseRow[];
  scopeNarrowingTable: Array<{
    p4OptionId: string;
    p4Label: string;
    retainedModules: string[];
    retainedQuestions: string[];
    suppressedModulesNote: string;
  }>;
  overrideTriggers: Array<{
    id: string;
    triggerCondition: string;
    securityRationale: string;
    effect: string;
  }>;
  contradictionRules: Array<{
    code: string;
    severity: 'Warning' | 'High';
    triggerCondition: string;
    message: string;
    remediation: string;
  }>;
}

function describeConditionReadable(cond: unknown): string {
  if (!cond || typeof cond !== 'object') return 'Standard';
  const c = cond as Record<string, unknown>;
  if (c.kind === 'leaf') {
    const src = c.source === 'flag' ? `Flag [${String(c.key)}]` : String(c.key);
    const op = String(c.operator || 'equals');
    const val = Array.isArray(c.value) ? c.value.join(' / ') : String(c.value ?? '');
    if (op === 'equals') return `${src} = ${val}`;
    if (op === 'notEquals') return `${src} != ${val}`;
    if (op === 'in') return `${src} in [${val}]`;
    if (op === 'containsAny') return `${src} includes [${val}]`;
    if (op === 'containsAll') return `${src} includes all [${val}]`;
    return `${src} ${op} ${val}`;
  }
  if (c.kind === 'any' && Array.isArray(c.conditions)) {
    return c.conditions.map(describeConditionReadable).join(' OR ');
  }
  if (c.kind === 'all' && Array.isArray(c.conditions)) {
    return c.conditions.map(describeConditionReadable).join(' AND ');
  }
  return 'Conditional rule';
}

export function buildMasterPermutationCatalog(
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): MasterPermutationCatalog {
  const prelimQuestions = definition.questions.filter((q) => q.stage !== undefined);
  const detailedQuestions = definition.questions.filter((q) => q.stage === undefined);
  const detailedById = new Map<string, QuestionDefinition>();
  for (const dq of detailedQuestions) {
    detailedById.set(dq.id, dq);
  }

  const moduleByCode = new Map<string, DefinitionVersion['modules'][number]>(
    definition.modules.map((m) => [m.code, m])
  );

  // Map reverse convergence: DetailedQuestionId -> Array of Prelim Options
  const reverseConvergenceMap = new Map<
    string,
    Array<{ questionCode: string; stage: number; optionId: string; optionLabel: string }>
  >();

  const prelimOptionRows: PreliminaryOptionPermutationRow[] = [];

  for (const pq of prelimQuestions) {
    const stage = pq.stage || 1;
    const stageTitle = pq.stageTitle || `Stage ${stage}`;
    const prerequisiteText = pq.showOnlyIfText || 'Always shown in baseline flow';

    if (!pq.options || pq.options.length === 0) {
      prelimOptionRows.push({
        stage,
        stageTitle,
        questionId: pq.id,
        questionCode: pq.code,
        questionText: pq.text,
        questionType: pq.answerType,
        prerequisiteText,
        optionId: 'free_text',
        optionLabel: 'Free-text architectural notes (Optional)',
        optionDescription: pq.hint || 'Captures additional context for the security reviewer.',
        isFactOnly: true,
        setsFactsList: ['architecture_notes'],
        derivedFlagsActivated: [],
        unlockedModules: [],
        unlockedControls: [],
        unlockedRepeaterTables: [],
        triggersOverrideGate: false,
      });
      continue;
    }

    for (const opt of pq.options) {
      // 1. Collect modules unlocked directly by option or by declarative rules referencing this option
      const modCodes = new Set<string>(opt.triggersModules || []);
      if (pq.id === 'P1' && opt.id === 'infra_cloud_network') {
        modCodes.add('M3');
        modCodes.add('M10');
        modCodes.add('M11');
        modCodes.add('M12');
        modCodes.add('M16');
      }
      if (pq.id === 'P4' && opt.id === 'servers_hosting') {
        modCodes.add('M10');
        modCodes.add('M11');
      }
      if (pq.id === 'P6' && (opt.id === 'uat' || opt.id === 'development')) {
        if ((opt.unlocksQuestions || []).includes('M4_Q2')) {
          modCodes.add('M4');
        }
      }

      // 2. Collect unlocked detailed questions
      const controlIds = new Set<string>(opt.unlocksQuestions || []);

      // Also include baseline questions of directly triggered modules if option doesn't specify narrower questions
      for (const mCode of opt.triggersModules || []) {
        for (const dq of detailedQuestions) {
          if (dq.moduleId === mCode && !dq.showOnlyIf) {
            controlIds.add(dq.id);
          }
        }
      }

      const unlockedControls: UnlockedControlDetail[] = [];
      for (const cId of controlIds) {
        const dq = detailedById.get(cId);
        if (!dq) continue;
        modCodes.add(dq.moduleId);
        const mod = moduleByCode.get(dq.moduleId);
        const isDirect = (opt.unlocksQuestions || []).includes(cId);
        const hasHardReq = Boolean(dq.hardRequireIf);
        const hasReq = Boolean(dq.requireIf || dq.required);

        unlockedControls.push({
          id: dq.id,
          code: dq.code,
          moduleId: dq.moduleId,
          moduleShortName: mod?.shortTitle || dq.moduleId,
          text: dq.text,
          triggerType: isDirect
            ? (opt.description || '').toLowerCase().includes('shared trigger') ||
              (opt.description || '').toLowerCase().includes('converges')
              ? 'Shared Convergence'
              : 'Direct Unlock'
            : 'Module Baseline',
          mandatoryStatus: hasHardReq
            ? 'Hard-Required (No N/A)'
            : hasReq
            ? 'Mandatory'
            : 'Conditional',
        });

        const existingRev = reverseConvergenceMap.get(dq.id) || [];
        if (
          !existingRev.some(
            (x) => x.questionCode === pq.code && x.optionId === opt.id
          )
        ) {
          existingRev.push({
            questionCode: pq.code,
            stage,
            optionId: opt.id,
            optionLabel: opt.label,
          });
          reverseConvergenceMap.set(dq.id, existingRev);
        }
      }

      unlockedControls.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

      const unlockedModules = Array.from(modCodes)
        .filter((c) => c !== 'M0' && c !== 'M17')
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((c) => {
          const m = moduleByCode.get(c);
          return {
            code: c,
            name: m?.title || c,
            shortName: m?.shortTitle || c,
          };
        });

      // 3. Derived flags activated by this (question, option)
      const derivedFlagsActivated: string[] = [];
      if (
        (pq.id === 'P10' && opt.id === 'internet') ||
        (pq.id === 'P8' && (opt.id === 'customers' || opt.id === 'corporates_bc'))
      ) {
        derivedFlagsActivated.push('internet_facing');
      }
      if (
        (pq.id === 'P1' && (opt.id === 'vendor_onboarding' || opt.id === 'saas_portal')) ||
        (pq.id === 'P5' && opt.id === 'vendor_saas') ||
        (pq.id === 'P7' && opt.id !== 'in_house') ||
        (pq.id === 'P8' && opt.id === 'partner_vendor_staff') ||
        (pq.id === 'P10' && opt.id === 'partner_network') ||
        (pq.id === 'P13' && (opt.id === 'external_only' || opt.id === 'both' || opt.id === 'not_sure')) ||
        (pq.id === 'P18' && (opt.id === 'yes' || opt.id === 'not_sure')) ||
        (pq.id === 'P28' && opt.id === 'yes_third_party')
      ) {
        derivedFlagsActivated.push('external_party_involved');
      }
      if (
        (pq.id === 'P21' && (opt.id === 'pii' || opt.id === 'pci')) ||
        (pq.id === 'P26' && opt.id === 'pci_dss')
      ) {
        derivedFlagsActivated.push('pii_or_pci_in_scope');
      }
      if (
        (pq.id === 'P8' && (opt.id === 'customers' || opt.id === 'corporates_bc')) ||
        (pq.id === 'P20' && opt.id === 'sensitive')
      ) {
        derivedFlagsActivated.push('customer_facing_with_sensitive_data (when paired)');
      }
      if (
        (pq.id === 'P1' && opt.id === 'rpa_process') ||
        (pq.id === 'P11' && opt.id !== 'none')
      ) {
        derivedFlagsActivated.push('non_human_identity_present');
      }
      if (
        (pq.id === 'P5' &&
          (opt.id === 'bank_aws' || opt.id === 'other_cloud' || opt.id === 'hybrid' || opt.id === 'not_decided')) ||
        (pq.id === 'P24' && (opt.id === 'yes' || opt.id === 'not_sure'))
      ) {
        derivedFlagsActivated.push('cloud_hosted');
      }
      if (pq.id === 'P5' && (opt.id === 'bank_dc' || opt.id === 'hybrid' || opt.id === 'not_decided')) {
        derivedFlagsActivated.push('on_prem_hosted');
      }
      if (pq.id === 'P5' && opt.id === 'hybrid') {
        derivedFlagsActivated.push('hybrid');
      }
      if (pq.id === 'P14' && opt.id === 'file_transfer') {
        derivedFlagsActivated.push('external_file_transfer (when external)');
      }
      if (pq.id === 'P28' && opt.id !== 'no') {
        derivedFlagsActivated.push('ai_or_llm_present');
        if (opt.id === 'yes_third_party' || opt.id === 'not_sure') {
          derivedFlagsActivated.push('external_ai_present');
        }
      }
      if (
        (pq.id === 'P15' && (opt.id === 'yes' || opt.id === 'not_sure')) ||
        (pq.id === 'P17' && (opt.id === 'yes' || opt.id === 'not_sure'))
      ) {
        derivedFlagsActivated.push('new_trust_boundary_crossing');
      }
      if (pq.id === 'P3' && opt.id === 'minor') {
        derivedFlagsActivated.push('scope_narrowed (if no override trigger)');
      }

      // 4. Repeater tables activated
      const unlockedRepeaterTables: string[] = [];
      if (
        modCodes.has('M10') ||
        (pq.id === 'P27' && opt.id === 'yes') ||
        (pq.id === 'P4' && opt.id === 'servers_hosting')
      ) {
        unlockedRepeaterTables.push('Servers & VMs Inventory');
      }
      if (
        modCodes.has('M12') ||
        (pq.id === 'P17' && (opt.id === 'yes' || opt.id === 'not_sure')) ||
        (pq.id === 'P10' && (opt.id === 'internet' || opt.id === 'partner_network'))
      ) {
        unlockedRepeaterTables.push('Network Firewall Rules');
      }
      if (
        modCodes.has('M5') ||
        (pq.id === 'P14' && opt.id === 'rest_api') ||
        (pq.id === 'P4' && opt.id === 'apis')
      ) {
        unlockedRepeaterTables.push('API Endpoints Inventory');
      }
      if (
        modCodes.has('M5') ||
        modCodes.has('M6') ||
        modCodes.has('M7') ||
        (pq.id === 'P13' && opt.id !== 'no') ||
        (pq.id === 'P4' && opt.id === 'integrations')
      ) {
        unlockedRepeaterTables.push('System Integrations Matrix');
      }

      // 5. Override gate check
      const triggersOverrideGate = Boolean(
        (pq.id === 'P17' && (opt.id === 'yes' || opt.id === 'not_sure')) ||
          (pq.id === 'P18' && (opt.id === 'yes' || opt.id === 'not_sure')) ||
          (pq.id === 'P21' && (opt.id === 'pii' || opt.id === 'pci' || opt.id === 'secrets_keys')) ||
          (pq.id === 'P28' && opt.id !== 'no') ||
          (pq.id === 'P10' && (opt.id === 'internet' || opt.id === 'partner_network')) ||
          (pq.id === 'P8' && (opt.id === 'customers' || opt.id === 'partner_vendor_staff')) ||
          (pq.id === 'P15' && (opt.id === 'yes' || opt.id === 'not_sure'))
      );

      const setsFactsList = Object.entries(opt.setsFacts || {}).map(
        ([k, v]) => `${k}=${String(v)}`
      );
      const isFactOnly = unlockedModules.length === 0 && unlockedControls.length === 0;

      prelimOptionRows.push({
        stage,
        stageTitle,
        questionId: pq.id,
        questionCode: pq.code,
        questionText: pq.text,
        questionType: pq.answerType,
        prerequisiteText,
        optionId: opt.id,
        optionLabel: opt.label,
        optionDescription: opt.description || '',
        isFactOnly,
        setsFactsList,
        derivedFlagsActivated,
        unlockedModules,
        unlockedControls,
        unlockedRepeaterTables,
        triggersOverrideGate,
      });
    }
  }

  const detailedControlRows: DetailedControlReverseRow[] = detailedQuestions.map((dq) => {
    const mod = moduleByCode.get(dq.moduleId);
    return {
      id: dq.id,
      code: dq.code,
      moduleId: dq.moduleId,
      moduleName: mod?.title || dq.moduleId,
      moduleShortName: mod?.shortTitle || dq.moduleId,
      text: dq.text,
      answerType: dq.answerType,
      whyWeAsk: dq.whyWeAsk,
      visibilityCondition:
        dq.showOnlyIfText ||
        `Always visible when Section ${dq.moduleId} (${mod?.shortTitle || dq.moduleId}) is unlocked`,
      mandatoryCondition: dq.requireIf
        ? describeConditionReadable(dq.requireIf)
        : dq.required
        ? `Mandatory whenever visible in ${dq.moduleId}`
        : 'Recommended / Conditional',
      hardRequiredCondition: dq.hardRequireIf
        ? `HARD-REQUIRED (No N/A): ${describeConditionReadable(dq.hardRequireIf)}`
        : 'Standard (N/A permitted with written justification)',
      convergingPrelimOptions: reverseConvergenceMap.get(dq.id) || [],
    };
  });

  const scopeNarrowingTable = [
    {
      p4OptionId: 'ui',
      p4Label: 'User interface (UI)',
      retainedModules: ['M0', 'M1', 'M17'],
      retainedQuestions: ['M1.1', 'M1.2', 'M1.3'],
      suppressedModulesNote: 'Suppresses M2–M16 unless an Override Trigger fires.',
    },
    {
      p4OptionId: 'apis',
      p4Label: 'APIs',
      retainedModules: ['M0', 'M1', 'M5', 'M17'],
      retainedQuestions: ['M1.1', 'M1.2', 'M5.1', 'M5.2'],
      suppressedModulesNote: 'Retains App Core & API Security + API Endpoints Table.',
    },
    {
      p4OptionId: 'database',
      p4Label: 'Database or storage',
      retainedModules: ['M0', 'M1', 'M4', 'M16', 'M17'],
      retainedQuestions: ['M1.1', 'M1.2', 'M4.1', 'M16.1', 'M16.2'],
      suppressedModulesNote: 'Retains Data Protection, Encryption & Backup/DR.',
    },
    {
      p4OptionId: 'login_access',
      p4Label: 'Login, roles or access',
      retainedModules: ['M0', 'M1', 'M2', 'M17'],
      retainedQuestions: ['M1.1', 'M1.2', 'M2.1', 'M2.2'],
      suppressedModulesNote: 'Retains Identity, SSO, MFA & Access Governance.',
    },
    {
      p4OptionId: 'integrations',
      p4Label: 'Integrations',
      retainedModules: ['M0', 'M1', 'M3', 'M5', 'M6', 'M7', 'M17'],
      retainedQuestions: ['M3.1', 'M3.2', 'M5.1', 'M5.2', 'M6.1 (if SFTP)', 'M7.1 (if Queue)'],
      suppressedModulesNote: 'Retains Architecture & Active Integration Channels.',
    },
    {
      p4OptionId: 'servers_hosting',
      p4Label: 'Servers, cloud or network',
      retainedModules: ['M0', 'M1', 'M10 (if On-Prem)', 'M11 (if Cloud)', 'M12', 'M17'],
      retainedQuestions: ['M10.1', 'M11.1', 'M12.1'],
      suppressedModulesNote: 'Retains Infrastructure, Cloud & Firewall Boundaries.',
    },
    {
      p4OptionId: 'data_flows',
      p4Label: 'Data flows',
      retainedModules: ['M0', 'M1', 'M3', 'M4', 'M13', 'M17'],
      retainedQuestions: ['M3.1', 'M3.2', 'M4.1', 'M4.3', 'M13.1 (if Migrated)'],
      suppressedModulesNote: 'Retains Trust Boundaries, Data in Transit & Migration.',
    },
    {
      p4OptionId: 'reports',
      p4Label: 'Reports or exports',
      retainedModules: ['M0', 'M1', 'M4', 'M17'],
      retainedQuestions: ['M1.1', 'M1.2', 'M4.1', 'M4.5'],
      suppressedModulesNote: 'Retains Bulk Export DLP & Watermarking Controls (M4.5).',
    },
  ];

  const overrideTriggers = [
    {
      id: 'OVR-01',
      triggerCondition: 'P17 = Yes or Not sure (New firewall rules or network ports)',
      securityRationale: 'New network paths require full perimeter and segmentation review.',
      effect: 'Defeats Minor Enhancement narrowing; unlocks M3 & M12 (M12.1 + Firewall Table).',
    },
    {
      id: 'OVR-02',
      triggerCondition: 'P18 = Yes or Not sure (New vendor or third-party connection)',
      securityRationale: 'External counterparty introduction requires TPRM & DMZ governance.',
      effect: 'Defeats Minor Enhancement narrowing; unlocks M3, M8 & M12 (M8.1, M8.3, M12.3).',
    },
    {
      id: 'OVR-03',
      triggerCondition: 'P21 includes PII, PCI, or Login secrets/keys',
      securityRationale: 'Regulated personal, cardholder, or cryptographic material in scope.',
      effect: 'Defeats Minor Enhancement narrowing; unlocks M4 (M4.1, M4.4/M4.6) & M2.2.',
    },
    {
      id: 'OVR-04',
      triggerCondition: 'P28 != No (AI or LLM component included)',
      securityRationale: 'GenAI introduces prompt injection, RAG leakage, and model residency risks.',
      effect: 'Defeats Minor Enhancement narrowing; unlocks M15 (M15.1, M15.2, and M15.3 if external).',
    },
    {
      id: 'OVR-05',
      triggerCondition: 'P10 includes Internet or Partner/Vendor network',
      securityRationale: 'External network reachability expands attack surface beyond corporate LAN.',
      effect: 'Defeats Minor Enhancement narrowing; unlocks M12 (M12.1, M12.2/M12.3).',
    },
    {
      id: 'OVR-06',
      triggerCondition: 'P8 includes Retail customers or Partner/Vendor staff',
      securityRationale: 'External human user population requires CIAM or vendor PAM controls.',
      effect: 'Defeats Minor Enhancement narrowing; unlocks M2 (M2.4) or M8 (M8.3).',
    },
    {
      id: 'OVR-07',
      triggerCondition: 'P15 = Yes or Not sure (Crosses internal/DMZ/cloud/external boundary)',
      securityRationale: 'Trust boundary crossings require full zone-transition inspection.',
      effect: 'Defeats Minor Enhancement narrowing; unlocks M3 (M3.1, M3.2) & M12 (M12.1).',
    },
  ];

  const contradictionRules = [
    {
      code: 'CHK-01',
      severity: 'High' as const,
      triggerCondition: 'P19 = No (No bank/customer data) AND P21 includes PII, PCI, Financial, or Secrets',
      message: 'Data Scope Contradiction: P19 states no bank/customer data, but regulated data is selected in P21.',
      remediation: 'Change P19 to Yes so M4 Data Protection controls are properly evaluated.',
    },
    {
      code: 'CHK-02',
      severity: 'High' as const,
      triggerCondition: 'P8 includes Customers AND P10 does NOT include Internet',
      message: 'Customer Reachability Mismatch: Retail customers selected in P8 without Internet access in P10.',
      remediation: 'Add Internet in P10 or remove Customers from P8.',
    },
    {
      code: 'CHK-03',
      severity: 'Warning' as const,
      triggerCondition: 'P5 = Vendor SaaS AND P7 = Built & run by our bank (In-house)',
      message: 'Hosting vs Ownership Mismatch: Vendor SaaS hosting selected with 100% In-House ownership.',
      remediation: 'Update P7 to Vendor SaaS (subscription) or Vendor builds, bank runs.',
    },
    {
      code: 'CHK-04',
      severity: 'High' as const,
      triggerCondition: 'P12 = Yes (Anonymous access) AND P20 = Sensitive',
      message: 'Unauthenticated Sensitive Data Risk: Anonymous access enabled while Sensitive data is in scope.',
      remediation: 'Disable anonymous access (P12 = No) or isolate public informational endpoints.',
    },
    {
      code: 'CHK-05',
      severity: 'Warning' as const,
      triggerCondition: 'P13 = No (No integrations) AND P1 includes New Integration or P18 = Yes',
      message: 'Integration Scope Conflict: P13 states no integrations, but integration/vendor connection is selected.',
      remediation: 'Update P13 to Internal, External, or Both so P14–P16 integration channels are captured.',
    },
    {
      code: 'CHK-06',
      severity: 'High' as const,
      triggerCondition: 'P21 includes PCI AND P24 = Yes (Data processed outside India)',
      message: 'RBI Payment Data Localization Alert: Cardholder (PCI) data marked as processed outside India.',
      remediation: 'Ensure payment system data resides strictly in India (P24 = No) or document RBI exception in M4.9.',
    },
    {
      code: 'CHK-07',
      severity: 'Warning' as const,
      triggerCondition: 'P1 includes RPA Process AND P11 = None (No non-human identities)',
      message: 'RPA Bot Identity Missing: RPA automation selected in P1, but P11 states no non-human identities.',
      remediation: 'Select RPA bots or Service accounts in P11 so M2.2 & M9 vault controls are evaluated.',
    },
  ];

  const unlockingOptionsCount = prelimOptionRows.filter((r) => !r.isFactOnly).length;
  const factOnlyOptionsCount = prelimOptionRows.filter((r) => r.isFactOnly).length;

  return {
    versionId: definition.versionId,
    generatedDate: new Date().toISOString().slice(0, 10),
    totalPrelimQuestions: prelimQuestions.length,
    totalPrelimOptions: prelimOptionRows.length,
    unlockingOptionsCount,
    factOnlyOptionsCount,
    totalDetailedModules: definition.modules.filter((m) => m.code !== 'M0' && m.code !== 'M17').length,
    totalDetailedControls: detailedQuestions.length,
    prelimOptionRows,
    detailedControlRows,
    scopeNarrowingTable,
    overrideTriggers,
    contradictionRules,
  };
}

export function generatePermutationReferencePDFHTML(
  definition: DefinitionVersion = DEFAULT_DEFINITION_VERSION
): string {
  const cat = buildMasterPermutationCatalog(definition);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SAR Assist — Complete Preliminary-to-Detailed Checklist Permutation Reference Guide (${escapeHtml(
    cat.versionId
  )})</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #09090b;
      background: #ffffff;
      line-height: 1.4;
      font-size: 11px;
      margin: 0;
      padding: 20px 28px;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #09090b;
      color: #ffffff;
      padding: 12px 18px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    }
    .toolbar-btn {
      background: #10b981;
      color: #09090b;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
    }
    .toolbar-btn:hover { background: #34d399; }
    .header {
      border-bottom: 3px solid #09090b;
      padding-bottom: 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 { font-size: 20px; font-weight: 800; margin: 0 0 4px 0; letter-spacing: -0.02em; }
    h2 {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 22px 0 8px 0;
      padding: 7px 12px;
      background: #09090b;
      color: #ffffff;
      border-radius: 4px;
      page-break-after: avoid;
    }
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi-card {
      border: 1px solid #d4d4d8;
      border-radius: 6px;
      padding: 8px 12px;
      background: #fafafa;
    }
    .kpi-val { font-size: 18px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #09090b; }
    .kpi-lbl { font-size: 10px; text-transform: uppercase; color: #52525b; font-weight: 600; }
    .diagram-box {
      border: 1.5px solid #18181b;
      border-radius: 8px;
      padding: 14px;
      background: #fafafa;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10.5px; }
    th {
      background: #18181b;
      color: #ffffff;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #18181b;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #d4d4d8;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    .mono { font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, monospace; font-size: 10px; }
    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      font-weight: 700;
      margin: 1px 2px 1px 0;
    }
    .badge-dark { background: #18181b; color: #ffffff; }
    .badge-emerald { background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
    .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .badge-zinc { background: #f4f4f5; color: #3f3f46; border: 1px solid #d4d4d8; }
    .page-break { page-break-before: always; }
    @media print {
      .toolbar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong style="font-size: 13px;">SAR ASSIST · MASTER PRELIMINARY-TO-DETAILED CHECKLIST PERMUTATION REFERENCE GUIDE</strong>
      <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">
        Complete Deterministic Mapping of All ${cat.totalPrelimQuestions} Preliminary Questions (P1–P30), All ${cat.totalPrelimOptions} Options, 16 Derived Flags, and All ${cat.totalDetailedControls} Detailed Security Controls (M1.1–M16.2)
      </div>
    </div>
    <button class="toolbar-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="mono" style="font-weight: 700; color: #047857; margin-bottom: 3px;">
        ENTERPRISE SECURITY ARCHITECTURE GOVERNANCE · DEFINITION ${escapeHtml(cat.versionId.toUpperCase())}
      </div>
      <h1>Preliminary-to-Detailed Checklist Permutation Reference &amp; Architecture Diagram</h1>
      <div style="font-size: 11.5px; color: #52525b;">
        Authoritative truth table of every Preliminary Discovery Question (P1–P30), every selectable option, conditional progressive disclosure prerequisites, derived risk flags, and exact Detailed Security Checklist unlocks (M1.1–M16.2).
      </div>
    </div>
    <div class="mono" style="text-align: right; font-size: 10.5px;">
      <div><strong>Definition:</strong> ${escapeHtml(cat.versionId)}</div>
      <div><strong>Date Generated:</strong> ${escapeHtml(cat.generatedDate)}</div>
      <div><strong>Engine Mode:</strong> 100% Deterministic</div>
    </div>
  </div>

  <div class="kpi-strip">
    <div class="kpi-card">
      <div class="kpi-val">${cat.totalPrelimQuestions} (P1–P30)</div>
      <div class="kpi-lbl">Preliminary Questions (6 Stages)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${cat.totalPrelimOptions}</div>
      <div class="kpi-lbl">Total Preliminary Options</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${cat.unlockingOptionsCount} / ${cat.factOnlyOptionsCount}</div>
      <div class="kpi-lbl">Unlock Triggers vs Fact-Only</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">16 Flags</div>
      <div class="kpi-lbl">Derived Risk &amp; Topology Flags</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${cat.totalDetailedModules} (M1–M16)</div>
      <div class="kpi-lbl">Security Checklist Domains</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val">${cat.totalDetailedControls} (M1.1–M16.2)</div>
      <div class="kpi-lbl">Detailed Security Controls</div>
    </div>
  </div>

  <h2>Section 1 — Visual Representation Diagram: Preliminary-to-Detailed Checklist Permutation Pipeline</h2>
  <div class="diagram-box">
    <svg viewBox="0 0 1160 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="display:block; font-family: 'Inter', sans-serif;">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#18181b" />
        </marker>
        <marker id="arrow-emerald" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
        </marker>
      </defs>

      <!-- Column 1: 6 Preliminary Stages -->
      <rect x="10" y="10" width="265" height="330" rx="8" fill="#ffffff" stroke="#18181b" stroke-width="1.5"/>
      <rect x="10" y="10" width="265" height="28" rx="8" fill="#18181b"/>
      <text x="142" y="28" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle" font-family="monospace">1. PRELIMINARY DISCOVERY (P1–P30)</text>

      <rect x="22" y="48" width="240" height="40" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="30" y="64" fill="#09090b" font-size="10" font-weight="700">Stage 1: What is changing? (P1–P4)</text>
      <text x="30" y="79" fill="#52525b" font-size="9" font-family="monospace">P2, P3, P4 unlock only if P1 = Enhancement</text>

      <rect x="22" y="95" width="240" height="40" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="30" y="111" fill="#09090b" font-size="10" font-weight="700">Stage 2: Where will it run? (P5–P7)</text>
      <text x="30" y="126" fill="#52525b" font-size="9" font-family="monospace">On-Prem DC, AWS/Cloud, Hybrid, Vendor SaaS</text>

      <rect x="22" y="142" width="240" height="40" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="30" y="158" fill="#09090b" font-size="10" font-weight="700">Stage 3: Who &amp; how accessed? (P8–P12)</text>
      <text x="30" y="173" fill="#52525b" font-size="9" font-family="monospace">Users, Channels, Networks, Non-Human IDs</text>

      <rect x="22" y="189" width="240" height="40" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="30" y="205" fill="#09090b" font-size="10" font-weight="700">Stage 4: What it connects to? (P13–P18)</text>
      <text x="30" y="220" fill="#52525b" font-size="9" font-family="monospace">P14–P16 unlock only if P13 != No</text>

      <rect x="22" y="236" width="240" height="40" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="30" y="252" fill="#09090b" font-size="10" font-weight="700">Stage 5: What data involved? (P19–P26)</text>
      <text x="30" y="267" fill="#52525b" font-size="9" font-family="monospace">P20–P24 unlock only if P19 = Yes</text>

      <rect x="22" y="283" width="240" height="44" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="30" y="299" fill="#09090b" font-size="10" font-weight="700">Stage 6: Anything new? (P27–P30)</text>
      <text x="30" y="314" fill="#52525b" font-size="9" font-family="monospace">New Servers (P27), AI/LLM (P28), Exceptions</text>

      <!-- Arrows Col 1 -> Col 2 -->
      <line x1="275" y1="115" x2="315" y2="115" stroke="#18181b" stroke-width="1.8" marker-end="url(#arrow)"/>
      <line x1="275" y1="235" x2="315" y2="235" stroke="#18181b" stroke-width="1.8" marker-end="url(#arrow)"/>

      <!-- Column 2: Deterministic Rules Engine, Derived Flags & Narrowing Gate -->
      <rect x="320" y="10" width="265" height="330" rx="8" fill="#ffffff" stroke="#18181b" stroke-width="1.5"/>
      <rect x="320" y="10" width="265" height="28" rx="8" fill="#18181b"/>
      <text x="452" y="28" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle" font-family="monospace">2. DETERMINISTIC ENGINE &amp; FLAGS</text>

      <rect x="332" y="48" width="240" height="82" rx="5" fill="#ecfdf5" stroke="#059669"/>
      <text x="340" y="64" fill="#065f46" font-size="10" font-weight="800">Option Classification Filter</text>
      <text x="340" y="80" fill="#064e3b" font-size="9">• ${cat.unlockingOptionsCount} Unlock Triggers: Activate modules/controls</text>
      <text x="340" y="95" fill="#064e3b" font-size="9">• ${cat.factOnlyOptionsCount} Fact-Only Options: Record safe baseline</text>
      <text x="340" y="110" fill="#064e3b" font-size="9">• Fail-Open "Not Sure": Unlocks verification</text>

      <rect x="332" y="140" width="240" height="96" rx="5" fill="#f4f4f5" stroke="#18181b"/>
      <text x="340" y="156" fill="#09090b" font-size="10" font-weight="800">16 Derived Risk Flags (DAG)</text>
      <text x="340" y="172" fill="#3f3f46" font-size="8.5" font-family="monospace">• internet_facing (P10=internet | P8=cust)</text>
      <text x="340" y="185" fill="#3f3f46" font-size="8.5" font-family="monospace">• pii_or_pci_in_scope (P21=pii/pci | P26)</text>
      <text x="340" y="198" fill="#3f3f46" font-size="8.5" font-family="monospace">• external_party_involved (P5/P7/P8/P13/P18)</text>
      <text x="340" y="211" fill="#3f3f46" font-size="8.5" font-family="monospace">• cloud_hosted | on_prem_hosted | hybrid</text>
      <text x="340" y="224" fill="#3f3f46" font-size="8.5" font-family="monospace">• ai_or_llm_present | external_ai_present</text>

      <rect x="332" y="246" width="240" height="82" rx="5" fill="#fffbeb" stroke="#d97706"/>
      <text x="340" y="262" fill="#92400e" font-size="10" font-weight="800">Scope Narrowing &amp; 7 Override Gates</text>
      <text x="340" y="277" fill="#78350f" font-size="8.8">If P1=[Enhancement] + P2=Yes + P3=Minor:</text>
      <text x="340" y="291" fill="#78350f" font-size="8.8">Narrows strictly to P4 changed components</text>
      <text x="340" y="305" fill="#991b1b" font-size="8.8" font-weight="700">UNLESS any of 7 High-Risk Overrides fire</text>
      <text x="340" y="319" fill="#78350f" font-size="8.5" font-family="monospace">(P17, P18, P21, P28, P10, P8, P15)</text>

      <!-- Arrows Col 2 -> Col 3 -->
      <line x1="585" y1="115" x2="625" y2="115" stroke="#059669" stroke-width="2" marker-end="url(#arrow-emerald)"/>
      <line x1="585" y1="235" x2="625" y2="235" stroke="#059669" stroke-width="2" marker-end="url(#arrow-emerald)"/>

      <!-- Column 3: 16 Security Checklist Domains (M1-M16) -->
      <rect x="630" y="10" width="255" height="330" rx="8" fill="#ffffff" stroke="#18181b" stroke-width="1.5"/>
      <rect x="630" y="10" width="255" height="28" rx="8" fill="#18181b"/>
      <text x="757" y="28" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle" font-family="monospace">3. UNLOCKED CHECKLIST DOMAINS</text>

      <rect x="642" y="48" width="230" height="52" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="650" y="63" fill="#09090b" font-size="9.5" font-weight="700">Core &amp; Identity (M1, M2, M3)</text>
      <text x="650" y="77" fill="#52525b" font-size="8.5" font-family="monospace">M1: App Core (M1.1–M1.3)</text>
      <text x="650" y="90" fill="#52525b" font-size="8.5" font-family="monospace">M2: IAM (M2.1–M2.5) · M3: Arch (M3.1–M3.2)</text>

      <rect x="642" y="107" width="230" height="52" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="650" y="122" fill="#09090b" font-size="9.5" font-weight="700">Data &amp; Integrations (M4, M5, M6, M7)</text>
      <text x="650" y="136" fill="#52525b" font-size="8.5" font-family="monospace">M4: Data/PII/PCI/DPDP (M4.1–M4.9)</text>
      <text x="650" y="149" fill="#52525b" font-size="8.5" font-family="monospace">M5: APIs (M5.1–M5.6) · M6: SFTP · M7: Queue</text>

      <rect x="642" y="166" width="230" height="52" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="650" y="181" fill="#09090b" font-size="9.5" font-weight="700">Vendor, RPA &amp; Infra (M8, M9, M10, M11)</text>
      <text x="650" y="195" fill="#52525b" font-size="8.5" font-family="monospace">M8: Vendor/SaaS (M8.1–M8.4) · M9: RPA</text>
      <text x="650" y="208" fill="#52525b" font-size="8.5" font-family="monospace">M10: On-Prem VMs · M11: Cloud Landing Zone</text>

      <rect x="642" y="225" width="230" height="52" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="650" y="240" fill="#09090b" font-size="9.5" font-weight="700">Network, Migration, Mobile, AI, DR</text>
      <text x="650" y="254" fill="#52525b" font-size="8.5" font-family="monospace">M12: Firewall (M12.1–M12.3) · M13: Migration</text>
      <text x="650" y="267" fill="#52525b" font-size="8.5" font-family="monospace">M14: Mobile · M15: AI (M15.1–M15.3) · M16: DR</text>

      <rect x="642" y="284" width="230" height="44" rx="5" fill="#ecfdf5" stroke="#059669"/>
      <text x="650" y="300" fill="#065f46" font-size="9.5" font-weight="700">4 Architecture Repeater Tables</text>
      <text x="650" y="315" fill="#064e3b" font-size="8.5" font-family="monospace">Servers · Firewall Rules · APIs · Integrations</text>

      <!-- Arrows Col 3 -> Col 4 -->
      <line x1="885" y1="175" x2="920" y2="175" stroke="#18181b" stroke-width="1.8" marker-end="url(#arrow)"/>

      <!-- Column 4: Question-Level Convergence & Elevation -->
      <rect x="925" y="10" width="225" height="330" rx="8" fill="#ffffff" stroke="#18181b" stroke-width="1.5"/>
      <rect x="925" y="10" width="225" height="28" rx="8" fill="#18181b"/>
      <text x="1037" y="28" fill="#ffffff" font-size="10.5" font-weight="800" text-anchor="middle" font-family="monospace">4. CONVERGENCE &amp; GATES</text>

      <rect x="937" y="48" width="200" height="84" rx="5" fill="#f4f4f5" stroke="#d4d4d8"/>
      <text x="945" y="64" fill="#09090b" font-size="9.5" font-weight="800">Multi-Trigger Convergence</text>
      <text x="945" y="79" fill="#3f3f46" font-size="8.5">Multiple answers converge on one</text>
      <text x="945" y="91" fill="#3f3f46" font-size="8.5">shared question without duplication:</text>
      <text x="945" y="105" fill="#09090b" font-size="8.2" font-family="monospace">• P21=PCI + P26=PCI-DSS ➔ M4.6</text>
      <text x="945" y="118" fill="#09090b" font-size="8.2" font-family="monospace">• P21=PII + P26=DPDP ➔ M4.4</text>

      <rect x="937" y="142" width="200" height="88" rx="5" fill="#fef2f2" stroke="#dc2626"/>
      <text x="945" y="158" fill="#991b1b" font-size="9.5" font-weight="800">Dynamic Mandatory Elevation</text>
      <text x="945" y="173" fill="#7f1d1d" font-size="8.5">• Visible Only: Contextual question</text>
      <text x="945" y="187" fill="#7f1d1d" font-size="8.5">• Mandatory (requireIf): Must answer</text>
      <text x="945" y="201" fill="#991b1b" font-size="8.5" font-weight="700">• Hard-Required (hardRequireIf):</text>
      <text x="945" y="214" fill="#7f1d1d" font-size="8.2">  Cannot be marked N/A (e.g. M4.6, M12.2)</text>

      <rect x="937" y="240" width="200" height="88" rx="5" fill="#f4f4f5" stroke="#18181b"/>
      <text x="945" y="256" fill="#09090b" font-size="9.5" font-weight="800">Submission &amp; Dual-Sheet Export</text>
      <text x="945" y="271" fill="#3f3f46" font-size="8.5">• 7 Contradiction Checks (CHK-01..07)</text>
      <text x="945" y="285" fill="#3f3f46" font-size="8.5">• Sheet 1: Prelim Responses (P1–P30)</text>
      <text x="945" y="299" fill="#3f3f46" font-size="8.5">• Sheet 2: Security Checklist (M1–M16)</text>
      <text x="945" y="313" fill="#047857" font-size="8.5" font-weight="700">• SHA-256 Tamper-Evident Seal</text>
    </svg>
  </div>

  <h2>Section 2 — Complete Preliminary Questions &amp; Options Master Permutation Table (P1–P30 · All ${
    cat.totalPrelimOptions
  } Options)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 85px;">Stage</th>
        <th style="width: 195px;">Preliminary Question (P1–P30)</th>
        <th style="width: 110px;">Prerequisite (Show Only If)</th>
        <th style="width: 175px;">Selectable Option &amp; Code</th>
        <th style="width: 85px;">Behavior</th>
        <th style="width: 140px;">Derived Flags &amp; Facts Set</th>
        <th style="width: 145px;">Unlocked Checklist Sections &amp; Tables</th>
        <th>Unlocked / Converged Detailed Checklist Questions (M1.1–M16.2)</th>
      </tr>
    </thead>
    <tbody>
      ${cat.prelimOptionRows
        .map(
          (row) => `<tr>
            <td class="mono"><strong>Stage ${row.stage}</strong><br/><span style="color:#52525b;">${escapeHtml(
            row.stageTitle
          )}</span></td>
            <td><span class="badge badge-dark">${escapeHtml(row.questionCode)}</span> <strong>${escapeHtml(
            row.questionText
          )}</strong><br/><span class="mono" style="color:#71717a;">Type: ${escapeHtml(
            row.questionType
          )}</span></td>
            <td class="mono" style="color:#3f3f46;">${escapeHtml(row.prerequisiteText)}</td>
            <td><strong>${escapeHtml(row.optionLabel)}</strong><br/><span class="mono" style="color:#71717a;">id: ${escapeHtml(
            row.optionId
          )}</span>${
            row.triggersOverrideGate
              ? `<br/><span class="badge badge-red">Override Trigger</span>`
              : ''
          }</td>
            <td>${
              row.isFactOnly
                ? `<span class="badge badge-zinc">Fact-Only</span>`
                : `<span class="badge badge-emerald">Unlocks Checklist</span>`
            }</td>
            <td class="mono">${
              row.derivedFlagsActivated.length > 0
                ? row.derivedFlagsActivated
                    .map((f) => `<span class="badge badge-amber">${escapeHtml(f)}</span>`)
                    .join('<br/>')
                : ''
            }${
            row.setsFactsList.length > 0
              ? `<div style="color:#52525b; margin-top:2px;">${row.setsFactsList
                  .map(escapeHtml)
                  .join(', ')}</div>`
              : row.derivedFlagsActivated.length === 0
              ? '<span style="color:#a1a1aa;">Baseline fact</span>'
              : ''
          }</td>
            <td>${
              row.unlockedModules.length > 0
                ? row.unlockedModules
                    .map(
                      (m) =>
                        `<span class="badge badge-dark">${escapeHtml(m.code)}</span> <span style="font-size:10px;">${escapeHtml(
                          m.shortName
                        )}</span>`
                    )
                    .join('<br/>')
                : '<span style="color:#71717a;">No extra module unlocked</span>'
            }${
            row.unlockedRepeaterTables.length > 0
              ? `<div style="margin-top:4px;">${row.unlockedRepeaterTables
                  .map((t) => `<span class="badge badge-emerald">Table: ${escapeHtml(t)}</span>`)
                  .join('<br/>')}</div>`
              : ''
          }</td>
            <td>${
              row.unlockedControls.length > 0
                ? row.unlockedControls
                    .map(
                      (c) =>
                        `<div style="margin-bottom:3px;"><span class="badge badge-dark">${escapeHtml(
                          c.code
                        )}</span> <strong>${escapeHtml(c.text)}</strong> <span class="badge ${
                          c.mandatoryStatus.startsWith('Hard')
                            ? 'badge-red'
                            : c.mandatoryStatus === 'Mandatory'
                            ? 'badge-amber'
                            : 'badge-zinc'
                        }">${escapeHtml(c.mandatoryStatus)}</span></div>`
                    )
                    .join('')
                : `<span style="color:#71717a;">${escapeHtml(
                    row.optionDescription || 'Captures fact only — keeps unrelated controls hidden.'
                  )}</span>`
            }</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="page-break"></div>
  <h2>Section 3 — Reverse Convergence Matrix: All ${
    cat.totalDetailedControls
  } Detailed Security Checklist Controls (M1.1–M16.2) &amp; What Unlocks Them</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 135px;">Section / Domain</th>
        <th style="width: 65px;">Control</th>
        <th style="width: 250px;">Detailed Checklist Question</th>
        <th style="width: 170px;">Visibility Condition (Show Only If)</th>
        <th style="width: 155px;">Mandatory Condition</th>
        <th style="width: 165px;">Hard-Required (No N/A) Gate</th>
        <th>All Converging Preliminary Options (P1–P30)</th>
      </tr>
    </thead>
    <tbody>
      ${cat.detailedControlRows
        .map(
          (dq) => `<tr>
            <td><span class="badge badge-dark">${escapeHtml(dq.moduleId)}</span> <strong>${escapeHtml(
            dq.moduleShortName
          )}</strong></td>
            <td class="mono"><strong>${escapeHtml(dq.code)}</strong></td>
            <td><strong>${escapeHtml(dq.text)}</strong><br/><span style="color:#52525b; font-size:9.5px;">Why: ${escapeHtml(
            dq.whyWeAsk
          )}</span></td>
            <td class="mono">${escapeHtml(dq.visibilityCondition)}</td>
            <td class="mono">${escapeHtml(dq.mandatoryCondition)}</td>
            <td class="mono">${
              dq.hardRequiredCondition.startsWith('HARD')
                ? `<span class="badge badge-red">${escapeHtml(dq.hardRequiredCondition)}</span>`
                : `<span style="color:#52525b;">${escapeHtml(dq.hardRequiredCondition)}</span>`
            }</td>
            <td>${
              dq.convergingPrelimOptions.length > 0
                ? dq.convergingPrelimOptions
                    .map(
                      (p) =>
                        `<span class="badge badge-zinc">${escapeHtml(p.questionCode)} = ${escapeHtml(
                          p.optionLabel
                        )}</span>`
                    )
                    .join(' ')
                : `<span style="color:#52525b;">Unlocked via ${escapeHtml(dq.moduleId)} baseline rule</span>`
            }</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>Section 4 — Minor Enhancement Scope Narrowing (P4) &amp; 7 High-Risk Override Triggers</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 180px;">P4 Touched Component</th>
        <th style="width: 210px;">Retained Checklist Sections</th>
        <th style="width: 220px;">Retained Detailed Questions</th>
        <th>Scope Narrowing Effect (When P1=[Enhancement], P2=Yes, P3=Minor &amp; 0 Overrides)</th>
      </tr>
    </thead>
    <tbody>
      ${cat.scopeNarrowingTable
        .map(
          (s) => `<tr>
            <td><strong>${escapeHtml(s.p4Label)}</strong> <span class="mono">(${escapeHtml(
            s.p4OptionId
          )})</span></td>
            <td class="mono"><strong>${escapeHtml(s.retainedModules.join(', '))}</strong></td>
            <td class="mono">${escapeHtml(s.retainedQuestions.join(', '))}</td>
            <td>${escapeHtml(s.suppressedModulesNote)}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Override ID</th>
        <th style="width: 290px;">High-Risk Override Trigger Condition</th>
        <th style="width: 310px;">Security Architecture Rationale</th>
        <th>Deterministic Effect on Checklist</th>
      </tr>
    </thead>
    <tbody>
      ${cat.overrideTriggers
        .map(
          (o) => `<tr>
            <td class="mono"><span class="badge badge-red">${escapeHtml(o.id)}</span></td>
            <td class="mono"><strong>${escapeHtml(o.triggerCondition)}</strong></td>
            <td>${escapeHtml(o.securityRationale)}</td>
            <td><strong>${escapeHtml(o.effect)}</strong></td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <h2>Section 5 — 7 Cross-Answer Contradiction Detection Rules (CHK-01 to CHK-07)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 80px;">Rule Code</th>
        <th style="width: 85px;">Severity</th>
        <th style="width: 290px;">Incompatible Permutation Combination</th>
        <th style="width: 320px;">Validation Alert Message</th>
        <th>Required Remediation / Override Path</th>
      </tr>
    </thead>
    <tbody>
      ${cat.contradictionRules
        .map(
          (c) => `<tr>
            <td class="mono"><strong>${escapeHtml(c.code)}</strong></td>
            <td><span class="badge ${c.severity === 'High' ? 'badge-red' : 'badge-amber'}">${escapeHtml(
            c.severity
          )}</span></td>
            <td class="mono">${escapeHtml(c.triggerCondition)}</td>
            <td><strong>${escapeHtml(c.message)}</strong></td>
            <td>${escapeHtml(c.remediation)}</td>
          </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="header" style="border-top: 2px solid #09090b; border-bottom: none; padding-top: 10px; margin-top: 20px;">
    <div class="mono">SAR ASSIST · DETERMINISTIC PRELIMINARY-TO-CHECKLIST PERMUTATION REFERENCE GUIDE (${escapeHtml(
      cat.versionId
    )})</div>
    <div class="mono">Date Generated: ${escapeHtml(cat.generatedDate)}</div>
  </div>
</body>
</html>`;
}

