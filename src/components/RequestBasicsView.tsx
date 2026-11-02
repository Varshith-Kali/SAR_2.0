import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  ExternalLink,
  Plus,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { CMDB_APPLICATIONS } from '../shared/definitions';
import { detectLiveSecretInText, evaluateFlowGates } from '../shared/rulesEngine';
import { CMDBApplication, RequestBasicsData, SARRecord } from '../shared/types';
import { CyberKickerTrace } from './CyberScrollTrace';

interface RequestBasicsViewProps {
  sar: SARRecord;
  allSars: SARRecord[];
  onUpdateBasics: (patch: Partial<RequestBasicsData>) => void;
  onContinueToPreliminary: () => void;
  onOpenExistingSAR: (sarId: string) => void;
}

const DATA_TYPE_SHORTLIST = [
  'Personal data (PII)',
  'Card data (PCI)',
  'Financial records',
  'Login secrets or keys',
  'Source code or IP',
  'Logs and telemetry',
  'Configuration data',
];

const BUSINESS_UNITS = [
  'Retail & Digital Banking',
  'Wealth & Private Banking',
  'Corporate & Wholesale Banking',
  'Treasury & Clearing',
  'Cards & Merchant Acquiring',
  'Retail Assets & Lending',
  'Core Banking Operations',
  'Human Resources & Corporate Services',
  'Information Security Group',
];

export const RequestBasicsView: React.FC<RequestBasicsViewProps> = ({
  sar,
  onUpdateBasics,
  onContinueToPreliminary,
}) => {
  const [appSearch, setAppSearch] = useState('');
  const [customAppInput, setCustomAppInput] = useState('');
  const [showGateError, setShowGateError] = useState(false);
  const basics = sar.basics;
  const isReadOnly = sar.status === 'submitted';
  const flowGates = useMemo(() => evaluateFlowGates(sar), [sar]);

  const matchingApps = useMemo(
    () =>
      CMDB_APPLICATIONS.filter((app) => {
        if (!appSearch.trim()) return true;
        const q = appSearch.toLowerCase();
        return (
          app.canonicalName.toLowerCase().includes(q) ||
          app.code.toLowerCase().includes(q) ||
          app.aliases.some((al) => al.toLowerCase().includes(q)) ||
          app.businessUnit.toLowerCase().includes(q)
        );
      }),
    [appSearch]
  );

  const ticketTrimmed = (basics.ticketNo || '').trim();
  const isTicketFormatValid =
    ticketTrimmed === '' || /^(INC|RITM|CHG|REQ|SAR)[0-9]{5,10}$/i.test(ticketTrimmed);

  const secretWarningReq =
    detectLiveSecretInText(basics.businessRequirement) ||
    detectLiveSecretInText(basics.projectName);

  const toggleConnectedApp = (app: CMDBApplication) => {
    if (isReadOnly) return;
    const exists = basics.connectedAppIds.includes(app.id);
    const nextIds = exists
      ? basics.connectedAppIds.filter((id) => id !== app.id)
      : [...basics.connectedAppIds, app.id];

    onUpdateBasics({ connectedAppIds: nextIds });
  };

  const handleAddCustomApp = () => {
    if (isReadOnly) return;
    const clean = customAppInput.trim().replace(/[<>]/g, '').slice(0, 80);
    if (!clean || detectLiveSecretInText(clean)) return;
    if (!basics.customConnectedApps.includes(clean)) {
      onUpdateBasics({
        customConnectedApps: [...basics.customConnectedApps, clean],
      });
    }
    setCustomAppInput('');
  };

  const togglePrelimDataType = (dt: string) => {
    if (isReadOnly) return;
    const exists = basics.preliminaryDataTypes.includes(dt);
    onUpdateBasics({
      preliminaryDataTypes: exists
        ? basics.preliminaryDataTypes.filter((x) => x !== dt)
        : [...basics.preliminaryDataTypes, dt],
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pt-4 pb-6 relative">
      {/* Section Header */}
      <div
        id="sec-basics-header"
        className="pb-4 mb-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-zinc-950 dark:text-white mb-1.5">
            <CyberKickerTrace />
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
              PHASE 1 OF 4
            </span>
            <span>Request Basics</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Project &amp; Request Context
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Enter the core request details and link any connected applications from the CMDB.
            Every field autosaves as you type.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* 1. Project Name & Business Unit */}
        <div
          id="sec-basics-identity"
          className="sar-glass-card relative p-6 sm:p-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="inline-flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-mono text-[11px] font-bold inline-flex items-center justify-center">
                01
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                Identity &amp; Release Scope
              </span>
            </div>
            <CyberKickerTrace />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-950 dark:text-white mb-1">
              Project or Request Name <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              For example: &ldquo;Payments Hub v3.2 — ISO20022 Real-Time Settlement Upgrade&rdquo;
            </p>
            <input
              type="text"
              disabled={isReadOnly}
              maxLength={140}
              value={basics.projectName}
              onChange={(e) => onUpdateBasics({ projectName: e.target.value })}
              placeholder="Enter descriptive project or release name..."
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-950/90 text-zinc-950 dark:text-white text-sm focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Business Unit
              </label>
              <select
                disabled={isReadOnly}
                value={basics.businessUnit}
                onChange={(e) => onUpdateBasics({ businessUnit: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-950/90 text-zinc-950 dark:text-white text-sm focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
              >
                {BUSINESS_UNITS.map((bu) => (
                  <option key={bu} value={bu}>
                    {bu}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Target Go-Live Date <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                disabled={isReadOnly}
                value={basics.targetGoLiveDate}
                onChange={(e) => onUpdateBasics({ targetGoLiveDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-950/90 text-zinc-950 dark:text-white text-sm font-mono focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  ServiceNow Ticket (Optional)
                </label>
              </div>
              <input
                type="text"
                disabled={isReadOnly}
                value={basics.ticketNo}
                onChange={(e) => onUpdateBasics({ ticketNo: e.target.value.toUpperCase() })}
                placeholder="e.g. RITM0049210 or leave blank"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white/90 dark:bg-zinc-950/90 text-zinc-950 dark:text-white text-sm font-mono focus:outline-none ${
                  !isTicketFormatValid
                    ? 'border-red-500'
                    : 'border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-zinc-300'
                }`}
              />
              {!isTicketFormatValid && (
                <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Expected format: RITM, INC, CHG, REQ, or SAR followed by 5–10 digits.</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 2. Business Requirement & Purpose */}
        <div
          id="sec-basics-requirement"
          className="sar-glass-card relative p-6 sm:p-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <div className="inline-flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-mono text-[11px] font-bold inline-flex items-center justify-center">
                02
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                Architectural Intent &amp; Change Summary
              </span>
            </div>
            <CyberKickerTrace />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-bold text-zinc-950 dark:text-white">
                Business Requirement &amp; Purpose <span className="text-red-600">*</span>
              </label>
              <span className="font-mono text-xs text-zinc-400 tabular-nums">
                {basics.businessRequirement.length} / 1500
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              Describe what business problem this solves and what changes for users or operations.
              (Do not paste passwords, keys, or live secrets.)
            </p>
            <textarea
              rows={3}
              disabled={isReadOnly}
              maxLength={1500}
              value={basics.businessRequirement}
              onChange={(e) => onUpdateBasics({ businessRequirement: e.target.value })}
              placeholder="Explain the business driver, customer or operational scope, and expected outcome..."
              className="w-full p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-950/90 text-zinc-950 dark:text-white text-sm focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
            />
            {secretWarningReq && (
              <div className="mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{secretWarningReq}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Connected or Integrated Applications (CMDB Catalog) */}
        <div
          id="sec-basics-cmdb"
          className="sar-glass-card relative p-6 sm:p-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3 mb-4">
            <div className="inline-flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-mono text-[11px] font-bold inline-flex items-center justify-center">
                03
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                CMDB Application Topology
              </span>
            </div>
            <CyberKickerTrace />
          </div>

          <div className="mb-4">
            <h2 className="font-display text-base font-bold text-zinc-950 dark:text-white">
              Connected or Integrated Applications (CMDB Catalog) <span className="text-red-600">*</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Select at least 1 CMDB application or add a custom uncatalogued system. Search by application name or alias (e.g.{' '}
              <code className="font-mono">PayHub</code>, <code className="font-mono">IMPS</code>,{' '}
              <code className="font-mono">CBS</code>, <code className="font-mono">Workday</code>,{' '}
              <code className="font-mono">CardVault</code>).
            </p>
          </div>

          {/* Search Box */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              placeholder="Search CMDB applications by name or alias (e.g. PayHub, Finacle, WealthOne)..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/90 dark:bg-zinc-950/90 text-zinc-950 dark:text-white focus:outline-none focus:border-zinc-950 dark:focus:border-zinc-300"
            />
          </div>

          {/* CMDB Application Option Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1 py-0.5">
            {matchingApps.map((app) => {
              const isSelected = basics.connectedAppIds.includes(app.id);
              return (
                <button
                  key={app.id}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => toggleConnectedApp(app)}
                  className={`sar-glass-option text-left p-4 rounded-2xl border cursor-pointer ${
                    isSelected
                      ? 'border-zinc-950 ring-1 ring-zinc-950 bg-zinc-950/[0.04] dark:border-white dark:ring-white dark:bg-zinc-800/90'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/70 hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-display font-bold text-sm text-zinc-950 dark:text-white">
                        {app.canonicalName}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                        {app.hostingType} · {app.dataClassification}
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                          : 'border border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5">
                    Aliases: {app.aliases.join(', ')}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom / Uncatalogued App Entry */}
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              disabled={isReadOnly}
              value={customAppInput}
              onChange={(e) => setCustomAppInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomApp())}
              placeholder="Connecting to a new or external system not in CMDB? Add name here..."
              className="flex-1 px-4 py-2 text-xs rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-950/90 text-zinc-950 dark:text-white"
            />
            <button
              type="button"
              disabled={isReadOnly}
              onClick={handleAddCustomApp}
              className="sar-glass-step-btn inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Uncatalogued System</span>
            </button>
          </div>

          {basics.customConnectedApps.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">Custom systems:</span>
              {basics.customConnectedApps.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-medium"
                >
                  <span>{name}</span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBasics({
                          customConnectedApps: basics.customConnectedApps.filter((x) => x !== name),
                        })
                      }
                      className="text-zinc-300 hover:text-white dark:text-zinc-600 dark:hover:text-zinc-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Preliminary Data Types Shortlist (Glass-Morphism Selectable Step Buttons) */}
        <div
          id="sec-basics-datatypes"
          className="sar-glass-card relative p-6 sm:p-7 rounded-2xl border border-zinc-200/90 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3 mb-4">
            <div className="inline-flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-mono text-[11px] font-bold inline-flex items-center justify-center">
                04
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                Data Classification &amp; Sensitivity
              </span>
            </div>
            <CyberKickerTrace />
          </div>

          <h2 className="font-display text-base font-bold text-zinc-950 dark:text-white mb-1">
            Preliminary Data Types Involved (Refined in Stage 5)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Select a quick initial list of data types handled by this project:
          </p>
          <div className="flex flex-wrap gap-2.5">
            {DATA_TYPE_SHORTLIST.map((dt) => {
              const active = basics.preliminaryDataTypes.includes(dt);
              return (
                <button
                  key={dt}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => togglePrelimDataType(dt)}
                  className={`sar-glass-step-btn px-4 py-2 rounded-full border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                    active
                      ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white shadow-2xs'
                      : 'bg-white/80 dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-950 dark:hover:border-zinc-400'
                  }`}
                >
                  <span>{dt}</span>
                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Actions & Compact Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            {!flowGates.basicsComplete && !isReadOnly ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>
                  {flowGates.missingBasicsFields.length} required field{flowGates.missingBasicsFields.length > 1 ? 's' : ''} remaining
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Request Basics complete</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {showGateError && !flowGates.basicsComplete && (
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium self-center text-center">
                Please complete remaining required fields to proceed
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (!flowGates.basicsComplete && !isReadOnly) {
                  setShowGateError(true);
                  window.setTimeout(() => setShowGateError(false), 3000);
                  return;
                }
                setShowGateError(false);
                onContinueToPreliminary();
              }}
              className={`sar-glass-step-btn inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-full text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0 shadow-xs ${
                flowGates.basicsComplete || isReadOnly
                  ? 'bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <span>Continue to Preliminary Checklist</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
