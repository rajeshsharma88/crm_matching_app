/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { CampaignMetric } from "../types";
import { Megaphone, Layers, Percent, TrendingUp, HelpCircle } from "lucide-react";

interface CampaignAnalyticsProps {
  campaignMetrics: CampaignMetric[];
}

export function CampaignAnalytics({ campaignMetrics }: CampaignAnalyticsProps) {
  return (
    <div className="space-y-6" id="campaign-dashboard-tab">
      
      {/* Visual Chart Aspect */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Generated vs Matched Leads */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-left">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-indigo-600" />
              Volume Generated vs Matched leads
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Compare Social Source generation metrics with authenticated matching CRM counts.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={campaignMetrics}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="campaignName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderRadius: "8px", fontSize: "11px" }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "11px", pt: 10 }} />
                <Bar dataKey="leadsGenerated" name="Source Leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="matched" name="Matched CRM" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Conversion Efficiencies */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-left">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              Campaign Booking Conversion Rate (%)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Understand total conversion indicators per individual advertising campaign.</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={campaignMetrics}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="campaignName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderRadius: "8px", fontSize: "11px" }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="conversionRate" name="Conversion %" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Structured Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Campaign Segment Analysis</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Automated attribution & discrepancy counts grouped by active lead advertisement campaign.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                <th className="p-3.5 pl-6">Campaign Name</th>
                <th className="p-3.5">Leads Gen (Meta)</th>
                <th className="p-3.5">Matched Leads</th>
                <th className="p-3.5">Missing CRM Records</th>
                <th className="p-3.5">Booked Accounts</th>
                <th className="p-3.5 pr-6 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaignMetrics.map((camp, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3.5 pl-6 font-semibold text-slate-900">{camp.campaignName}</td>
                  <td className="p-3.5 font-medium text-slate-600">{camp.leadsGenerated}</td>
                  <td className="p-3.5 text-emerald-600 font-bold">{camp.matched}</td>
                  <td className={`p-3.5 font-bold ${camp.missing > 0 ? "text-rose-500" : "text-slate-400"}`}>
                    {camp.missing}
                  </td>
                  <td className="p-3.5 text-indigo-600 font-semibold">{camp.booked}</td>
                  <td className="p-3.5 pr-6 text-right">
                    <span className="inline-block p-1 px-2.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[10px]">
                      {camp.conversionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
