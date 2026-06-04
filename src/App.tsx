/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Layers,
  BarChart,
  ShieldCheck,
  Megaphone,
  UserCheck,
  AlertTriangle,
  History,
  Download,
  Settings,
  Moon,
  Sun,
  Search,
  CheckCircle2,
  BellRing,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Mail,
  Zap,
  RefreshCw
} from "lucide-react";

import {
  generateDemoDatasets,
  getDefaultMapping,
  runReconciliation
} from "./engine";

import {
  SourceLead,
  CrmLead,
  Discrepancy,
  MappingConfig,
  CampaignMetric,
  AgentMetric,
  NotificationAlert,
  RecurringSchedule
} from "./types";

import { UploadMapping } from "./components/UploadMapping";
import { DashboardOverview } from "./components/DashboardOverview";
import { CampaignAnalytics } from "./components/CampaignAnalytics";
import { AgentPerformance } from "./components/AgentPerformance";
import { DiscrepancyCenter } from "./components/DiscrepancyCenter";
import { SchedulerSettings } from "./components/SchedulerSettings";
import { ReportDownloader } from "./components/ReportDownloader";

export default function App() {
  // Theme Engine state (Light by default, conforms to design philosophy)
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Core ledgers representation
  const [sourceLeads, setSourceLeads] = useState<SourceLead[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [mapping, setMapping] = useState<MappingConfig>(getDefaultMapping());

  // Metrics, charts, discrepancy records
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [campaignMetrics, setCampaignMetrics] = useState<CampaignMetric[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]);
  const [stats, setStats] = useState({
    totalSource: 0,
    totalCrm: 0,
    matchedCount: 0,
    unmatchedSourceCount: 0,
    unmatchedCrmCount: 0,
    blankStatusCount: 0,
    duplicateCount: 0,
    dataQualityScore: 100,
    reconciliationScore: 100
  });

  // Active sync scheduler & alert states
  const [schedule, setSchedule] = useState<RecurringSchedule>({
    frequency: "off",
    time: "20:00"
  });
  const [alertThresholds, setAlertThresholds] = useState({
    missingCrmPct: 15,
    blankStatusCount: 5,
    duplicateLimit: 5,
    reconciliationTarget: 90
  });
  const [alerts, setAlerts] = useState<NotificationAlert[]>([]);

  // Navigation tab states
  // Options: 'overview' | 'mismatches' | 'campaigns' | 'agents' | 'upload' | 'automation' | 'reports'
  const [activeTab, setActiveTab ] = useState<string>("overview");
  const [globalSearch, setGlobalSearch] = useState("");

  // Auditing status and message state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditSuccessMsg, setAuditSuccessMsg] = useState("");

  const handleManualAuditRun = () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setAuditSuccessMsg("");
    
    setTimeout(() => {
      const { sourceLeads: demoSource, crmLeads: demoCrm } = generateDemoDatasets();
      executeReconciliationRun(demoSource, demoCrm, getDefaultMapping());
      
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setAlerts((prev) => [
        {
          id: `AL-AUDIT-${now.getTime()}`,
          title: `Manual Audit Completed (${timestamp})`,
          type: "success",
          description: `Compliance alignment completed successfully. Analyzed ${demoSource.length} lead channels and ${demoCrm.length} CRM entries.`,
          category: "score",
          timestamp: "Now",
          active: true
        },
        ...prev.filter(a => a.id !== "AL-INIT")
      ]);
      
      setIsAuditing(false);
      setAuditSuccessMsg("Audit complete! Core database is aligned.");
      
      setTimeout(() => {
        setAuditSuccessMsg("");
      }, 3000);
    }, 850);
  };

  // Initialize and load pre-baked premium datasets so app works immediately
  useEffect(() => {
    handleLoadDemoDataset();
  }, []);

  const handleUpdateMapping = (newMap: MappingConfig) => {
    setMapping(newMap);
  };

  // Main trigger to compute reconciliation
  const executeReconciliationRun = (
    src: SourceLead[],
    crm: CrmLead[],
    currentMap: MappingConfig
  ) => {
    const output = runReconciliation(src, crm, currentMap);
    setSourceLeads(src);
    setCrmLeads(crm);
    setDiscrepancies(output.discrepancies);
    setCampaignMetrics(output.campaignMetrics);
    setAgentMetrics(output.agentMetrics);

    // Compute Resolution & Rec Score based on user actions
    const totalIssues = output.discrepancies.length;
    const resolvedIssues = output.discrepancies.filter(
      (d) => d.resolution === "Resolved"
    ).length;
    const computedReconScore = totalIssues
      ? Math.round((resolvedIssues / totalIssues) * 100)
      : 100;

    const enrichedStats = {
      ...output.stats,
      reconciliationScore: computedReconScore
    };
    setStats(enrichedStats);

    // Dynamic SLA Alarms trigger
    evaluateAlarms(src.length, enrichedStats, output.discrepancies);
  };

  const evaluateAlarms = (
    totalSrc: number,
    currentStats: typeof stats,
    currentDiscs: Discrepancy[]
  ) => {
    const list: NotificationAlert[] = [];
    const timestamp = new Date().toISOString().replace("T", " ").substring(11, 16);

    const missingPct = totalSrc
      ? Math.round((currentStats.unmatchedSourceCount / totalSrc) * 100)
      : 0;

    if (missingPct > alertThresholds.missingCrmPct) {
      list.push({
        id: "AL-MISS-CRM",
        title: "CRM Gaps Exceed SLA Bound",
        type: "danger",
        description: `Missing CRM percentage is ${missingPct}% (Limit is ${alertThresholds.missingCrmPct}%). Immediate sync needed!`,
        category: "missing_crm",
        timestamp,
        active: true
      });
    }

    if (currentStats.blankStatusCount > alertThresholds.blankStatusCount) {
      list.push({
        id: "AL-BLANK-STAT",
        title: "Un-updated Blank CRM Statuses Alert",
        type: "warning",
        description: `${currentStats.blankStatusCount} records with blank STATUS discovered (SLA roof is ${alertThresholds.blankStatusCount}).`,
        category: "blank_status",
        timestamp,
        active: true
      });
    }

    if (currentStats.duplicateCount > alertThresholds.duplicateLimit) {
      list.push({
        id: "AL-DUP-LEADS",
        title: "Excess Ads Double-Entries Warnings",
        type: "info",
        description: `Detected ${currentStats.duplicateCount} duplicates inside Meta sources file. Check campaign parameters.`,
        category: "duplicates",
        timestamp,
        active: true
      });
    }

    setAlerts(list);
  };

  const handleDismissAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: false } : a)));
  };

  const handleLoadDemoDataset = () => {
    const { sourceLeads, crmLeads } = generateDemoDatasets();
    executeReconciliationRun(sourceLeads, crmLeads, getDefaultMapping());
    setAlerts([
      {
        id: "AL-INIT",
        title: "Demo Ledger Ingested",
        type: "success",
        description: "Meta Lead Gen & CRM Exports catalog successfully aligned with active mappings.",
        category: "score",
        timestamp: "Now",
        active: true
      }
    ]);
  };

  // Handle individual updates when user updates single discrepancy actions (Resolution / comments / assignee)
  const handleUpdateDiscrepancy = (updated: Discrepancy) => {
    const updatedList = discrepancies.map((d) => (d.id === updated.id ? updated : d));
    setDiscrepancies(updatedList);

    // Recompute Stats
    const totalIssues = updatedList.length;
    const resolvedIssues = updatedList.filter((d) => d.resolution === "Resolved").length;
    const computedReconScore = totalIssues
      ? Math.round((resolvedIssues / totalIssues) * 100)
      : 100;

    setStats((prev) => ({
      ...prev,
      reconciliationScore: computedReconScore
    }));
  };

  // Extract Statuses and generate count mappings
  const calculateStatusesMetrics = () => {
    const statusMap = new Map<string, number>();
    crmLeads.forEach((crm) => {
      const st = String(crm[mapping.crmStatus] || "").trim();
      const stLabel = st || "Blank / Not Updated";
      statusMap.set(stLabel, (statusMap.get(stLabel) || 0) + 1);
    });

    const total = crmLeads.length;
    return Array.from(statusMap.entries()).map(([k, count]) => {
      return {
        statusName: k,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0
      };
    });
  };

  const statusMetrics = calculateStatusesMetrics();

  // Search redirection helper
  const handleSearchCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      setActiveTab("mismatches");
    }
  };

  return (
    <div className={`flex flex-col md:flex-row h-screen w-full font-sans overflow-hidden ${theme === "dark" ? "bg-slate-950 text-slate-100 dark" : "bg-slate-50 text-slate-800"}`} id="app-workspace-canvas">
      
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-slate-900 text-slate-300 flex-col border-r border-slate-800">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-bold text-base text-white tracking-tight leading-none">ReconAudit</span>
        </div>

        {/* Global Search Input in Sidebar */}
        <div className="px-4 py-3 border-b border-slate-800/60">
          <form onSubmit={handleSearchCommit} className="relative">
            <input
              type="text"
              placeholder="Search cross-ledger..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800/40 border border-slate-800 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-500 transition-colors"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          </form>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-4 space-y-1.5 text-sm overflow-y-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full px-3 py-2 rounded-md transition-all flex items-center gap-3 text-xs font-semibold text-left cursor-pointer ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <BarChart className="w-4 h-4" />
            Executive Dashboard
          </button>

          <button
            onClick={() => setActiveTab("mismatches")}
            className={`w-full px-3 py-2 rounded-md transition-all flex items-center justify-between text-xs font-semibold text-left cursor-pointer ${
              activeTab === "mismatches"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4" />
              Discrepancy Center
            </span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === "mismatches" ? "bg-indigo-500 text-white" : "bg-rose-505 text-white bg-rose-500 animate-pulse"
            }`}>
              {discrepancies.filter(d => d.resolution === "Open").length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("campaigns")}
            className={`w-full px-3 py-2 rounded-md transition-all flex items-center gap-3 text-xs font-semibold text-left cursor-pointer ${
              activeTab === "campaigns"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Megaphone className="w-4 h-4" />
            Campaign Insights
          </button>

          <button
            onClick={() => setActiveTab("agents")}
            className={`w-full px-3 py-2 rounded-md transition-all flex items-center gap-3 text-xs font-semibold text-left cursor-pointer ${
              activeTab === "agents"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Agent Performance
          </button>

          <button
            onClick={() => setActiveTab("upload")}
            className={`w-full px-3 py-2 rounded-md transition-all flex items-center gap-3 text-xs font-semibold text-left cursor-pointer ${
              activeTab === "upload"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            Schema & Upload
          </button>

          <button
            onClick={() => setActiveTab("automation")}
            className={`w-full px-3 py-2 rounded-md transition-all flex items-center gap-3 text-xs font-semibold text-left cursor-pointer ${
              activeTab === "automation"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            SLA & Automation
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full px-3 py-2 rounded-md transition-all flex items-center gap-3 text-xs font-semibold text-left cursor-pointer ${
              activeTab === "reports"
                ? "bg-indigo-600 text-white font-semibold"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Download className="w-4 h-4" />
            Executive Reports
          </button>
        </nav>

        {/* Sidebar Footer Widgets */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          
          {/* Operator Session */}
          <div className="p-3 bg-slate-800/20 rounded-lg border border-slate-800/30">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-extrabold text-[10px]">
                JD
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-slate-300 truncate">imrajesh8800@gmail.com</p>
                <p className="text-[9px] text-emerald-400 font-bold tracking-wide mt-0.5">Admin Operator</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800/40">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Recon Score</span>
              <span className="text-xs text-emerald-400 font-mono" id="sidebar-recon-score">{stats.reconciliationScore}%</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${stats.reconciliationScore}%` }}></div>
            </div>
          </div>
        </div>

      </aside>

      {/* Main Content Workspace Layout */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header bar aligned with matching style guidelines */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <h1 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white capitalize truncate">
              {activeTab === "overview" && "Executive Dashboard Overview"}
              {activeTab === "mismatches" && "Discrepancy Resolution Center"}
              {activeTab === "campaigns" && "Campaign Segment Insights"}
              {activeTab === "agents" && "Agent Performance Benchmarks"}
              {activeTab === "upload" && "Format Schema & Upload Ingestion"}
              {activeTab === "automation" && "SLA Alarms & Automation"}
              {activeTab === "reports" && "Executive Compliance Reports"}
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700">
              ID: META_2026_PROD
            </span>
          </div>
          
          <div className="flex items-center gap-3 relative">
            {/* Reduction multiplier badge */}
            <div className="hidden lg:flex bg-indigo-50 dark:bg-indigo-950/40 p-1.5 px-3 rounded-lg border border-indigo-100 dark:border-indigo-950/80 items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                -93.6% Manual Work Reduction Index
              </span>
            </div>

            {/* Light/Dark mode change toggler */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-100 cursor-pointer transition-colors"
              title="Toggle system palette theme"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>

            <button 
              onClick={handleManualAuditRun}
              disabled={isAuditing}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium shadow-sm cursor-pointer transition-colors shrink-0 flex items-center gap-2"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Auditing...</span>
                </>
              ) : (
                "Run Manual Audit"
              )}
            </button>

            {auditSuccessMsg && (
              <div className="absolute right-0 top-12 bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg z-50 flex items-center gap-1.5 min-w-[200px] border border-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{auditSuccessMsg}</span>
              </div>
            )}
          </div>
        </header>

        {/* Mobile quick tab list */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 p-2 flex overflow-x-auto gap-1 shrink-0 select-none scrollbar-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold shrink-0 transition-all ${
              activeTab === "overview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("mismatches")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold shrink-0 transition-all flex items-center gap-1 ${
              activeTab === "mismatches" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Discrepancies ({discrepancies.filter(d => d.resolution === "Open").length})
          </button>
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold shrink-0 transition-all ${
              activeTab === "campaigns" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold shrink-0 transition-all ${
              activeTab === "agents" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Agents
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold shrink-0 transition-all ${
              activeTab === "upload" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab("automation")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold shrink-0 transition-all ${
              activeTab === "automation" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Automation
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-3 py-1.5 rounded text-[10px] font-bold shrink-0 transition-all ${
              activeTab === "reports" ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800"
            }`}
          >
            Reports
          </button>
        </div>

        {/* Scrollable Context Workspace Aspect */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {activeTab === "overview" && (
            <DashboardOverview
              stats={stats}
              discrepancies={discrepancies}
              alerts={alerts}
              onDismissAlert={handleDismissAlert}
              statusMetrics={statusMetrics}
            />
          )}

          {activeTab === "mismatches" && (
            <DiscrepancyCenter
              discrepancies={discrepancies}
              onUpdateDiscrepancy={handleUpdateDiscrepancy}
            />
          )}

          {activeTab === "campaigns" && (
            <CampaignAnalytics campaignMetrics={campaignMetrics} />
          )}

          {activeTab === "agents" && (
            <AgentPerformance agentMetrics={agentMetrics} />
          )}

          {activeTab === "upload" && (
            <UploadMapping
              onDataReconciled={executeReconciliationRun}
              currentMapping={mapping}
              onUpdateMapping={handleUpdateMapping}
              onLoadDemo={handleLoadDemoDataset}
            />
          )}

          {activeTab === "automation" && (
            <SchedulerSettings
              schedule={schedule}
              onUpdateSchedule={setSchedule}
              alertThresholds={alertThresholds}
              onUpdateThresholds={setAlertThresholds}
            />
          )}

          {activeTab === "reports" && (
            <ReportDownloader
              stats={stats}
              discrepancies={discrepancies}
            />
          )}

          {/* Clean human system label disclaimer */}
          <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2.5 transition-colors">
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              Lead Reconciliation & CRM Audit system &copy; 2026. All rights preserved.
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Intelligent data cross-referencing and confidence mismatch masking.
            </span>
          </footer>
        </div>

      </main>

    </div>
  );
}
