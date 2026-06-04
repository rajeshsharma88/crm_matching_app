/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarChart, ShieldAlert, BadgeInfo, BellRing, Activity, CheckCircle, RefreshCw, Layers, Users, TrendingUp, Sparkles, Filter } from "lucide-react";
import { useState } from "react";
import { NotificationAlert, Discrepancy } from "../types";

interface DashboardOverviewProps {
  stats: {
    totalSource: number;
    totalCrm: number;
    matchedCount: number;
    unmatchedSourceCount: number;
    unmatchedCrmCount: number;
    blankStatusCount: number;
    duplicateCount: number;
    dataQualityScore: number;
    reconciliationScore: number;
  };
  discrepancies: Discrepancy[];
  alerts: NotificationAlert[];
  onDismissAlert: (id: string) => void;
  statusMetrics: { statusName: string; count: number; percentage: number }[];
}

export function DashboardOverview({
  stats,
  discrepancies,
  alerts,
  onDismissAlert,
  statusMetrics
}: DashboardOverviewProps) {
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filteredStatuses = statusFilter === "All" 
    ? statusMetrics 
    : statusMetrics.filter(m => m.statusName.toLowerCase() === statusFilter.toLowerCase());

  // Generate automated insights based on findings
  const generateInsights = () => {
    const list: string[] = [];
    if (stats.unmatchedSourceCount > 0) {
      list.push(`${stats.unmatchedSourceCount} advertisement leads are present in Meta but totally absent in CRM database schema.`);
    }
    if (stats.blankStatusCount > 0) {
      list.push(`There are ${stats.blankStatusCount} active records with unassigned blank Status in the CRM.`);
    }
    if (stats.duplicateCount > 0) {
      list.push(`Detected ${stats.duplicateCount} duplicate phone number records in incoming lead ads.`);
    }
    if (stats.dataQualityScore < 80) {
      list.push(`Lead data quality is at ${stats.dataQualityScore}%; discrepancies exceed SLA target of 90%.`);
    } else {
      list.push(`Lead alignment index is stellar (${stats.dataQualityScore}% quality index), indicating high-level CRM consistency.`);
    }
    return list;
  };

  const insights = generateInsights();

  // Unique types from the metrics list for status filter choice
  const uniqueStatusNames = ["All", ...statusMetrics.map(m => m.statusName || "Blank / Not Updated")];

  return (
    <div className="space-y-6" id="dashboard-overview-tab">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between" id="kpi-card-total-source flex">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source Lead Ads</span>
            <span className="p-1 px-2 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full">Meta Master</span>
          </div>
          <div className="mt-3.5">
            <p className="text-2xl font-bold text-slate-900" id="stat-total-source-value">{stats.totalSource}</p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full inline-block"></span>
              Live stream active in sandbox
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between" id="kpi-card-total-crm flex">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CRM Records</span>
            <span className="p-1 px-2 bg-sky-50 text-sky-700 text-[10px] font-bold rounded-full">Datastore</span>
          </div>
          <div className="mt-3.5">
            <p className="text-2xl font-bold text-slate-900" id="stat-total-crm-value">{stats.totalCrm}</p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-sky-400 rounded-full inline-block"></span>
              Synchronized targets
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between" id="kpi-card-data-quality flex">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Quality Score</span>
            <span className={`p-1 px-2 text-[10px] font-bold rounded-full ${stats.dataQualityScore >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {stats.dataQualityScore}%
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-2xl font-bold text-slate-900" id="stat-quality-score-value">{stats.dataQualityScore}%</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div 
                className={`h-1.5 rounded-full ${stats.dataQualityScore >= 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                style={{ width: `${stats.dataQualityScore}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between" id="kpi-card-reconciliation">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unresolved Issues</span>
            <span className="p-1 px-2 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full">
              {discrepancies.filter(d => d.resolution === "Open").length} Open
            </span>
          </div>
          <div className="mt-3.5">
            <p className="text-2xl font-bold text-slate-900" id="stat-unresolved-issues-value">
              {discrepancies.filter(d => d.resolution === "Open").length}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              From {discrepancies.length} parsed discrepancies
            </p>
          </div>
        </div>
      </div>

      {/* Sub-Metric Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-slate-50/80 border border-slate-200 p-3 rounded-lg text-center">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Matched Leads</span>
          <span className="text-xl font-bold text-emerald-600 block mt-1" id="stat-matched-count-val">{stats.matchedCount}</span>
        </div>
        <div className="bg-slate-50/80 border border-slate-200 p-3 rounded-lg text-center">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Missing in CRM</span>
          <span className="text-xl font-bold text-rose-600 block mt-1" id="stat-missing-crm-val">{stats.unmatchedSourceCount}</span>
        </div>
        <div className="bg-slate-50/80 border border-slate-200 p-3 rounded-lg text-center">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Missing in Source</span>
          <span className="text-xl font-bold text-amber-600 block mt-1" id="stat-missing-src-val">{stats.unmatchedCrmCount}</span>
        </div>
        <div className="bg-slate-50/80 border border-slate-200 p-3 rounded-lg text-center">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Duplicates</span>
          <span className="text-xl font-bold text-indigo-600 block mt-1" id="stat-duplicates-val">{stats.duplicateCount}</span>
        </div>
        <div className="bg-slate-50/80 border border-slate-200 p-3 rounded-lg text-center col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Blank Statuses</span>
          <span className="text-xl font-bold text-yellow-600 block mt-1" id="stat-blank-statuses-val">{stats.blankStatusCount}</span>
        </div>
      </div>

      {/* Main Content Grid: Status Audit and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Aspect: Status Audit */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  CRM Status Inconsistencies Audit
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Filter and review raw count status mappings below.</p>
              </div>
              
              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-600 font-medium cursor-pointer focus:outline-none"
                >
                  {uniqueStatusNames.map((n, idx) => (
                    <option key={idx} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-3.5 max-h-[280px] overflow-y-auto pr-1">
              {filteredStatuses.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No statuses match the current selection criteria.
                </div>
              ) : (
                filteredStatuses.map((m, idx) => {
                  const isGap = !m.statusName || m.statusName === "Blank / Not Updated";
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${isGap ? "text-amber-600 font-bold" : "text-slate-700"}`}>
                          {m.statusName || "Blank / Not Updated"}
                        </span>
                        <span className="text-slate-500 text-[11px] font-mono">
                          {m.count} records ({m.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${isGap ? "bg-amber-500 animate-pulse" : "bg-indigo-600"}`}
                          style={{ width: `${m.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-3.5 border-t border-slate-100 text-[10px] text-slate-400 italic">
            * Note: Records marked as "Blank" require immediate agent updates to avoid SLA breach.
          </div>
        </div>

        {/* Right Aspect: Dynamic Insights & Alerts Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Active Alerts Panel */}
          {alerts.filter(a => a.active).length > 0 && (
            <div className="bg-white rounded-xl border border-rose-100 shadow-sm p-4 text-left">
              <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 border-b border-rose-50 pb-2">
                <BellRing className="h-4 w-4 text-rose-500 animate-bounce" />
                Critical Compliance Alerts ({alerts.filter(a => a.active).length})
              </h4>
              <div className="mt-3 space-y-3">
                {alerts.filter(a => a.active).slice(0, 3).map((alert) => (
                  <div key={alert.id} className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg flex items-start gap-2 justify-between">
                    <div>
                      <p className="text-xs font-bold text-rose-900">{alert.title}</p>
                      <p className="text-[10px] text-rose-600 mt-0.5">{alert.description}</p>
                    </div>
                    <button
                      onClick={() => onDismissAlert(alert.id)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI-driven Key Insights */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl shadow-md p-5 text-white flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 border-b border-indigo-500/30 pb-3">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-300">Intelligent Executive Audit Findings</h4>
              </div>
              <ul className="mt-4 space-y-3">
                {insights.map((insight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                    <span className="p-0.5 mt-0.5 bg-indigo-500/20 rounded text-indigo-400 text-[10px] shrink-0 font-bold">
                      {(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <span className="leading-relaxed">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 pt-3 border-t border-indigo-500/30 flex items-center justify-between text-[11px] text-indigo-200 font-medium">
              <span>Automatic insights refresh</span>
              <span>v1.0 Ready</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
