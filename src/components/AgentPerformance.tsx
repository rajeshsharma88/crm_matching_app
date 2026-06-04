/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AgentMetric } from "../types";
import { UserCheck, Search, ArrowUpDown, TrendingUp, CheckCircle, RefreshCw } from "lucide-react";

interface AgentPerformanceProps {
  agentMetrics: AgentMetric[];
}

type SortField = "agentName" | "totalAssigned" | "updated" | "pending" | "booked" | "conversionRate";

export function AgentPerformance({ agentMetrics }: AgentPerformanceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalAssigned");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Filter agent list
  const filteredAgents = agentMetrics.filter(a =>
    a.agentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Quick sort action
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string") {
      valA = valA.toLowerCase();
      valB = (valB as string).toLowerCase();
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden text-left" id="agent-performance-tab">
      
      {/* Search Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-indigo-600" />
            Agent Audit Performance & Conversions
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Evaluate assigned lead workload, update completion metrics and verified booked conversion efficiency index.</p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-60 pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            id="agent-search-input"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      {/* Agents Table List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
              <th className="p-3.5 pl-6 cursor-pointer select-none" onClick={() => handleSort("agentName")}>
                <div className="flex items-center gap-1">
                  Agent Name
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3.5 cursor-pointer select-none" onClick={() => handleSort("totalAssigned")}>
                <div className="flex items-center gap-1">
                  Total Assigned
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3.5 cursor-pointer select-none" onClick={() => handleSort("updated")}>
                <div className="flex items-center gap-1">
                  Updated Leads
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3.5 cursor-pointer select-none" onClick={() => handleSort("pending")}>
                <div className="flex items-center gap-1 col-span-1">
                  Pending Statuses
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3.5 cursor-pointer select-none" onClick={() => handleSort("booked")}>
                <div className="flex items-center gap-1">
                  Booked/Closed leads
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3.5 pr-6 cursor-pointer select-none text-right" onClick={() => handleSort("conversionRate")}>
                <div className="flex items-center justify-end gap-1">
                  Conversion %
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedAgents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  No agents found matching &quot;{searchTerm}&quot;
                </td>
              </tr>
            ) : (
              sortedAgents.map((agent, idx) => {
                const pendingRate = agent.totalAssigned ? Math.round((agent.pending / agent.totalAssigned) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 pl-6 font-semibold text-slate-900 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                        {agent.agentName.substring(0, 2).toUpperCase()}
                      </div>
                      <span id={`agent-name-${idx}`}>{agent.agentName}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700">{agent.totalAssigned}</td>
                    <td className="p-3.5 text-slate-600">
                      <span className="font-semibold text-emerald-600">{agent.updated}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({Math.round((agent.updated / agent.totalAssigned) * 100)}%)</span>
                    </td>
                    <td className="p-3.5">
                      <span className={`font-semibold ${agent.pending > 0 ? "text-amber-600" : "text-slate-400"}`}>
                        {agent.pending}
                      </span>
                      {agent.pending > 0 && (
                        <span className="text-[10px] text-amber-500 font-medium ml-1">({pendingRate}%)</span>
                      )}
                    </td>
                    <td className="p-3.5 text-indigo-600 font-semibold">{agent.booked}</td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 hidden md:block">
                          <div 
                            className="bg-indigo-600 h-1.5 rounded-full" 
                            style={{ width: `${agent.conversionRate}%` }}
                          ></div>
                        </div>
                        <span className="p-1 px-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-full text-[10px]" id={`agent-conversion-val-${idx}`}>
                          {agent.conversionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
