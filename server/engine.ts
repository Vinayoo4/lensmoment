import crypto from 'crypto';
import { db, readDB, writeDB } from './db';
import { AISuggestion, KPIEntry, KPIDefinition, Transaction } from '../src/shared/types';

/**
 * Runs the "Quantify Engine" business rules for a given workspace.
 * Automatically generates actionable suggestions on KPI and transaction updates.
 */
export async function runQuantifyEngine(workspaceId: string): Promise<void> {
  const kpis = await db.getKPIs(workspaceId);
  const transactions = await db.getTransactions(workspaceId);
  
  const currentSuggestions = await db.getAISuggestions(workspaceId);
  const activeSuggestionTypes = new Set(
    currentSuggestions.filter(s => s.status === 'todo').map(s => s.type)
  );

  const suggestionsToCreate: Omit<AISuggestion, 'id'>[] = [];

  // --- KPI Rules ---
  for (const kpi of kpis) {
    const entries = await db.getKPIEntries(workspaceId, kpi.id);
    if (entries.length === 0) continue;

    const lastEntry = entries[entries.length - 1];

    // Rule 1: KPI trends downward for 3+ consecutive entries
    if (entries.length >= 4) {
      const lastFour = entries.slice(-4); // [oldest, ..., newest]
      const isDeclining = 
        lastFour[3].value < lastFour[2].value &&
        lastFour[2].value < lastFour[1].value &&
        lastFour[1].value < lastFour[0].value;

      if (isDeclining && !activeSuggestionTypes.has(`decline_${kpi.id}`)) {
        suggestionsToCreate.push({
          workspaceId,
          type: `decline_${kpi.id}`,
          trigger: `KPI ${kpi.name} trends downward for 3+ consecutive entries`,
          text: `Your KPI "${kpi.name}" has shown a continuous downward trend over the past 4 entries (currently ${lastEntry.value} ${kpi.unit}). We suggest conducting a quick team sync to diagnose any friction or blockers.`,
          status: 'todo'
        });
      }
    }

    // Rule 2: KPI falls 20%+ below its target
    if (kpi.targetValue !== undefined && kpi.targetValue > 0) {
      const target = kpi.targetValue;
      const isTwentyPercentBelow = lastEntry.value < (target * 0.8);
      if (isTwentyPercentBelow && !activeSuggestionTypes.has(`below_target_${kpi.id}`)) {
        const pctBelow = Math.round((1 - lastEntry.value / target) * 100);
        suggestionsToCreate.push({
          workspaceId,
          type: `below_target_${kpi.id}`,
          trigger: `KPI ${kpi.name} is ${pctBelow}% below target`,
          text: `Alert: "${kpi.name}" has registered a value of ${lastEntry.value} ${kpi.unit}, which is ${pctBelow}% below your target of ${target} ${kpi.unit}. Consider revising marketing push or adjusting operations to make up the deficit.`,
          status: 'todo'
        });
      }
    }

    // Rule 3: Customer retention KPI falls below 40%
    const isRetentionKpi = kpi.name.toLowerCase().includes('retention');
    if (isRetentionKpi && lastEntry.value < 40 && !activeSuggestionTypes.has(`retention_critical_${kpi.id}`)) {
      suggestionsToCreate.push({
        workspaceId,
        type: `retention_critical_${kpi.id}`,
        trigger: 'Customer retention falls below 40%',
        text: `Critical Alert: Customer Retention Rate has dropped to ${lastEntry.value}% (below the 40% threshold). Retention below 40% strongly impacts long-term recurring revenue. Prioritize outreach to recently disengaged clients.`,
        status: 'todo'
      });
    }

    // Rule 4: Weekly revenue grows 10%+ week-over-week (positive suggestion)
    const isRevenueKpi = kpi.name.toLowerCase().includes('revenue');
    if (isRevenueKpi && entries.length >= 14) {
      // Current week (most recent 7 entries)
      const currentWeek = entries.slice(-7);
      const priorWeek = entries.slice(-14, -7);

      const currentSum = currentWeek.reduce((sum, e) => sum + e.value, 0);
      const priorSum = priorWeek.reduce((sum, e) => sum + e.value, 0);

      if (priorSum > 0 && currentSum >= priorSum * 1.1 && !activeSuggestionTypes.has(`revenue_growth_${kpi.id}`)) {
        const growthPct = Math.round(((currentSum - priorSum) / priorSum) * 100);
        suggestionsToCreate.push({
          workspaceId,
          type: `revenue_growth_${kpi.id}`,
          trigger: `Weekly revenue grew ${growthPct}% WoW`,
          text: `Excellent: Weekly revenue has experienced a major positive leap of ${growthPct}% WoW (from ${kpi.unit}${priorSum.toLocaleString()} to ${kpi.unit}${currentSum.toLocaleString()}). Analyze which sales pipelines or product features fueled this success!`,
          status: 'todo'
        });
      }
    }
  }

  // --- Transaction Rules ---
  const unreconciledTx = transactions.filter(t => t.status === 'unreconciled');
  const unreconciledCount = unreconciledTx.length;
  // Calculate total absolute volume of transactions pending reconciliation
  const unreconciledTotal = unreconciledTx.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Rule 5: More than 5 unreconciled transactions exist
  if (unreconciledCount > 5 && !activeSuggestionTypes.has('unreconciled_count_warning')) {
    suggestionsToCreate.push({
      workspaceId,
      type: 'unreconciled_count_warning',
      trigger: `Unreconciled count (${unreconciledCount}) exceeds 5`,
      text: `You have ${unreconciledCount} transactions pending ledger reconciliation. We suggest completing a reconciliation run to keep cash flow statements accurate.`,
      status: 'todo'
    });
  }

  // Rule 6: Unreconciled transaction total exceeds ₹10,000
  if (unreconciledTotal > 10000 && !activeSuggestionTypes.has('unreconciled_value_warning')) {
    suggestionsToCreate.push({
      workspaceId,
      type: 'unreconciled_value_warning',
      trigger: `Unreconciled total exceeds ₹10,000`,
      text: `Alert: Unreconciled transaction volume has reached ₹${unreconciledTotal.toLocaleString()}, crossing the threshold of ₹10,000. Keep your books compliant by reconciling these balances in the reconciliation tab.`,
      status: 'todo'
    });
  }

  // Insert any newly triggered suggestions
  if (suggestionsToCreate.length > 0) {
    const data = await readDB();
    for (const sug of suggestionsToCreate) {
      // Secondary safety check for duplicates in current read
      if (!data.aiSuggestions.some(s => s.workspaceId === workspaceId && s.type === sug.type && s.status === 'todo')) {
        const newSug = { ...sug, id: crypto.randomUUID() };
        data.aiSuggestions.push(newSug);
      }
    }
    await writeDB(data);
  }
}
