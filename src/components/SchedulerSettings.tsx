/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { RecurringSchedule } from "../types";
import { Clock, Sliders, BellOff, ShieldAlert, CheckCircle2, Save, Play, PlayCircle } from "lucide-react";

interface SchedulerSettingsProps {
  schedule: RecurringSchedule;
  onUpdateSchedule: (updated: RecurringSchedule) => void;
  alertThresholds: {
    missingCrmPct: number;
    blankStatusCount: number;
    duplicateLimit: number;
    reconciliationTarget: number;
  };
  onUpdateThresholds: (updated: any) => void;
}

export function SchedulerSettings({
  schedule,
  onUpdateSchedule,
  alertThresholds,
  onUpdateThresholds
}: SchedulerSettingsProps) {
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "off">(schedule.frequency);
  const [scheduleTime, setScheduleTime] = useState(schedule.time || "09:00");

  const [missingPct, setMissingPct] = useState(alertThresholds.missingCrmPct);
  const [blankCount, setBlankCount] = useState(alertThresholds.blankStatusCount);
  const [dupLimit, setDupLimit] = useState(alertThresholds.duplicateLimit);
  const [reconTarget, setReconTarget] = useState(alertThresholds.reconciliationTarget);

  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingStatus("Saving parameters...");
    setTimeout(() => {
      onUpdateSchedule({
        frequency,
        time: scheduleTime,
        lastRun: new Date().toISOString().replace('T', ' ').substring(0, 16),
        nextRun: getNextRunDate(frequency, scheduleTime)
      });
      onUpdateThresholds({
        missingCrmPct: missingPct,
        blankStatusCount: blankCount,
        duplicateLimit: dupLimit,
        reconciliationTarget: reconTarget
      });
      setSavingStatus("Configuration successfully deployed to matching engine daemon!");
      setTimeout(() => setSavingStatus(null), 3000);
    }, 800);
  };

  const getNextRunDate = (f: string, t: string) => {
    if (f === "off") return "N/A";
    const now = new Date();
    const dStr = now.toISOString().substring(0, 10);
    return `${dStr} ${t} (Automatic Recurring)`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left" id="scheduler-settings-tab">
      
      {/* 1. Recurrent Automation Cron Config */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
        <form onSubmit={handleSaveConfigs} className="space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-indigo-600 animate-spin-hover" />
              Automated CRM Reconciliation Cron Scheduler
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Configure automatic ingestion of latest API webhooks or daily export buckets.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Recurrent Sync Interval</label>
              <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                {(["daily", "weekly", "monthly", "off"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFrequency(opt)}
                    className={`py-2 rounded-lg border cursor-pointer capitalize text-center text-[10px] sm:text-xs font-bold transition-all ${
                      frequency === opt
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {frequency !== "off" && (
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Execution Trigger Time (UTC)</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full text-xs font-medium p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1"
                />
              </div>
            )}

            {schedule.lastRun && (
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 text-[10px] space-y-1 font-mono text-slate-500">
                <p>⚡ Last Sync: <strong className="text-slate-700">{schedule.lastRun}</strong></p>
                <p>🔄 Future Sync: <strong className="text-slate-700">{schedule.nextRun || "Pending recalculation"}</strong></p>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              Deploy Scheduler rules
            </button>
          </div>
        </form>

        {savingStatus && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-xs flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{savingStatus}</span>
          </div>
        )}
      </div>

      {/* 2. Audit Alert Threshold Parameters */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-indigo-600" />
              Interactive Audit SLA Tolerances
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Adjust coefficients matching compliance alarms in real-time.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Meta Leads Missing in CRM Tolerance (%)</span>
                <span className="text-indigo-600 font-mono text-[11px] font-bold">{missingPct}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={missingPct}
                onChange={(e) => setMissingPct(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[9px] text-slate-400 mt-0.5">Alert fires if missed integration percentage breaches this.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Blank Status Ceiling Count</span>
                <span className="text-indigo-600 font-mono text-[11px] font-bold">{blankCount} Records</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={blankCount}
                onChange={(e) => setBlankCount(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[9px] text-slate-400 mt-0.5">SLA warning triggers if blank status counts exceed this.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Incoming Duplicate Tolerance Limits</span>
                <span className="text-indigo-600 font-mono text-[11px] font-bold">{dupLimit} Records</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={dupLimit}
                onChange={(e) => setDupLimit(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-150 text-indigo-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[9px] text-slate-400 mt-0.5">Duplicates threshold warning.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 text-[10px] text-indigo-800 flex items-start gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
          <p className="leading-normal font-semibold">
            Tolerances are evaluated dynamically against newly parsed datasets. Alarms auto-clear when records resolve.
          </p>
        </div>
      </div>

    </div>
  );
}
