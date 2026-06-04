/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { MappingConfig } from "../types";
import { read, utils } from "xlsx";

interface UploadMappingProps {
  onDataReconciled: (sourceLeads: any[], crmLeads: any[], mapping: MappingConfig) => void;
  currentMapping: MappingConfig;
  onUpdateMapping: (mapping: MappingConfig) => void;
  onLoadDemo: () => void;
}

export function UploadMapping({
  onDataReconciled,
  currentMapping,
  onUpdateMapping,
  onLoadDemo
}: UploadMappingProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [crmFile, setCrmFile] = useState<File | null>(null);

  const [sourceData, setSourceData] = useState<any[]>([]);
  const [crmData, setCrmData] = useState<any[]>([]);

  const [sourceHeaders, setSourceHeaders] = useState<string[]>([]);
  const [crmHeaders, setCrmHeaders] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isMappingMode, setIsMappingMode] = useState(false);

  const sourceFileInput = useRef<HTMLInputElement>(null);
  const crmFileInput = useRef<HTMLInputElement>(null);

  // Parse files securely on client side with xlsx parser
  const parseFile = (file: File, isSource: boolean) => {
    setLoading(true);
    setErrorStatus(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Invalid file content read.");

        let parsedRows: any[] = [];
        const nameLower = file.name.toLowerCase();

        if (nameLower.endsWith(".csv")) {
          // Fast CSV direct text parsing
          const text = new TextDecoder().decode(data as ArrayBuffer);
          const lines = text.split(/\r?\n/);
          if (lines.length > 0) {
            const headers = lines[0].split(",");
            const headersClean = headers.map(h => h.replace(/^["']|["']$/g, "").trim());
            
            for (let i = 1; i < lines.length; i++) {
              if (!lines[i].trim()) continue;
              const cols = lines[i].split(",");
              const row: any = {};
              headersClean.forEach((h, idx) => {
                row[h] = cols[idx] ? cols[idx].replace(/^["']|["']$/g, "").trim() : "";
              });
              parsedRows.push(row);
            }
            if (isSource) {
              setSourceHeaders(headersClean);
              setSourceData(parsedRows);
            } else {
              setCrmHeaders(headersClean);
              setCrmData(parsedRows);
            }
          }
        } else {
          // Excel parser
          const workbook = read(new Uint8Array(data as ArrayBuffer), { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedRows = utils.sheet_to_json(worksheet, { defval: "" });

          if (parsedRows.length > 0) {
            const headers = Object.keys(parsedRows[0]);
            if (isSource) {
              setSourceHeaders(headers);
              setSourceData(parsedRows);
            } else {
              setCrmHeaders(headers);
              setCrmData(parsedRows);
            }
          }
        }

        // Auto Map guessings based on common keywords
        if (isSource) {
          setSourceFile(file);
        } else {
          setCrmFile(file);
        }
      } catch (err: any) {
        setErrorStatus(`File parsing failure: ${err.message || "Unknown schema"}`);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0], true);
    }
  };

  const handleCrmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0], false);
    }
  };

  // Automated column detection matching
  const autoMapHeaders = () => {
    if (sourceHeaders.length === 0 || crmHeaders.length === 0) return;

    const newMapping = { ...currentMapping };

    // Guesses for source Lead Ads file
    sourceHeaders.forEach(h => {
      const hl = h.toLowerCase();
      if (hl.includes("created") || hl.includes("time") || hl.includes("date")) newMapping.sourceTime = h;
      if (hl.includes("campaign") || hl.includes("adgroup")) newMapping.sourceCampaign = h;
      if (hl.includes("name") || hl.includes("full") || hl.includes("customer")) newMapping.sourceName = h;
      if (hl.includes("mobile") || hl.includes("phone") || hl.includes("contact") || hl.includes("no") || hl.includes("num")) newMapping.sourceMobile = h;
      if (hl.includes("id")) newMapping.sourceId = h;
      if (hl.includes("city") || hl.includes("location") || hl.includes("address")) newMapping.sourceCity = h;
    });

    // Guesses for CRM export file
    crmHeaders.forEach(h => {
      const hl = h.toLowerCase();
      if (hl.includes("lead") && hl.includes("id")) newMapping.crmId = h;
      if (hl.includes("name") || hl.includes("customer") || hl.includes("full")) newMapping.crmName = h;
      if (hl.includes("mobile") || hl.includes("phone") || hl.includes("contact") || hl.includes("number")) newMapping.crmMobile = h;
      if (hl.includes("status") || hl.includes("state")) newMapping.crmStatus = h;
      if (hl.includes("remark") || hl.includes("note") || hl.includes("comment")) newMapping.crmRemark = h;
      if (hl.includes("agent") || hl.includes("sales")) newMapping.crmAgent = h;
    });

    onUpdateMapping(newMapping);
  };

  const handleExecReconciliation = () => {
    if (sourceData.length === 0 || crmData.length === 0) {
      setErrorStatus("Please load or drop both files before executing the audit reconciliation.");
      return;
    }
    setErrorStatus(null);
    onDataReconciled(sourceData, crmData, currentMapping);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden" id="upload-mapping-module">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            File Ingestion & Custom Schema Mapping
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Reconcile up to 100,000 lead records. Auto-detect formats, mapping schemes, & trigger the confidence engine.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onLoadDemo}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            id="load-demo-dataset-btn"
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-500 animate-spin-hover" />
            Load Sample Sandbox Dataset
          </button>
        </div>
      </div>

      <div className="p-6">
        {errorStatus && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File 1: Source Lead Ads */}
          <div className="border border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleSourceChange}
              ref={sourceFileInput}
              className="hidden"
            />
            {sourceFile ? (
              <div className="w-full">
                <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg mb-4 text-left">
                  <FileSpreadsheet className="h-8 w-8 text-indigo-600 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-semibold text-xs text-slate-800 truncate" id="source-filename-label">{sourceFile.name}</p>
                    <p className="text-[10px] text-indigo-600 font-medium mt-0.5" id="source-record-count-badge">
                      {(sourceFile.size / 1024).toFixed(1)} KB | {sourceData.length} active leads loaded
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-indigo-600 ml-auto shrink-0" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Detected Columns ({sourceHeaders.length})</p>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                    {sourceHeaders.slice(0, 15).map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-mono border border-slate-200">
                        {h}
                      </span>
                    ))}
                    {sourceHeaders.length > 15 && <span className="text-[9px] text-slate-400 font-medium">+{sourceHeaders.length - 15} more</span>}
                  </div>
                </div>
                <button
                  onClick={() => sourceFileInput.current?.click()}
                  className="mt-4 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                >
                  Change Source Lead File
                </button>
              </div>
            ) : (
              <div className="cursor-pointer py-4 w-full" onClick={() => sourceFileInput.current?.click()}>
                <div className="bg-indigo-50/50 p-3 rounded-full inline-block mb-3">
                  <Upload className="h-6 w-6 text-indigo-600" />
                </div>
                <p className="font-semibold text-xs text-slate-800">1. Source Lead Ads File (FB/Meta)</p>
                <p className="text-[10px] text-slate-400 mt-1">Accepts XLSX, XLS, CSV files up to 100k records</p>
              </div>
            )}
          </div>

          {/* File 2: CRM Export */}
          <div className="border border-dashed border-slate-200 hover:border-sky-400 rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleCrmChange}
              ref={crmFileInput}
              className="hidden"
            />
            {crmFile ? (
              <div className="w-full">
                <div className="flex items-center gap-3 bg-sky-50/50 border border-sky-100 p-3 rounded-lg mb-4 text-left">
                  <FileSpreadsheet className="h-8 w-8 text-sky-600 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-semibold text-xs text-slate-800 truncate" id="crm-filename-label">{crmFile.name}</p>
                    <p className="text-[10px] text-sky-600 font-medium mt-0.5" id="crm-record-count-badge">
                      {(crmFile.size / 1024).toFixed(1)} KB | {crmData.length} CRM records loaded
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-sky-600 ml-auto shrink-0" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Detected Columns ({crmHeaders.length})</p>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                    {crmHeaders.slice(0, 15).map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-mono border border-slate-200">
                        {h}
                      </span>
                    ))}
                    {crmHeaders.length > 15 && <span className="text-[9px] text-slate-400 font-medium">+{crmHeaders.length - 15} more</span>}
                  </div>
                </div>
                <button
                  onClick={() => crmFileInput.current?.click()}
                  className="mt-4 text-xs font-semibold text-sky-600 hover:underline cursor-pointer"
                >
                  Change CRM Export File
                </button>
              </div>
            ) : (
              <div className="cursor-pointer py-4 w-full" onClick={() => crmFileInput.current?.click()}>
                <div className="bg-sky-50/50 p-3 rounded-full inline-block mb-3">
                  <Upload className="h-6 w-6 text-sky-600" />
                </div>
                <p className="font-semibold text-xs text-slate-800">2. CRM Export File</p>
                <p className="text-[10px] text-slate-400 mt-1">Accepts XLSX, XLS, CSV files up to 100k records</p>
              </div>
            )}
          </div>
        </div>

        {/* Column Mapping Panel Toggle */}
        {(sourceHeaders.length > 0 && crmHeaders.length > 0) && (
          <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-gray-800">Field Correspondence Config (Header Alignment)</p>
                <p className="text-[10px] text-gray-500">Coordinate Meta Ad set column titles with final CRM parameters.</p>
              </div>
              <button
                onClick={autoMapHeaders}
                className="px-2.5 py-1 text-[11px] bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-medium rounded-md transition-colors cursor-pointer"
              >
                Auto-Align Headers
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              {/* Source Mapping Selector */}
              <div>
                <p className="text-[11px] font-bold text-indigo-700 mb-2.5 border-b border-indigo-100 pb-1">Source Fields (Lead Ads)</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Unique Lead ID:</label>
                    <select
                      value={currentMapping.sourceId}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, sourceId: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1 focus:ring-1 focus:ring-indigo-500"
                    >
                      {sourceHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Creation Date/Time:</label>
                    <select
                      value={currentMapping.sourceTime}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, sourceTime: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1 focus:ring-1 focus:ring-indigo-500"
                    >
                      {sourceHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Campaign Name:</label>
                    <select
                      value={currentMapping.sourceCampaign}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, sourceCampaign: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {sourceHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Customer Full Name:</label>
                    <select
                      value={currentMapping.sourceName}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, sourceName: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {sourceHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Mobile/Phone Number:</label>
                    <select
                      value={currentMapping.sourceMobile}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, sourceMobile: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {sourceHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">City Location:</label>
                    <select
                      value={currentMapping.sourceCity}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, sourceCity: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {sourceHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* CRM Mapping Selector */}
              <div>
                <p className="text-[11px] font-bold text-sky-700 mb-2.5 border-b border-sky-100 pb-1">CRM Fields (Audit targets)</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Unique Lead ID:</label>
                    <select
                      value={currentMapping.crmId}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, crmId: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1 focus:ring-1 focus:ring-sky-500"
                    >
                      {crmHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Customer Name:</label>
                    <select
                      value={currentMapping.crmName}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, crmName: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {crmHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Contact Phone:</label>
                    <select
                      value={currentMapping.crmMobile}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, crmMobile: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {crmHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Status Update Variable:</label>
                    <select
                      value={currentMapping.crmStatus}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, crmStatus: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {crmHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Remark/Notes Field:</label>
                    <select
                      value={currentMapping.crmRemark}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, crmRemark: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {crmHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-600 min-w-[120px]">Assigned Agent Variable:</label>
                    <select
                      value={currentMapping.crmAgent}
                      onChange={(e) => onUpdateMapping({ ...currentMapping, crmAgent: e.target.value })}
                      className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 flex-1"
                    >
                      {crmHeaders.map((h, idx) => <option key={idx} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compile / Trigger button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleExecReconciliation}
            disabled={loading || sourceData.length === 0 || crmData.length === 0}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 ${
              sourceData.length > 0 && crmData.length > 0
                ? "bg-slate-900 hover:bg-slate-800 text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
            id="reconcile-action-trigger"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Execute Matching Analysis & Run Audit
          </button>
        </div>
      </div>
    </div>
  );
}
