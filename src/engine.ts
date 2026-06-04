/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SourceLead, CrmLead, Discrepancy, MappingConfig, CampaignMetric, AgentMetric, DiscrepancyType } from "./types";

// Dynamic string similarity based on Levenshtein Distance
export function getStringSimilarity(s1: string, s2: string): number {
  const str1 = (s1 || "").trim().toLowerCase();
  const str2 = (s2 || "").trim().toLowerCase();
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const m = str1.length;
  const n = str2.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const dist = d[m][n];
  const maxLen = Math.max(m, n);
  return (maxLen - dist) / maxLen;
}

// Extract only digits from phone
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

// Compare two phone numbers including masking
export function matchPhoneNumbers(pSource: string, pCrm: string): { matches: boolean; exact: boolean; matchedDigits: string } {
  const sClean = cleanPhoneNumber(pSource);
  // CRM might have masking like *****56809
  const crmClean = pCrm ? pCrm.trim() : "";
  
  if (!sClean || !pCrm) return { matches: false, exact: false, matchedDigits: "" };

  // 1. Check exact numeric match after stripping non-digits
  const cCleanDigits = cleanPhoneNumber(pCrm);
  if (sClean === cCleanDigits && sClean.length > 5) {
    return { matches: true, exact: true, matchedDigits: sClean };
  }

  // 2. Check mask ending mismatch (last 5 digits)
  // Ensure we compare last 5 digits
  const sLast5 = sClean.slice(-5);
  const cLast5 = crmClean.replace(/[^\d]/g, "").slice(-5);

  if (sLast5 && cLast5 && sLast5 === cLast5 && sLast5.length === 5) {
    return { matches: true, exact: false, matchedDigits: sLast5 };
  }

  return { matches: false, exact: false, matchedDigits: "" };
}

// Main Confidence Matching Engine
export interface MatchResult {
  confidence: number; // 100, 90, 70, 0
  level: "Level 1" | "Level 2" | "Level 3" | "Low Confidence";
  crmRecord?: CrmLead;
  notes: string;
}

export function matchLeadToCrm(
  lead: SourceLead,
  crmLeads: CrmLead[],
  mapping: MappingConfig
): MatchResult {
  const leadPhone = String(lead[mapping.sourceMobile] || "");
  const leadName = String(lead[mapping.sourceName] || "");
  const leadCity = String(lead[mapping.sourceCity] || "");
  const leadDateStr = String(lead[mapping.sourceTime] || "");

  let bestResult: MatchResult = { confidence: 0, level: "Low Confidence", notes: "No matching record discovered" };

  for (const crm of crmLeads) {
    const crmPhone = String(crm[mapping.crmMobile] || "");
    const crmName = String(crm[mapping.crmName] || "");

    const phoneMatch = matchPhoneNumbers(leadPhone, crmPhone);
    const nameSim = getStringSimilarity(leadName, crmName);

    // LEVEL 1: Exact Number Match OR (Last 5 digits exact + exact name similarity > 0.95)
    if (phoneMatch.exact) {
      if (nameSim < 0.75) {
        // Match found but names radically differ (Phone Match, Name discrepancy)
        if (bestResult.confidence < 95) {
          bestResult = {
            confidence: 95,
            level: "Level 1",
            crmRecord: crm,
            notes: `Exact phone match, but name differs: "${leadName}" vs "${crmName}"`
          };
        }
      } else {
        return {
          confidence: 100,
          level: "Level 1",
          crmRecord: crm,
          notes: "100% confidence match via exact phone number and matching name."
        };
      }
    }

    if (phoneMatch.matches && !phoneMatch.exact && nameSim > 0.90) {
      return {
        confidence: 100,
        level: "Level 1",
        crmRecord: crm,
        notes: "100% confidence match via masked phone alignment (last 5 digits) & exact customer name."
      };
    }

    // LEVEL 2: Similar Name + Masked last 5 digits matches (but name has slight variations)
    if (phoneMatch.matches && nameSim >= 0.75 && nameSim <= 0.90) {
      if (bestResult.confidence < 90) {
        bestResult = {
          confidence: 90,
          level: "Level 2",
          crmRecord: crm,
          notes: `90% confidence: Masked phone matches with minor Name variation ("${leadName}" vs "${crmName}")`
        };
      }
    }

    // LEVEL 3: No phone match, but similar names + similar city + close dates
    if (!phoneMatch.matches && nameSim > 0.85) {
      // Check city
      const leadCityClean = leadCity.toLowerCase().trim();
      const crmRemarkText = String(crm[mapping.crmRemark] || "").toLowerCase();
      const citySim = leadCityClean ? (crmRemarkText.includes(leadCityClean) ? 1.0 : 0.4) : 0.5;

      if (citySim > 0.8) {
        if (bestResult.confidence < 70) {
          bestResult = {
            confidence: 70,
            level: "Level 3",
            crmRecord: crm,
            notes: `70% confidence: Highly distinct name similarity ("${leadName}" & "${crmName}") + matching city context.`
          };
        }
      }
    }
  }

  return bestResult;
}

// Generate high quality demo data representing Meta Ads Leads vs CRM Exports
export function generateDemoDatasets(): { sourceLeads: SourceLead[]; crmLeads: CrmLead[] } {
  const sourceLeads: SourceLead[] = [
    { id: "M101", created_time: "2026-05-25 10:15", campaign_name: "Meta Lead Gen - Real Estate", full_name: "Abhishek Sharma", Mobile_no: "9876543210", city: "Delhi" },
    { id: "M102", created_time: "2026-05-25 11:30", campaign_name: "Meta Lead Gen - Real Estate", full_name: "Rajesh Kumar", Mobile_no: "9549256809", city: "Mumbai" },
    { id: "M103", created_time: "2026-05-25 12:45", campaign_name: "Meta Lead Gen - Real Estate", full_name: "Priya Nair", Mobile_no: "9123456789", city: "Bangalore" },
    { id: "M104", created_time: "2026-05-26 09:00", campaign_name: "Google Performance Max", full_name: "Amanda Dsouza", Mobile_no: "8887776665", city: "Goa" },
    { id: "M105", created_time: "2026-05-26 14:15", campaign_name: "Google Performance Max", full_name: "Vikram Malhotra", Mobile_no: "9911223344", city: "Delhi" },
    { id: "M106", created_time: "2026-05-26 15:30", campaign_name: "LinkedIn B2B Organic", full_name: "Sunitha Vishwakarma", Mobile_no: "9345678122", city: "Chennai" },
    { id: "M107", created_time: "2026-05-27 08:30", campaign_name: "Meta Lead Gen - Real Estate", full_name: "Sandeep Bansal", Mobile_no: "9445223311", city: "Pune" },
    { id: "M108", created_time: "2026-05-27 10:00", campaign_name: "Meta Lead Gen - Real Estate", full_name: "Aman Preet Singh", Mobile_no: "7778889990", city: "Chandigarh" },
    { id: "M109", created_time: "2026-05-27 11:15", campaign_name: "Google Performance Max", full_name: "Karan Johar", Mobile_no: "9566332211", city: "Jaipur" },
    { id: "M110", created_time: "2026-05-27 15:45", campaign_name: "LinkedIn B2B Organic", full_name: "Neha Gupta", Mobile_no: "9812739485", city: "Noida" },
    // A duplicate lead in source
    { id: "M111", created_time: "2026-05-28 09:10", campaign_name: "Meta Lead Gen - Real Estate", full_name: "Priya Nair", Mobile_no: "9123456789", city: "Bangalore" }, 
    // Missing completely in CRM
    { id: "M112", created_time: "2026-05-28 10:30", campaign_name: "Meta Lead Gen - Real Estate", full_name: "Rahul Verma", Mobile_no: "9888877777", city: "Delhi" },
    { id: "M113", created_time: "2026-05-28 11:15", campaign_name: "Google Performance Max", full_name: "Shreya Ghoshal", Mobile_no: "9777766666", city: "Kolkata" },
    // Phone mismatch (same name, city, but phone differs)
    { id: "M114", created_time: "2026-05-28 13:00", campaign_name: "Google Performance Max", full_name: "Rohan Kapoor", Mobile_no: "9666655555", city: "Gurgaon" },
    // Name mismatch (same phone, different name spelling)
    { id: "M115", created_time: "2026-05-28 16:45", campaign_name: "Meta Lead Gen - Real Estate", full_name: "Devendra Fadnavis", Mobile_no: "9000011111", city: "Nagpur" }
  ];

  const crmLeads: CrmLead[] = [
    { "LEAD ID": "C201", "CUSTOMER NAME": "Abhishek Sharma", "CONTACT NO": "9876543210", "STATUS": "Booked", "REMARK": "Interested, premium villa", "AGENT NAME": "Aditi Roy" },
    { "LEAD ID": "C202", "CUSTOMER NAME": "Rajesh Kumar", "CONTACT NO": "*****56809", "STATUS": "Interested", "REMARK": "Requires follow-up next Monday", "AGENT NAME": "Rohan Jha" },
    { "LEAD ID": "C203", "CUSTOMER NAME": "Priya Nair", "CONTACT NO": "9123456789", "STATUS": "Not Connected", "REMARK": "Ringing but no response", "AGENT NAME": "Aditi Roy" },
    { "LEAD ID": "C204", "CUSTOMER NAME": "Amanda D'souza", "CONTACT NO": "*****66665", "STATUS": "Callback", "REMARK": "Call tomorrow after 5 PM", "AGENT NAME": "Rohan Jha" }, // Level 2 match
    { "LEAD ID": "C205", "CUSTOMER NAME": "Vikram Malhotra", "CONTACT NO": "9911223344", "STATUS": "Ringing", "REMARK": "Checked Delhi property options", "AGENT NAME": "Sarah Salim" },
    { "LEAD ID": "C206", "CUSTOMER NAME": "Sunitha Vishwa", "CONTACT NO": "*****8122", "STATUS": "Follow-up", "REMARK": "Interested, Chennai local", "AGENT NAME": "Sarah Salim" }, // Level 3 match candidate or close
    { "LEAD ID": "C207", "CUSTOMER NAME": "Sandeep Bansal", "CONTACT NO": "9445223311", "STATUS": "Closed", "REMARK": "Deal closed for 2 BHK Pune", "AGENT NAME": "Rohan Jha" },
    { "LEAD ID": "C208", "CUSTOMER NAME": "Aman P. Singh", "CONTACT NO": "*****89990", "STATUS": "", "REMARK": "Blank STATUS alert test", "AGENT NAME": "Sarah Salim" }, // Blank status issue
    { "LEAD ID": "C209", "CUSTOMER NAME": "Karan Johar", "CONTACT NO": "9566332211", "STATUS": "Not Interested", "REMARK": "Budget issues in Jaipur", "AGENT NAME": "Aditi Roy" },
    { "LEAD ID": "C210", "CUSTOMER NAME": "Neha Gupta", "CONTACT NO": "9812739485", "STATUS": "Booked", "REMARK": "Booking advance received", "AGENT NAME": "Rohan Jha" },
    // Missing in Source (Only in CRM)
    { "LEAD ID": "C211", "CUSTOMER NAME": "Sita Ram", "CONTACT NO": "9222233333", "STATUS": "Interested", "REMARK": "Organic walk-in lead with no Meta ID", "AGENT NAME": "Sarah Salim" },
    // Name duplicate / CRM contact duplication
    { "LEAD ID": "C212", "CUSTOMER NAME": "Abhishek Sharma", "CONTACT NO": "9876543210", "STATUS": "Duplicate", "REMARK": "Re-inquiry about commercial layout", "AGENT NAME": "Aditi Roy" },
    // Partner to M115, name mismatch dev/devendra
    { "LEAD ID": "C213", "CUSTOMER NAME": "Devendra F.", "CONTACT NO": "9000011111", "STATUS": "Interested", "REMARK": "Nagpur deal tracker", "AGENT NAME": "Aditi Roy" },
    // Partner to M114, phone discrepancy
    { "LEAD ID": "C214", "CUSTOMER NAME": "Rohan Kapoor", "CONTACT NO": "9000099999", "STATUS": "Callback", "REMARK": "Prefers Gurgaon sector 45", "AGENT NAME": "Rohan Jha" }
  ];

  return { sourceLeads, crmLeads };
}

// Generate active column mappings
export function getDefaultMapping(): MappingConfig {
  return {
    sourceId: "id",
    sourceTime: "created_time",
    sourceCampaign: "campaign_name",
    sourceName: "full_name",
    sourceMobile: "Mobile_no",
    sourceCity: "city",
    crmId: "LEAD ID",
    crmName: "CUSTOMER NAME",
    crmMobile: "CONTACT NO",
    crmStatus: "STATUS",
    crmRemark: "REMARK",
    crmAgent: "AGENT NAME"
  };
}

// Reconciliation Execution Engine
export function runReconciliation(
  sourceLeads: SourceLead[],
  crmLeads: CrmLead[],
  mapping: MappingConfig
): {
  discrepancies: Discrepancy[];
  campaignMetrics: CampaignMetric[];
  agentMetrics: AgentMetric[];
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
} {
  const discrepancies: Discrepancy[] = [];
  const matchedSourceIds = new Set<string>();
  const matchedCrmIds = new Set<string>();
  
  // Track duplicates
  const sourcePhonesSeen = new Map<string, SourceLead[]>();
  const crmPhonesSeen = new Map<string, CrmLead[]>();

  // 1. Identify Source Duplicates
  sourceLeads.forEach(lead => {
    const phone = cleanPhoneNumber(String(lead[mapping.sourceMobile] || ""));
    if (phone) {
      if (!sourcePhonesSeen.has(phone)) {
        sourcePhonesSeen.set(phone, []);
      }
      sourcePhonesSeen.get(phone)!.push(lead);
    }
  });

  sourcePhonesSeen.forEach((leads, phone) => {
    if (leads.length > 1) {
      leads.slice(1).forEach((dupLead, index) => {
        discrepancies.push({
          id: `DISC-DUP-S-${dupLead[mapping.sourceId] || index}-${Date.now()}`,
          type: "duplicate_lead",
          severity: "low",
          sourceRecord: dupLead,
          details: `Duplicate lead found in Source file with same mobile: ${phone} (${dupLead[mapping.sourceName]})`,
          notes: "",
          assignedTo: "Unassigned",
          resolution: "Open",
          history: []
        });
      });
    }
  });

  // 2. Main Matching Pass (Source leads matching to CRM leads)
  const matchedPairs: { source: SourceLead; crm: CrmLead; confidence: number; result: MatchResult }[] = [];

  sourceLeads.forEach(lead => {
    const match = matchLeadToCrm(lead, crmLeads, mapping);

    if (match.confidence >= 70 && match.crmRecord) {
      matchedSourceIds.add(String(lead[mapping.sourceId]));
      matchedCrmIds.add(String(match.crmRecord[mapping.crmId]));
      
      matchedPairs.push({
        source: lead,
        crm: match.crmRecord,
        confidence: match.confidence,
        result: match
      });

      // Name Mismatch Discrepancy
      const sName = String(lead[mapping.sourceName] || "");
      const cName = String(match.crmRecord[mapping.crmName] || "");
      const nameSim = getStringSimilarity(sName, cName);
      if (nameSim < 0.85) {
        discrepancies.push({
          id: `DISC-NAME-MIS-${lead[mapping.sourceId] || indexGenerator()}-${Date.now()}`,
          type: "name_mismatch",
          severity: "medium",
          sourceRecord: lead,
          crmRecord: match.crmRecord,
          details: `Name mismatch detected: Source name is "${sName}", while CRM name is "${cName}" (Similarity: ${Math.round(nameSim * 100)}%)`,
          notes: "",
          assignedTo: "Unassigned",
          resolution: "Open",
          history: []
        });
      }

      // Phone Mismatch Discrepancy
      const sPhone = String(lead[mapping.sourceMobile] || "");
      const cPhone = String(match.crmRecord[mapping.crmMobile] || "");
      const phoneMatchResult = matchPhoneNumbers(sPhone, cPhone);
      if (!phoneMatchResult.exact && !phoneMatchResult.matches) {
        discrepancies.push({
          id: `DISC-PHONE-MIS-${lead[mapping.sourceId] || indexGenerator()}-${Date.now()}`,
          type: "phone_mismatch",
          severity: "medium",
          sourceRecord: lead,
          crmRecord: match.crmRecord,
          details: `Phone mismatch detected for matching customer: Source has "${sPhone}" but CRM lists "${cPhone}"`,
          notes: "",
          assignedTo: "Unassigned",
          resolution: "Open",
          history: []
        });
      }

      // Check Blank Status Discrepancy
      const status = String(match.crmRecord[mapping.crmStatus] || "").trim();
      if (!status) {
        discrepancies.push({
          id: `DISC-BLANK-STAT-${lead[mapping.sourceId] || indexGenerator()}-${Date.now()}`,
          type: "blank_status",
          severity: "high",
          sourceRecord: lead,
          crmRecord: match.crmRecord,
          details: `Matched lead "${sName}" has a blank and unpopulated status in CRM records.`,
          notes: "",
          assignedTo: String(match.crmRecord[mapping.crmAgent] || "Unassigned"),
          resolution: "Open",
          history: []
        });
      }

      // Level 4 / Low confidence flags
      if (match.confidence === 70) {
        discrepancies.push({
          id: `DISC-MANUAL-REV-${lead[mapping.sourceId] || indexGenerator()}-${Date.now()}`,
          type: "manual_review",
          severity: "medium",
          sourceRecord: lead,
          crmRecord: match.crmRecord,
          details: `Level 3 Match flag generated: Matched mainly via similar names (${sName} vs ${cName}) and cities. Manual crosschecking highly recommended.`,
          notes: "",
          assignedTo: "Unassigned",
          resolution: "Open",
          history: []
        });
      }

    } else {
      // Unmatched Source Lead -> Missing in CRM
      discrepancies.push({
        id: `DISC-MISS-CRM-${lead[mapping.sourceId] || indexGenerator()}-${Date.now()}`,
        type: "missing_in_crm",
        severity: "critical",
        sourceRecord: lead,
        details: `Source lead "${lead[mapping.sourceName]}" [Campaign: ${lead[mapping.sourceCampaign]}] is missing completely from CRM.`,
        notes: "",
        assignedTo: "Unassigned",
        resolution: "Open",
        history: []
      });
    }
  });

  // 3. Identify CRM Leads missing in Source Leads
  crmLeads.forEach(crm => {
    const crmId = String(crm[mapping.crmId]);
    if (!matchedCrmIds.has(crmId)) {
      discrepancies.push({
        id: `DISC-MISS-SRC-${crmId || indexGenerator()}-${Date.now()}`,
        type: "missing_in_source",
        severity: "low",
        crmRecord: crm,
        details: `CRM record "${crm[mapping.crmName]}" [Agent: ${crm[mapping.crmAgent]}] does not match any incoming leads from Social advertisement files.`,
        notes: "",
        assignedTo: String(crm[mapping.crmAgent] || "Unassigned"),
        resolution: "Open",
        history: []
      });
    }
  });

  // Calculate stats
  const totalSource = sourceLeads.length;
  const totalCrm = crmLeads.length;
  const matchedCount = matchedSourceIds.size;
  const unmatchedSourceCount = totalSource - matchedCount;
  const unmatchedCrmCount = totalCrm - matchedCrmIds.size;
  const blankStatusCount = discrepancies.filter(d => d.type === "blank_status").length;
  const duplicateCount = discrepancies.filter(d => d.type === "duplicate_lead").length;

  const dataQualityScore = totalSource ? Math.round((matchedCount / totalSource) * 100) : 100;
  const reconciliationScore = 100; // Updated as resolutions occur on current issues

  // 4. Calculate Grouped Campaigns Analytics
  const campaignMap = new Map<string, { leads: number; crm: number; matched: number; booked: number }>();
  sourceLeads.forEach(lead => {
    const camp = String(lead[mapping.sourceCampaign] || "Default Campaign");
    if (!campaignMap.has(camp)) {
      campaignMap.set(camp, { leads: 0, crm: 0, matched: 0, booked: 0 });
    }
    const val = campaignMap.get(camp)!;
    val.leads += 1;
    if (matchedSourceIds.has(String(lead[mapping.sourceId]))) {
      val.matched += 1;
    }
  });

  crmLeads.forEach(crm => {
    // Find matching source lead to identify campaign, defaults to unmapped
    let finalCamp = "Organic Entry";
    const matchedPair = matchedPairs.find(p => String(p.crm[mapping.crmId]) === String(crm[mapping.crmId]));
    if (matchedPair) {
      finalCamp = String(matchedPair.source[mapping.sourceCampaign] || "Default Campaign");
    }

    if (!campaignMap.has(finalCamp)) {
      campaignMap.set(finalCamp, { leads: 0, crm: 0, matched: 0, booked: 0 });
    }
    const val = campaignMap.get(finalCamp)!;
    val.crm += 1;

    const status = String(crm[mapping.crmStatus] || "").toLowerCase();
    if (status === "booked" || status === "closed") {
      val.booked += 1;
    }
  });

  const campaignMetrics: CampaignMetric[] = Array.from(campaignMap.entries()).map(([name, data]) => {
    return {
      campaignName: name,
      leadsGenerated: data.leads,
      crmRecords: data.crm,
      matched: data.matched,
      missing: Math.max(0, data.leads - data.matched),
      booked: data.booked,
      conversionRate: data.leads ? Math.round((data.booked / data.leads) * 100) : 0
    };
  });

  // 5. Calculate Grouped Agents Performance
  const agentMap = new Map<string, { assigned: number; updated: number; pending: number; booked: number }>();
  crmLeads.forEach(crm => {
    const agName = String(crm[mapping.crmAgent] || "Unassigned");
    if (!agentMap.has(agName)) {
      agentMap.set(agName, { assigned: 0, updated: 0, pending: 0, booked: 0 });
    }
    const val = agentMap.get(agName)!;
    val.assigned += 1;

    const status = String(crm[mapping.crmStatus] || "").trim();
    if (status) {
      val.updated += 1;
    } else {
      val.pending += 1;
    }

    const lowerStatus = status.toLowerCase();
    if (lowerStatus === "booked" || lowerStatus === "closed") {
      val.booked += 1;
    }
  });

  const agentMetrics: AgentMetric[] = Array.from(agentMap.entries()).map(([name, data]) => {
    return {
      agentName: name,
      totalAssigned: data.assigned,
      updated: data.updated,
      pending: data.pending,
      booked: data.booked,
      conversionRate: data.assigned ? Math.round((data.booked / data.assigned) * 100) : 0
    };
  });

  return {
    discrepancies,
    campaignMetrics,
    agentMetrics,
    stats: {
      totalSource,
      totalCrm,
      matchedCount,
      unmatchedSourceCount,
      unmatchedCrmCount,
      blankStatusCount,
      duplicateCount,
      dataQualityScore,
      reconciliationScore
    }
  };
}

let indexCounter = 0;
function indexGenerator(): string {
  indexCounter += 1;
  return `IDX-${indexCounter}`;
}
