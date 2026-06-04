/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Download, FileText, CheckCircle, Table, BrainCircuit, Activity } from "lucide-react";
import { Discrepancy } from "../types";

interface ReportDownloaderProps {
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
}

export function ReportDownloader({ stats, discrepancies }: ReportDownloaderProps) {
  
  // Calculate resolved fraction
  const totalIssues = discrepancies.length;
  const resolvedIssues = discrepancies.filter(d => d.resolution === "Resolved").length;
  const reconScoreVal = totalIssues ? Math.round((resolvedIssues / totalIssues) * 100) : 100;

  // Key findings
  const findings = [
    `${stats.unmatchedSourceCount} advertisement leads missing completely in CRM datastore schema.`,
    `${stats.blankStatusCount} matched records containing blank or unassigned values in CRM Status metrics.`,
    `${stats.duplicateCount} duplicate phone number records detected in Social advertisements file.`,
    `${stats.matchedCount} perfectly matched cross-referenced rows processed using intelligent masking math.`
  ];

  // Secure client-side formatted CSV triggers
  const downloadSummaryCsv = () => {
    const rows = [
      ["METRIC VARIABLE NAME", "RECORD VALUE", "COMPLIANCE ASSESSMENT WEIGHT"],
      ["Total Meta Source Leads", stats.totalSource, "100.00%"],
      ["Total CRM Managed Leads", stats.totalCrm, "Reference Ledger"],
      ["Perfect Matched Records", stats.matchedCount, `${stats.dataQualityScore}% Alignment`],
      ["Missing CRM Records (Gaps)", stats.unmatchedSourceCount, "Action required"],
      ["Missing Status Records (Gaps)", stats.blankStatusCount, "High priority"],
      ["Lead Ads Double Entries", stats.duplicateCount, "Low priority"],
      ["Calculated Data Quality Index", `${stats.dataQualityScore}%`, "SLA target is 90%"],
      ["Reconciliation Resolution Index", `${reconScoreVal}%`, `${resolvedIssues} of ${totalIssues} cases resolved`]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Lead_Reconciliation_Executive_Summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadGapsCsv = () => {
    const headers = ["CASE ID", "GAP TYPE", "SEVERITY", "OWNER", "RESOLUTION", "DETAILS", "NOTES"];
    const rows = [headers];

    discrepancies.forEach(d => {
      rows.push([
        d.id,
        d.type,
        d.severity,
        d.assignedTo || "Unassigned",
        d.resolution,
        d.details,
        d.notes || "None"
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Reconciliation_Gap_Ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdfReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-left" id="report-downloader-tab">
      
      {/* Executive Overview Design Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-4.5 w-4.5 text-indigo-600" />
              Corporate Executive Audit Ledger Report
            </h2>
            <p className="text-[10px] text-slate-400 mt-1">Generated dynamically for matching audits in progress.</p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={handlePrintPdfReport}
              className="px-4 py-2 bg-slate-950 text-white hover:bg-slate-800 text-xs font-semibold rounded-lg shrink-0 cursor-pointer flex items-center gap-1 transition-all"
            >
              Print Executive Summary PDF
            </button>
            <button
              onClick={downloadSummaryCsv}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shrink-0 cursor-pointer flex items-center gap-1 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Download Summary CSV
            </button>
          </div>
        </div>

        {/* Quick scorecard display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alignment Index</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1" id="report-quality-score">{stats.dataQualityScore}%</p>
            <span className="text-[9px] text-slate-400 mt-1 block">Matched / Source</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution Index</span>
            <p className="text-xl font-extrabold text-slate-800 mt-1" id="report-recon-score">{reconScoreVal}%</p>
            <span className="text-[9px] text-slate-400 mt-1 block">Resolved / Total</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source Volume</span>
            <p className="text-xl font-extrabold text-indigo-600 mt-1">{stats.totalSource}</p>
            <span className="text-[9px] text-slate-400 mt-1 block">Meta records</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center font-semibold">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CRM Catalog</span>
            <p className="text-xl font-extrabold text-sky-600 mt-1">{stats.totalCrm}</p>
            <span className="text-[9px] text-slate-400 mt-1 block">Target elements</span>
          </div>
        </div>
      </div>

      {/* Insight Section and CSV ledger downloads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Dynamic Observations Row */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 text-left space-y-4">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <BrainCircuit className="h-4 w-4 text-indigo-500 animate-pulse" />
            Core Analytics Observations
          </h3>

          <ul className="space-y-3">
            {findings.map((f, i) => (
              <li key={i} className="flex gap-2 text-xs font-medium text-slate-600 items-start">
                <CheckCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action downloads block */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 text-left space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Table className="h-4 w-4 text-indigo-500" />
              Formatted Ledger Actions
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Generate fully formatted CSV exports containing either aggregated summary variables or detailed row-by-row gap listings for easy import into Microsoft Excel or Google Sheets.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <button
              onClick={downloadGapsCsv}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer flex items-center justify-center gap-2"
              id="download-gaps-csv-btn"
            >
              <Download className="h-4 w-4" />
              Export Detailed Reconciliation Gaps Data (CSV)
            </button>
            <p className="text-[9px] text-slate-400 text-center italic">
              * Gap data lists all mismatches, blank statuses, duplicates and categories.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
