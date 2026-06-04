/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Discrepancy, DiscrepancyType, SeverityType, ResolutionStatus, AuditTrail } from "../types";
import { Search, Info, HelpCircle, User, ShieldAlert, CheckCircle2, MessageSquare, ArrowRight, UserPlus, FileText, Check, AlertTriangle, ChevronsUpDown } from "lucide-react";

interface DiscrepancyCenterProps {
  discrepancies: Discrepancy[];
  onUpdateDiscrepancy: (updated: Discrepancy) => void;
}

export function DiscrepancyCenter({ discrepancies, onUpdateDiscrepancy }: DiscrepancyCenterProps) {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [severityFilter, setSeverityFilter] = useState<string>("All");
  const [resolutionFilter, setResolutionFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<Discrepancy | null>(null);
  const [noteText, setNoteText] = useState("");
  const [assigneeText, setAssigneeText] = useState("");

  const categories = [
    { label: "All Cases", key: "All" },
    { label: "Missing in CRM", key: "missing_in_crm" },
    { label: "Missing Status", key: "blank_status" },
    { label: "Name Mismatches", key: "name_mismatch" },
    { label: "Phone Mismatches", key: "phone_mismatch" },
    { label: "Duplicates", key: "duplicate_lead" },
    { label: "Manual Review", key: "manual_review" }
  ];

  // Filtering Logic
  const filteredDiscrepancies = discrepancies.filter(d => {
    // 1. Tab / Category Filter
    if (activeTab !== "All" && d.type !== activeTab) return false;

    // 2. Severity Filter
    if (severityFilter !== "All" && d.severity !== severityFilter.toLowerCase()) return false;

    // 3. Resolution Status Filter
    if (resolutionFilter !== "All" && d.resolution !== resolutionFilter) return false;

    // 4. Global Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = d.sourceRecord?.full_name?.toLowerCase().includes(q) || d.crmRecord?.["CUSTOMER NAME"]?.toLowerCase().includes(q);
      const phoneMatch = d.sourceRecord?.Mobile_no?.toLowerCase().includes(q) || d.crmRecord?.["CONTACT NO"]?.toLowerCase().includes(q);
      const detailsMatch = d.details.toLowerCase().includes(q);
      const agentMatch = d.crmRecord?.["AGENT NAME"]?.toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !detailsMatch && !agentMatch) return false;
    }

    return true;
  });

  const getSeverityBadge = (s: SeverityType) => {
    switch (s) {
      case "critical":
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-md uppercase">Critical</span>;
      case "high":
        return <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold rounded-md uppercase">High</span>;
      case "medium":
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md uppercase">Medium</span>;
      case "low":
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-md uppercase">Low</span>;
    }
  };

  const getCategoryLabel = (t: DiscrepancyType) => {
    switch (t) {
      case "missing_in_crm": return "Missing in CRM";
      case "missing_in_source": return "No Source Match";
      case "blank_status": return "Blank Status";
      case "name_mismatch": return "Name Mismatch";
      case "phone_mismatch": return "Phone Mismatch";
      case "duplicate_lead": return "Duplicate";
      case "manual_review": return "Manual Review Needed";
    }
  };

  const getResolutionStyle = (r: ResolutionStatus) => {
    switch (r) {
      case "Open": return "bg-red-50 text-red-700 border-red-200";
      case "Under Review": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Resolved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Ignored": return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  // Resolution Actions
  const handleUpdateStatus = (newStatus: ResolutionStatus) => {
    if (!selectedDiscrepancy) return;
    const prev = selectedDiscrepancy.resolution;
    
    const trail: AuditTrail = {
      user: "Audit Administrator",
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: "Status Updated",
      prevValue: prev,
      newValue: newStatus
    };

    const updated: Discrepancy = {
      ...selectedDiscrepancy,
      resolution: newStatus,
      history: [...selectedDiscrepancy.history, trail]
    };

    onUpdateDiscrepancy(updated);
    setSelectedDiscrepancy(updated);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscrepancy || !noteText.trim()) return;

    const trail: AuditTrail = {
      user: "Audit Administrator",
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: "Note Appended",
      prevValue: "",
      newValue: noteText.trim()
    };

    const updated: Discrepancy = {
      ...selectedDiscrepancy,
      notes: selectedDiscrepancy.notes 
        ? `${selectedDiscrepancy.notes}\n[${trail.date}] ${noteText.trim()}`
        : `[${trail.date}] ${noteText.trim()}`,
      history: [...selectedDiscrepancy.history, trail]
    };

    onUpdateDiscrepancy(updated);
    setSelectedDiscrepancy(updated);
    setNoteText("");
  };

  const handleAssignAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscrepancy || !assigneeText.trim()) return;

    const prev = selectedDiscrepancy.assignedTo || "Unassigned";
    const trail: AuditTrail = {
      user: "Audit Administrator",
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: "Assignee Modified",
      prevValue: prev,
      newValue: assigneeText.trim()
    };

    const updated: Discrepancy = {
      ...selectedDiscrepancy,
      assignedTo: assigneeText.trim(),
      history: [...selectedDiscrepancy.history, trail]
    };

    onUpdateDiscrepancy(updated);
    setSelectedDiscrepancy(updated);
    setAssigneeText("");
  };

  return (
    <div className="space-y-6" id="discrepancy-center-tab">
      
      {/* Search and Category Toggle Tabs */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 text-left">
        {/* Horizontal Category Selectors */}
        <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-3 mb-4 scrollbar-thin">
          {categories.map((cat, idx) => {
            const count = cat.key === "All" 
              ? discrepancies.length 
              : discrepancies.filter(d => d.type === cat.key).length;
            
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(cat.key);
                  setSelectedDiscrepancy(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === cat.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
                id={`discrepancy-tab-${cat.key}`}
              >
                {cat.label}
                <span className={`text-[10px] font-bold p-0.5 px-1.5 rounded-full ${activeTab === cat.key ? "bg-slate-700 text-slate-100" : "bg-slate-200 text-slate-700"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action filter fields */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <input
              type="text"
              placeholder="Search by Lead Name, Phone, Agent, Campaign, Details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-400 focus:outline-none"
              id="global-mismatch-search"
            />
            <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
          </div>

          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:outline-none focus:ring-1 cursor-pointer"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <select
              value={resolutionFilter}
              onChange={(e) => setResolutionFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:outline-none focus:ring-1 cursor-pointer"
            >
              <option value="All">All Resolution States</option>
              <option value="Open">Open</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
              <option value="Ignored">Ignored</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Two Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        {/* Left Side: Table of Discrepancies */}
        <div className={`bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden ${selectedDiscrepancy ? "lg:col-span-7" : "lg:col-span-12"}`}>
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-3">
              Matched Mismatches & Gaps ({filteredDiscrepancies.length})
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="p-3 pl-5">Status</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-slate-900">Issue Details</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3 pr-5 text-right w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredDiscrepancies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 text-xs">
                      No matching parsed discrepancies discovered in this criteria range.
                    </td>
                  </tr>
                ) : (
                  filteredDiscrepancies.map((disc, index) => {
                    const isSelected = selectedDiscrepancy?.id === disc.id;
                    return (
                      <tr
                        key={disc.id || index}
                        onClick={() => setSelectedDiscrepancy(disc)}
                        className={`cursor-pointer transition-all ${
                          isSelected ? "bg-slate-50 font-semibold border-l-2 border-indigo-600" : "hover:bg-slate-50/30"
                        }`}
                      >
                        <td className="p-3 pl-5">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getResolutionStyle(disc.resolution)}`}>
                            {disc.resolution}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-950 text-[11px] truncate max-w-[120px]">
                          {getCategoryLabel(disc.type)}
                        </td>
                        <td className="p-3 text-[11px] text-slate-600">
                          <p className="truncate max-w-[280px] font-medium text-slate-800">{disc.details}</p>
                        </td>
                        <td className="p-3">{getSeverityBadge(disc.severity)}</td>
                        <td className="p-3 font-semibold text-slate-600">{disc.assignedTo || "Unassigned"}</td>
                        <td className="p-3 pr-5 text-right font-bold text-slate-400 group-hover:text-slate-900">
                          <ArrowRight className="h-4 w-4 ml-auto" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Detailed Workflow Resolution Pane */}
        {selectedDiscrepancy && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-md p-5 lg:col-span-5 space-y-5 sticky top-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${getResolutionStyle(selectedDiscrepancy.resolution)}`}>
                  {selectedDiscrepancy.resolution}
                </span>
                <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">CASE REF: {selectedDiscrepancy.id.substring(0, 14)}</p>
              </div>
              <button
                onClick={() => setSelectedDiscrepancy(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Close Panel
              </button>
            </div>

            {/* Side-by-side Match Review */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <FileText className="h-4 w-4 text-indigo-500" />
                Cross-Reference Ledger Match
              </h4>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {/* Source Record Container */}
                <div className="bg-indigo-50/40 border border-indigo-100 p-2.5 rounded-lg space-y-1">
                  <p className="font-bold text-indigo-900 border-b border-indigo-100pb-1 uppercase tracking-wider text-[9px]">Source Record</p>
                  {selectedDiscrepancy.sourceRecord ? (
                    <>
                      <p className="font-semibold text-slate-900">{selectedDiscrepancy.sourceRecord.full_name}</p>
                      <p className="font-mono text-slate-500">{selectedDiscrepancy.sourceRecord.Mobile_no}</p>
                      <p className="text-slate-500 truncate">{selectedDiscrepancy.sourceRecord.campaign_name}</p>
                      <p className="text-slate-400">{selectedDiscrepancy.sourceRecord.city}</p>
                    </>
                  ) : (
                    <p className="text-slate-400 italic">No direct Source Ad record matches</p>
                  )}
                </div>

                {/* CRM Record Container */}
                <div className="bg-sky-50/40 border border-sky-100 p-2.5 rounded-lg space-y-1">
                  <p className="font-bold text-sky-900 border-b border-sky-100 pb-1 uppercase tracking-wider text-[9px]">CRM Record</p>
                  {selectedDiscrepancy.crmRecord ? (
                    <>
                      <p className="font-semibold text-slate-900">{selectedDiscrepancy.crmRecord["CUSTOMER NAME"]}</p>
                      <p className="font-mono text-slate-500">{selectedDiscrepancy.crmRecord["CONTACT NO"]}</p>
                      <p className="text-slate-600 italic">Status: {selectedDiscrepancy.crmRecord["STATUS"] || "Blank"}</p>
                      <p className="text-slate-500 text-[10px] line-clamp-2">Remark: {selectedDiscrepancy.crmRecord["REMARK"]}</p>
                    </>
                  ) : (
                    <p className="text-slate-400 italic">Record missing from CRM system catalog</p>
                  )}
                </div>
              </div>
            </div>

            {/* Error detail description */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
              <p className="font-bold text-slate-700 flex items-center gap-1.5 mb-1 text-[11px]">
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
                Engineering Description
              </p>
              <p className="text-slate-600 text-[11px] leading-relaxed">{selectedDiscrepancy.details}</p>
            </div>

            {/* Interactive Resolution Action form */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              {/* Quick Status Setter */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Set Audit Status</p>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                  {(["Open", "Under Review", "Resolved", "Ignored"] as ResolutionStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(st)}
                      className={`py-1 rounded border text-[10px] cursor-pointer transition-colors ${
                        selectedDiscrepancy.resolution === st
                          ? "bg-indigo-600 border-indigo-600 text-white font-bold"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modify Owner Assignee */}
              <div>
                <form onSubmit={handleAssignAgent} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Assign agent or team..."
                      value={assigneeText}
                      onChange={(e) => setAssigneeText(e.target.value)}
                      className="w-full text-xs font-medium pl-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1"
                    />
                  </div>
                  <button
                    type="submit"
                    className="p-1 px-3 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                  >
                    Assign
                  </button>
                </form>
                {selectedDiscrepancy.assignedTo && (
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <User className="h-3 w-3 inline text-slate-500" /> Currently owned by: <strong className="text-slate-700">{selectedDiscrepancy.assignedTo}</strong>
                  </p>
                )}
              </div>

              {/* Note adder */}
              <div>
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    placeholder="Append notes or audit outcome to this file..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    className="w-full text-xs font-medium p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="p-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Add Notes Row
                    </button>
                  </div>
                </form>
              </div>

              {/* Audit history tracker list */}
              {selectedDiscrepancy.history && selectedDiscrepancy.history.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Audit History Trail</p>
                  <div className="space-y-2.5 max-h-[120px] overflow-y-auto pr-1">
                    {selectedDiscrepancy.history.map((h, i) => (
                      <div key={i} className="text-[10px] text-slate-500 line-clamp-3">
                        <span className="font-bold text-slate-700">{h.action}</span> by {h.user} at {h.date}
                        {h.prevValue && (
                          <div className="text-slate-400 font-mono mt-0.5 text-[9px]">
                            {h.prevValue} <ArrowRight className="h-2 w-2 inline mx-0.5" /> {h.newValue}
                          </div>
                        )}
                        {!h.prevValue && h.newValue && (
                          <div className="text-slate-600 font-medium italic mt-0.5">&quot;{h.newValue}&quot;</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
