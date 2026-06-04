/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SourceLead {
  id: string;
  created_time: string;
  campaign_name: string;
  full_name: string;
  Mobile_no: string;
  city: string;
  // Extra property to handle raw inputs
  [key: string]: any;
}

export interface CrmLead {
  "LEAD ID": string;
  "CUSTOMER NAME": string;
  "CONTACT NO": string;
  "STATUS": string;
  "REMARK": string;
  "AGENT NAME": string;
  // Extra property for mapped files
  [key: string]: any;
}

export type DiscrepancyType =
  | "missing_in_crm"
  | "missing_in_source"
  | "blank_status"
  | "name_mismatch"
  | "phone_mismatch"
  | "duplicate_lead"
  | "manual_review";

export type SeverityType = "critical" | "high" | "medium" | "low";

export type ResolutionStatus = "Open" | "Under Review" | "Resolved" | "Ignored";

export interface AuditTrail {
  user: string;
  date: string;
  action: string;
  prevValue: string;
  newValue: string;
}

export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  severity: SeverityType;
  sourceRecord?: SourceLead;
  crmRecord?: CrmLead;
  details: string;
  notes: string;
  assignedTo: string;
  resolution: ResolutionStatus;
  history: AuditTrail[];
}

export interface MappingConfig {
  sourceId: string;
  sourceTime: string;
  sourceCampaign: string;
  sourceName: string;
  sourceMobile: string;
  sourceCity: string;
  crmId: string;
  crmName: string;
  crmMobile: string;
  crmStatus: string;
  crmRemark: string;
  crmAgent: string;
}

export interface CampaignMetric {
  campaignName: string;
  leadsGenerated: number;
  crmRecords: number;
  matched: number;
  missing: number;
  booked: number;
  conversionRate: number;
}

export interface AgentMetric {
  agentName: string;
  totalAssigned: number;
  updated: number;
  pending: number;
  booked: number;
  conversionRate: number;
}

export interface NotificationAlert {
  id: string;
  title: string;
  type: "warning" | "danger" | "success" | "info";
  description: string;
  category: "missing_crm" | "blank_status" | "duplicates" | "score";
  timestamp: string;
  active: boolean;
}

export interface RecurringSchedule {
  frequency: "daily" | "weekly" | "monthly" | "off";
  time: string;
  lastRun?: string;
  nextRun?: string;
}
