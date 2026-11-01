import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  validateApiEndpointRow,
  validateFirewallRuleRow,
  validateIntegrationRow,
} from '../shared/rulesEngine';
import {
  ApiEndpointRow,
  FirewallRuleRow,
  IntegrationRow,
  RepeaterTablesData,
  RepeaterTableType,
} from '../shared/types';

interface RepeaterTableEditorsProps {
  tableType: RepeaterTableType;
  tables: RepeaterTablesData;
  internetFacing: boolean;
  isReadOnly: boolean;
  onUpdateTables: (next: RepeaterTablesData) => void;
}

export const RepeaterTableEditors: React.FC<RepeaterTableEditorsProps> = ({
  tableType,
  tables,
  internetFacing,
  isReadOnly,
  onUpdateTables,
}) => {
  const [envFilter, setEnvFilter] = useState<string>('ALL');

  // Servers & VMs table is not required
  if (tableType === 'servers') {
    return null;
  }

  // ---------------- 1. FIREWALL RULES REPEATER TABLE ----------------
  if (tableType === 'firewall_rules') {
    const filtered = tables.firewall_rules.filter(
      (f) => envFilter === 'ALL' || f.environment === envFilter
    );

    const addRow = () => {
      const next: FirewallRuleRow = {
        id: `fw-${Date.now()}`,
        source: '10.18.2.0/24',
        destination: '10.42.16.0/24',
        port: '443',
        protocol: 'HTTPS',
        direction: 'Inbound',
        purpose: 'Reverse proxy to application tier',
        environment: 'Production',
      };
      onUpdateTables({ ...tables, firewall_rules: [...tables.firewall_rules, next] });
    };

    const updateRow = (id: string, patch: Partial<FirewallRuleRow>) => {
      onUpdateTables({
        ...tables,
        firewall_rules: tables.firewall_rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      });
    };

    const duplicateRow = (row: FirewallRuleRow) => {
      onUpdateTables({
        ...tables,
        firewall_rules: [...tables.firewall_rules, { ...row, id: `fw-${Date.now()}` }],
      });
    };

    const deleteRow = (id: string) => {
      onUpdateTables({
        ...tables,
        firewall_rules: tables.firewall_rules.filter((r) => r.id !== id),
      });
    };

    return (
      <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
              Network Firewall Rules &amp; Port Matrix ({tables.firewall_rules.length} rules)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter source and destination IP/CIDR ranges, ports, protocols, and traffic purpose.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs"
            >
              <option value="ALL">All Environments</option>
              <option value="Production">Production</option>
              <option value="DR">DR</option>
              <option value="UAT">UAT</option>
              <option value="Development">Development</option>
            </select>
            {!isReadOnly && (
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Firewall Rule</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <th className="py-2.5 px-2">Env</th>
                <th className="py-2.5 px-2">Direction</th>
                <th className="py-2.5 px-2">Source IP/CIDR</th>
                <th className="py-2.5 px-2">Destination IP/CIDR</th>
                <th className="py-2.5 px-2">Port(s)</th>
                <th className="py-2.5 px-2">Protocol</th>
                <th className="py-2.5 px-2">Purpose</th>
                <th className="py-2.5 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-400">
                    No firewall rules entered. Click &ldquo;Add Firewall Rule&rdquo; to add a rule.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const issues = validateFirewallRuleRow(
                    row,
                    tables.firewall_rules,
                    internetFacing
                  );
                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40">
                        <td className="py-2 px-2">
                          <select
                            disabled={isReadOnly}
                            value={row.environment}
                            onChange={(e) =>
                              updateRow(row.id, {
                                environment: e.target.value as FirewallRuleRow['environment'],
                              })
                            }
                            className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                          >
                            <option value="Production">Prod</option>
                            <option value="DR">DR</option>
                            <option value="UAT">UAT</option>
                            <option value="Development">Dev</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            disabled={isReadOnly}
                            value={row.direction}
                            onChange={(e) =>
                              updateRow(row.id, {
                                direction: e.target.value as FirewallRuleRow['direction'],
                              })
                            }
                            className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                          >
                            <option value="Inbound">Inbound</option>
                            <option value="Outbound">Outbound</option>
                            <option value="Bidirectional">Bidirectional</option>
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={row.source}
                            onChange={(e) => updateRow(row.id, { source: e.target.value })}
                            className="w-34 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent font-mono text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={row.destination}
                            onChange={(e) => updateRow(row.id, { destination: e.target.value })}
                            className="w-34 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent font-mono text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={row.port}
                            onChange={(e) => updateRow(row.id, { port: e.target.value })}
                            className="w-20 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent font-mono text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <select
                            disabled={isReadOnly}
                            value={row.protocol}
                            onChange={(e) =>
                              updateRow(row.id, {
                                protocol: e.target.value as FirewallRuleRow['protocol'],
                              })
                            }
                            className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
                          >
                            {['HTTPS', 'TCP', 'SSH', 'SFTP', 'TLS', 'SMTP', 'UDP', 'Custom'].map(
                              (p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            disabled={isReadOnly}
                            value={row.purpose}
                            onChange={(e) => updateRow(row.id, { purpose: e.target.value })}
                            className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs"
                          />
                        </td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {!isReadOnly && (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => duplicateRow(row)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteRow(row.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {issues.length > 0 && (
                        <tr>
                          <td colSpan={8} className="pb-2 px-2">
                            <div className="flex flex-wrap gap-3">
                              {issues.map((iss, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 text-[11px] ${
                                    iss.severity === 'error'
                                      ? 'text-red-600 font-semibold'
                                      : 'text-amber-700 dark:text-amber-400'
                                  }`}
                                >
                                  {iss.severity === 'error' ? (
                                    <AlertCircle className="w-3 h-3" />
                                  ) : (
                                    <AlertTriangle className="w-3 h-3" />
                                  )}
                                  <span>{iss.message}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------------- 2. API ENDPOINTS & INTEGRATIONS TABLES ----------------
  if (tableType === 'api_endpoints') {
    const addEndpoint = () => {
      const next: ApiEndpointRow = {
        id: `api-${Date.now()}`,
        name: '/api/v1/payments/verify',
        method: 'POST',
        authType: 'OAuth2 / OIDC',
        dataClassification: 'Confidential',
        exposure: 'API Gateway (External)',
      };
      onUpdateTables({ ...tables, api_endpoints: [...tables.api_endpoints, next] });
    };

    const updateEndpoint = (id: string, patch: Partial<ApiEndpointRow>) => {
      onUpdateTables({
        ...tables,
        api_endpoints: tables.api_endpoints.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      });
    };

    const deleteEndpoint = (id: string) => {
      onUpdateTables({
        ...tables,
        api_endpoints: tables.api_endpoints.filter((a) => a.id !== id),
      });
    };

    return (
      <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
              API Endpoints Inventory ({tables.api_endpoints.length} endpoints)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Document key API paths, methods, authentication mechanisms, and network exposure.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isReadOnly && (
              <button
                type="button"
                onClick={addEndpoint}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add API Endpoint</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <th className="py-2.5 px-2">URI Path / Service Name</th>
                <th className="py-2.5 px-2">Method</th>
                <th className="py-2.5 px-2">Authentication</th>
                <th className="py-2.5 px-2">Data Classification</th>
                <th className="py-2.5 px-2">Network Exposure</th>
                <th className="py-2.5 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
              {tables.api_endpoints.map((row) => {
                const issues = validateApiEndpointRow(row);
                return (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={row.name}
                          onChange={(e) => updateEndpoint(row.id, { name: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <select
                          disabled={isReadOnly}
                          value={row.method}
                          onChange={(e) =>
                            updateEndpoint(row.id, {
                              method: e.target.value as ApiEndpointRow['method'],
                            })
                          }
                          className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs"
                        >
                          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'GraphQL', 'gRPC'].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          disabled={isReadOnly}
                          value={row.authType}
                          onChange={(e) =>
                            updateEndpoint(row.id, {
                              authType: e.target.value as ApiEndpointRow['authType'],
                            })
                          }
                          className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        >
                          {[
                            'OAuth2 / OIDC',
                            'mTLS',
                            'API Key',
                            'JWT Bearer',
                            'Basic Auth',
                            'None (Public)',
                          ].map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          disabled={isReadOnly}
                          value={row.dataClassification}
                          onChange={(e) =>
                            updateEndpoint(row.id, {
                              dataClassification: e.target.value as ApiEndpointRow['dataClassification'],
                            })
                          }
                          className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        >
                          {['Public', 'Internal', 'Confidential', 'Sensitive'].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <select
                          disabled={isReadOnly}
                          value={row.exposure}
                          onChange={(e) =>
                            updateEndpoint(row.id, {
                              exposure: e.target.value as ApiEndpointRow['exposure'],
                            })
                          }
                          className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                        >
                          {[
                            'Internal Only',
                            'API Gateway (External)',
                            'Direct Internet',
                            'Partner VPN',
                          ].map((ex) => (
                            <option key={ex} value={ex}>
                              {ex}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => deleteEndpoint(row.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {issues.length > 0 && (
                      <tr>
                        <td colSpan={6} className="pb-2 px-2">
                          {issues.map((iss, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 mr-4"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>{iss.message}</span>
                            </span>
                          ))}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------------- 3. SYSTEM INTEGRATIONS REPEATER TABLE ----------------
  const addIntegration = () => {
    const next: IntegrationRow = {
      id: `int-${Date.now()}`,
      counterparty: 'External Counterparty / Vendor',
      direction: 'Outbound',
      channel: 'REST API',
      frequency: 'Real-time',
      dataShared: 'Encrypted customer reference & transaction status',
    };
    onUpdateTables({ ...tables, integrations: [...tables.integrations, next] });
  };

  const updateIntegration = (id: string, patch: Partial<IntegrationRow>) => {
    onUpdateTables({
      ...tables,
      integrations: tables.integrations.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  };

  const deleteIntegration = (id: string) => {
    onUpdateTables({
      ...tables,
      integrations: tables.integrations.filter((i) => i.id !== id),
    });
  };

  return (
    <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
            External &amp; Internal System Integrations ({tables.integrations.length} rows)
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Counterparties, data direction, channels, and batch/real-time frequencies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isReadOnly && (
            <button
              type="button"
              onClick={addIntegration}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Integration</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
              <th className="py-2.5 px-2">Counterparty / System</th>
              <th className="py-2.5 px-2">Direction</th>
              <th className="py-2.5 px-2">Channel</th>
              <th className="py-2.5 px-2">Frequency</th>
              <th className="py-2.5 px-2">Data Elements Shared</th>
              <th className="py-2.5 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
            {tables.integrations.map((row) => {
              const issues = validateIntegrationRow(row);
              return (
                <React.Fragment key={row.id}>
                  <tr>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.counterparty}
                        onChange={(e) => updateIntegration(row.id, { counterparty: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        disabled={isReadOnly}
                        value={row.direction}
                        onChange={(e) =>
                          updateIntegration(row.id, {
                            direction: e.target.value as IntegrationRow['direction'],
                          })
                        }
                        className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      >
                        <option value="Inbound">Inbound</option>
                        <option value="Outbound">Outbound</option>
                        <option value="Bidirectional">Bidirectional</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        disabled={isReadOnly}
                        value={row.channel}
                        onChange={(e) =>
                          updateIntegration(row.id, {
                            channel: e.target.value as IntegrationRow['channel'],
                          })
                        }
                        className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      >
                        {[
                          'REST API',
                          'SFTP / File',
                          'Kafka / Queue',
                          'Webhook',
                          'DB Link',
                          'SOAP',
                        ].map((ch) => (
                          <option key={ch} value={ch}>
                            {ch}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        disabled={isReadOnly}
                        value={row.frequency}
                        onChange={(e) =>
                          updateIntegration(row.id, {
                            frequency: e.target.value as IntegrationRow['frequency'],
                          })
                        }
                        className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      >
                        {[
                          'Real-time',
                          'Hourly Batch',
                          'Daily Nightly',
                          'Weekly',
                          'On-Demand',
                        ].map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={row.dataShared}
                        onChange={(e) => updateIntegration(row.id, { dataShared: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => deleteIntegration(row.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                  {issues.length > 0 && (
                    <tr>
                      <td colSpan={6} className="pb-2 px-2 text-red-600 text-[11px]">
                        {issues.map((i) => i.message).join(' ')}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
