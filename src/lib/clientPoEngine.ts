export interface ItemLine {
  id?: string;
  itemIndex: number;
  desc: string;
  uom: string;
  qty: number;
  unitPrice: number;
  value: number;
}

export interface Milestone {
  id?: string;
  label: string;
  mode: string; // 'percent' | 'fixed'
  value: number;
  basis?: string;
}

export interface AdvancePayment {
  id: string;
  date: string;
  amount: number;
  ref?: string;
  note?: string;
}

export interface ItemAllocation {
  itemId?: string;
  itemIndex: number;
  qty: number;
}

export interface ProductionEntry {
  id: string;
  date: string;
  qty: number;
  value: number;
  note?: string;
  allocations: ItemAllocation[];
}

export interface DispatchEntry {
  id: string;
  date: string;
  qty: number;
  value: number;
  note?: string;
  allocations: ItemAllocation[];
}

export interface InvoiceEntry {
  id: string;
  date: string;
  qty: number;
  value: number;
  dueDate: string;
  note?: string;
  allocations: ItemAllocation[];
}

export interface CustomerPayment {
  id: string;
  date: string;
  amount: number;
  type?: string; // 'dispatch' | 'advance' | 'installation' | 'retention'
  ref?: string;
  note?: string;
}

export interface InstallationEntry {
  id: string;
  date: string;
  qty: number;
  note?: string;
  allocations: ItemAllocation[];
}

export interface InstallInvoiceEntry {
  id: string;
  date: string;
  qty: number;
  value: number;
  dueDate: string;
  note?: string;
  allocations: ItemAllocation[];
}

export interface RetentionState {
  started: boolean;
  startDate?: string | null;
  amount: number;
  periodMonths: number;
  releaseDate?: string | null;
  released: boolean;
  releasedDate?: string | null;
}

export interface HistoryEntry {
  id: string;
  ts: string;
  type: string;
  text: string;
}

export interface ClientPoGraph {
  id: string;
  poNumber: string;
  client: string;
  clientId?: string;
  project: string;
  projectId?: string;
  vendor: string;
  poDate: string;
  deliveryDate: string;
  status: string;
  totalBasic: number;
  totalTax: number;
  totalOrderValue: number;
  termsRaw: string;
  creditDays: number;
  retentionMonths: number;
  notes: string;
  items: ItemLine[];
  milestones: Milestone[];
  lifecycle: {
    advancePayments: AdvancePayment[];
    productions: ProductionEntry[];
    dispatches: DispatchEntry[];
    invoices: InvoiceEntry[];
    customerPayments: CustomerPayment[];
    installations: InstallationEntry[];
    installationInvoices: InstallInvoiceEntry[];
    installationPayments: any[];
    retention: RetentionState;
    history: HistoryEntry[];
  };
}

export function fmt(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '₹0';
  return '₹' + Math.round(num).toLocaleString('en-IN');
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string | null | undefined, days: number): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(dateStr1: string | null | undefined, dateStr2: string | null | undefined): number {
  if (!dateStr1 || !dateStr2) return 0;
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function milestoneTarget(m: Milestone, totalPOValue: number): number {
  if (!m) return 0;
  if (m.mode === 'fixed') return m.value || 0;
  return ((m.value || 0) / 100) * totalPOValue;
}

export function milestoneReceivedAmount(m: Milestone, po: ClientPoGraph): number {
  if (!m || !po) return 0;
  const target = milestoneTarget(m, po.totalOrderValue || 0);
  const cat = classifyMilestone(m.label);
  const lc = po.lifecycle || {};
  const advRecv = (lc.advancePayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const custPayments = lc.customerPayments || [];
  const dispRecv = custPayments.filter(p => !p.type || p.type === 'dispatch').reduce((s, p) => s + (p.amount || 0), 0);
  const instRecv = custPayments.filter(p => p.type === 'installation').reduce((s, p) => s + (p.amount || 0), 0);
  const retRecv = custPayments.filter(p => p.type === 'retention').reduce((s, p) => s + (p.amount || 0), 0);

  if (cat === 'Advance') return Math.min(target, advRecv);
  if (cat === 'Post-delivery') return Math.min(target, dispRecv);
  if (cat === 'Post-installation') return Math.min(target, instRecv);
  if (cat === 'Retention') return Math.min(target, retRecv);
  if (cat === 'Full payment') return Math.min(target, advRecv + dispRecv + instRecv + retRecv);
  return 0;
}

export const MS_CATEGORIES = [
  'Advance',
  'Post-delivery',
  'Post-installation',
  'Retention',
  'Full payment'
] as const;

export type MilestoneCategory = typeof MS_CATEGORIES[number];

export function classifyMilestone(label: string): MilestoneCategory {
  const l = (label || '').toLowerCase();
  if (l.includes('advance') || l.includes('abg') || l.includes('pdc') || l.includes('signing')) return 'Advance';
  if (l.includes('retention') || l.includes('defect') || l.includes('dlp')) return 'Retention';
  if (l.includes('install') || l.includes('handover') || l.includes('commissioning')) return 'Post-installation';
  if (l.includes('delivery') || l.includes('dispatch') || l.includes('receipt at site') || l.includes('supply')) return 'Post-delivery';
  if (l.includes('full') || l.includes('100%') || l.includes('immediately')) return 'Full payment';
  return 'Post-delivery';
}

export function poFinancials(po: ClientPoGraph) {
  const total = po.totalOrderValue || 0;
  const lc = po.lifecycle || {};

  const totalAdvance = (lc.advancePayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const totalCustomer = (lc.customerPayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const received = totalAdvance + totalCustomer;
  const receivable = Math.max(0, total - received);

  return { total, received, receivable };
}

export function computeMilestoneBreakdown(pos: ClientPoGraph[]) {
  const byClient: Record<string, any> = {};

  const overall: Record<string, any> = {
    totalPOValue: 0,
    totalReceived: 0,
    receivable: 0,
    'Advance': { target: 0, received: 0, pending: 0 },
    'Post-delivery': { target: 0, received: 0, pending: 0 },
    'Post-installation': { target: 0, received: 0, pending: 0 },
    'Retention': { target: 0, received: 0, pending: 0 },
    'Full payment': { target: 0, received: 0, pending: 0 }
  };

  pos.forEach(po => {
    const clientName = po.client || 'Unassigned';
    if (!byClient[clientName]) {
      byClient[clientName] = {
        clientName,
        pos: [],
        totals: {
          totalPOValue: 0,
          totalReceived: 0,
          receivable: 0,
          'Advance': { target: 0, received: 0, pending: 0 },
          'Post-delivery': { target: 0, received: 0, pending: 0 },
          'Post-installation': { target: 0, received: 0, pending: 0 },
          'Retention': { target: 0, received: 0, pending: 0 },
          'Full payment': { target: 0, received: 0, pending: 0 }
        }
      };
    }

    const cData = byClient[clientName];
    const fin = poFinancials(po);

    cData.totals.totalPOValue += fin.total;
    cData.totals.totalReceived += fin.received;
    cData.totals.receivable += fin.receivable;

    overall.totalPOValue += fin.total;
    overall.totalReceived += fin.received;
    overall.receivable += fin.receivable;

    const lc = po.lifecycle || {};
    const advRecv = (lc.advancePayments || []).reduce((s, p) => s + (p.amount || 0), 0);
    const dispRecv = (lc.customerPayments || []).filter(p => !p.type || p.type === 'dispatch').reduce((s, p) => s + (p.amount || 0), 0);
    const instRecv = (lc.customerPayments || []).filter(p => p.type === 'installation').reduce((s, p) => s + (p.amount || 0), 0);
    const retRecv = (lc.customerPayments || []).filter(p => p.type === 'retention').reduce((s, p) => s + (p.amount || 0), 0);

    const msMap: Record<MilestoneCategory, number> = {
      'Advance': 0,
      'Post-delivery': 0,
      'Post-installation': 0,
      'Retention': 0,
      'Full payment': 0
    };

    (po.milestones || []).forEach(m => {
      const cat = classifyMilestone(m.label);
      const val = milestoneTarget(m, fin.total);
      msMap[cat] += val;
    });

    const catRecvMap: Record<MilestoneCategory, number> = {
      'Advance': advRecv,
      'Post-delivery': dispRecv,
      'Post-installation': instRecv,
      'Retention': retRecv,
      'Full payment': advRecv + dispRecv + instRecv + retRecv
    };

    MS_CATEGORIES.forEach(cat => {
      const target = msMap[cat];
      const rec = Math.min(target, catRecvMap[cat]);
      const pend = Math.max(0, target - rec);

      cData.totals[cat].target += target;
      cData.totals[cat].received += rec;
      cData.totals[cat].pending += pend;

      overall[cat].target += target;
      overall[cat].received += rec;
      overall[cat].pending += pend;
    });

    cData.pos.push(po);
  });

  return { byClient, overall };
}

export function computeLifecycle(po: ClientPoGraph) {
  const lc = po.lifecycle || {};
  const totalPOValue = po.totalOrderValue || 0;
  const creditDays = po.creditDays || 30;
  const items = po.items || [];

  const milestones = po.milestones || [];
  let advMilestoneTarget = 0;

  milestones.forEach(m => {
    const cat = classifyMilestone(m.label);
    if (cat === 'Advance') {
      advMilestoneTarget += milestoneTarget(m, totalPOValue);
    }
  });

  const totalAdvanceReceived = (lc.advancePayments || []).reduce((s, p) => s + (p.amount || 0), 0);
  const advanceTargetValue = advMilestoneTarget;
  const pendingAdvance = Math.max(0, advanceTargetValue - totalAdvanceReceived);
  const advanceRatio = advanceTargetValue > 0 ? Math.min(1.0, totalAdvanceReceived / advanceTargetValue) : 1.0;

  const totalQtyOrdered = items.reduce((s, it) => s + (it.qty || 0), 0);
  const productionEligibleValue = totalPOValue * advanceRatio;
  const productionEligibleQty = Math.floor(totalQtyOrdered * advanceRatio);

  const productions = lc.productions || [];
  const totalProductionQty = productions.reduce((s, p) => s + (p.qty || 0), 0);
  const totalProductionValue = productions.reduce((s, p) => s + (p.value || 0), 0);

  const advanceConsumedByProduction = Math.min(totalAdvanceReceived, totalProductionValue);
  const availableAdvanceBalance = Math.max(0, totalAdvanceReceived - totalProductionValue);

  const remainingProductionCapacity = Math.max(0, productionEligibleValue - totalProductionValue);

  const dispatches = lc.dispatches || [];
  const totalDispatchedQty = dispatches.reduce((s, d) => s + (d.qty || 0), 0);
  const totalDispatchedValue = dispatches.reduce((s, d) => s + (d.value || 0), 0);

  const readyForDispatchValue = Math.max(0, totalProductionValue - totalDispatchedValue);
  const readyForDispatchQty = Math.max(0, totalProductionQty - totalDispatchedQty);

  const invoices = lc.invoices || [];
  const totalInvoiceValue = invoices.reduce((s, i) => s + (i.value || 0), 0);
  const totalInvoicedQty = invoices.reduce((s, i) => s + (i.qty || 0), 0);

  const pendingBillingValue = Math.max(0, totalDispatchedValue - totalInvoiceValue);
  const pendingBillingQty = Math.max(0, totalDispatchedQty - totalInvoicedQty);

  const customerPayments = lc.customerPayments || [];
  const totalDispatchPayments = customerPayments.filter(p => !p.type || p.type === 'dispatch').reduce((s, p) => s + (p.amount || 0), 0);
  const outstandingAmount = Math.max(0, totalInvoiceValue - totalDispatchPayments);

  const installations = lc.installations || [];
  const installedQty = installations.reduce((s, i) => s + (i.qty || 0), 0);
  const remainingInstallQty = Math.max(0, totalDispatchedQty - installedQty);
  const installationProgress = totalDispatchedQty > 0 ? Math.min(1.0, installedQty / totalDispatchedQty) : 0;

  const installInvoices = lc.installationInvoices || [];
  const installPayments = customerPayments.filter(p => p.type === 'installation');
  const manualInstallationBilling = installInvoices.reduce((s, i) => s + (i.value || 0), 0);
  const manualInstallationPayments = installPayments.reduce((s, p) => s + (p.amount || 0), 0);

  let dispatchMilestoneTarget = 0;
  let installMilestoneTarget = 0;
  milestones.forEach(m => {
    const cat = classifyMilestone(m.label);
    if (cat === 'Post-delivery') {
      dispatchMilestoneTarget += milestoneTarget(m, totalPOValue);
    } else if (cat === 'Post-installation') {
      installMilestoneTarget += milestoneTarget(m, totalPOValue);
    }
  });

  const installTargetValue = installMilestoneTarget > 0 ? installMilestoneTarget : (manualInstallationBilling > 0 ? manualInstallationBilling : 0);
  const installBillingApplicable = installMilestoneTarget > 0 || manualInstallationBilling > 0;
  const installationOutstanding = installBillingApplicable ? Math.max(0, (manualInstallationBilling || installTargetValue) - manualInstallationPayments) : 0;

  const productionAdvancePending = Math.max(0, totalProductionValue - totalAdvanceReceived);
  const installEligibleValue = advanceTargetValue > 0 ? (totalAdvanceReceived / advanceTargetValue) * installMilestoneTarget : 0;
  const unbilledAccrued = Math.max(0, installTargetValue - manualInstallationBilling);

  const itemStats = items.map(it => {
    let prodQ = 0, dispQ = 0, invQ = 0, instQ = 0, instInvQ = 0;

    productions.forEach(p => {
      (p.allocations || []).forEach(a => {
        if (a.itemIndex === it.itemIndex || a.itemId === it.id) prodQ += a.qty || 0;
      });
    });

    dispatches.forEach(d => {
      (d.allocations || []).forEach(a => {
        if (a.itemIndex === it.itemIndex || a.itemId === it.id) dispQ += a.qty || 0;
      });
    });

    invoices.forEach(inv => {
      (inv.allocations || []).forEach(a => {
        if (a.itemIndex === it.itemIndex || a.itemId === it.id) invQ += a.qty || 0;
      });
    });

    installations.forEach(inst => {
      (inst.allocations || []).forEach(a => {
        if (a.itemIndex === it.itemIndex || a.itemId === it.id) instQ += a.qty || 0;
      });
    });

    installInvoices.forEach(iinv => {
      (iinv.allocations || []).forEach(a => {
        if (a.itemIndex === it.itemIndex || a.itemId === it.id) instInvQ += a.qty || 0;
      });
    });

    return {
      id: it.id,
      index: it.itemIndex,
      desc: it.desc,
      orderedQty: it.qty,
      unitPrice: it.unitPrice || 0,
      productionQty: prodQ,
      dispatchedQty: dispQ,
      invoicedQty: invQ,
      installedQty: instQ,
      installInvoicedQty: instInvQ,
      remainingProdCapacityQtyForItem: Math.max(0, it.qty - prodQ),
      readyQtyForItem: Math.max(0, prodQ - dispQ),
      pendingInvoiceQty: Math.max(0, dispQ - invQ),
      eligibleForInstallQty: Math.max(0, dispQ - instQ),
      pendingInstallInvoiceQty: Math.max(0, instQ - instInvQ)
    };
  });

  let runningCollected = totalDispatchPayments;
  const invoiceAging = invoices.map(inv => {
    const invVal = inv.value || 0;
    let paidForThisInv = 0;

    if (runningCollected >= invVal) {
      paidForThisInv = invVal;
      runningCollected -= invVal;
    } else {
      paidForThisInv = runningCollected;
      runningCollected = 0;
    }

    const outstanding = Math.max(0, invVal - paidForThisInv);
    const dueDate = inv.dueDate || addDays(inv.date, creditDays);
    const timeline = timelineStatus(dueDate);
    const ovDays = daysBetween(dueDate, todayISO());

    return {
      ...inv,
      paid: paidForThisInv,
      outstanding,
      dueDate,
      timeline,
      overdueDays: ovDays > 0 ? ovDays : 0
    };
  });

  const completionConditionsMet = (
    totalDispatchedValue >= totalPOValue * 0.99 &&
    totalInvoiceValue >= totalDispatchedValue * 0.99 &&
    outstandingAmount <= 1.0 &&
    (installedQty >= totalDispatchedQty * 0.99 || totalDispatchedQty === 0) &&
    (installationOutstanding <= 1.0)
  );

  const retention = lc.retention || { started: false, amount: 0, periodMonths: 12, released: false };
  let retentionTargetValue = 0;
  milestones.forEach(m => {
    if (classifyMilestone(m.label) === 'Retention') {
      retentionTargetValue += milestoneTarget(m, totalPOValue);
    }
  });

  const retentionEligibleValue = advanceTargetValue > 0 ? (totalAdvanceReceived / advanceTargetValue) * retentionTargetValue : 0;
  const retentionPaymentsReceived = customerPayments.filter(p => p.type === 'retention').reduce((s, p) => s + (p.amount || 0), 0);
  const retentionDueAmount = retention.started ? retention.amount : retentionTargetValue;
  const retentionOutstanding = Math.max(0, retentionDueAmount - retentionPaymentsReceived);

  const installInvoiceAging = (lc.installationInvoices || []).map((inv: any) => {
    const invVal = inv.value || 0;
    const paid = Math.min(invVal, manualInstallationPayments);
    const outstanding = Math.max(0, invVal - paid);
    const dueDate = inv.dueDate || addDays(inv.date, creditDays);
    const ovDays = daysBetween(dueDate, todayISO());
    return { ...inv, paid, outstanding, dueDate, overdueDays: ovDays > 0 ? ovDays : 0 };
  });

  // ─── Stage Label (Exact Match to Prototype) ────────────────────────────────
  let currentStage = 'PO Released';
  if (totalAdvanceReceived > 0) currentStage = pendingAdvance > 0.5 ? 'Advance in Progress' : 'Advance Received';
  if (totalProductionValue > 0) currentStage = 'Production in Progress';
  if (readyForDispatchValue > 0.5 && totalDispatchedValue <= 0.5) currentStage = 'Ready for Dispatch';
  if (totalDispatchedValue > 0) currentStage = 'Dispatch in Progress';
  if (totalDispatchedValue >= totalPOValue - 0.5 && totalPOValue > 0) currentStage = 'Fully Dispatched';
  if (totalInvoiceValue > 0) currentStage = 'Dispatch Invoicing';
  if (totalInvoiceValue > 0 && outstandingAmount > 0.5) currentStage = 'Dispatch Payment Pending';
  if (totalInvoiceValue > 0 && outstandingAmount <= 0.5) currentStage = 'Dispatch Paid';
  if (installedQty > 0) currentStage = 'Installation in Progress';
  if (totalDispatchedQty > 0 && installedQty >= totalDispatchedQty) currentStage = 'Fully Installed';
  if (installBillingApplicable && manualInstallationBilling > 0) currentStage = 'Installation Invoicing';
  if (installBillingApplicable && manualInstallationBilling > 0 && installationOutstanding > 0.5) currentStage = 'Installation Payment Pending';
  if (installBillingApplicable && manualInstallationBilling > 0 && installationOutstanding <= 0.5) currentStage = 'Installation Paid';
  if (completionConditionsMet && retentionTargetValue > 0 && !retention.released) currentStage = 'Retention Period';
  if (retention.released) currentStage = 'Completed';

  // ─── Notifications (Exact Match to Prototype) ──────────────────────────────
  const notif: { level: 'info' | 'good' | 'warn' | 'danger'; text: string; category?: string }[] = [];
  const push = (level: 'info' | 'good' | 'warn' | 'danger', text: string, category?: string) => notif.push({ level, text, category });

  // Step 1: Advance
  if (advanceTargetValue > 0 && totalAdvanceReceived === 0) push('warn', 'Advance Payment is Pending.', 'advance');
  else if (pendingAdvance > 0.5) push('warn', `Advance partially received. Pending: ${fmt(pendingAdvance)}.`, 'advance');

  // Step 2: Production
  if (remainingProductionCapacity > 0.5) push('info', `${fmt(remainingProductionCapacity)} eligible for production based on advance received.`, 'production');
  if (productionAdvancePending > 0.5) push('warn', `Production value (${fmt(totalProductionValue)}) exceeds advance received (${fmt(totalAdvanceReceived)}) by ${fmt(productionAdvancePending)} — additional advance required.`, 'production');
  if (totalProductionValue >= totalPOValue - 0.5 && totalPOValue > 0) push('info', 'Production has reached the full PO value.', 'production');

  // Step 3: Dispatch
  if (readyForDispatchQty > 0.5) push('good', `${readyForDispatchQty} unit(s) ready for dispatch.`, 'dispatch');
  if (totalDispatchedValue >= totalPOValue - 0.5 && totalPOValue > 0) push('good', 'Complete PO has been dispatched.', 'dispatch');

  // Step 4: Dispatch Invoice
  if (pendingBillingValue > 0.5) push('warn', `Dispatch invoice pending for ${fmt(pendingBillingValue)}.`, 'dispatch-invoice');

  // Step 5: Customer Payment
  invoiceAging.forEach(inv => {
    if (inv.outstanding > 0.5) {
      if (inv.overdueDays > 0) push('danger', `Invoice ${(inv.id || '').slice(-5)} overdue by ${inv.overdueDays} day(s) — ${fmt(inv.outstanding)}.`, 'dispatch-payment');
      else push('warn', `Payment due for invoice ${inv.dueDate} — ${fmt(inv.outstanding)}.`, 'dispatch-payment');
    }
  });
  if (totalInvoiceValue > 0 && outstandingAmount <= 0.5) push('good', 'All dispatch invoices paid in full.', 'dispatch-payment');

  // Step 6: Installation
  if (remainingInstallQty > 0.5) push('warn', `Installation Pending — ${remainingInstallQty} unit(s).`, 'installation');
  if (totalDispatchedQty > 0 && installedQty >= totalDispatchedQty) push('good', 'All dispatched material has been installed.', 'installation');

  // Step 7: Installation Invoice
  if (installBillingApplicable && unbilledAccrued > 0.5) push('warn', `Installation Invoice Due — ${fmt(unbilledAccrued)} not yet formally invoiced.`, 'install-invoice');
  installInvoiceAging.forEach((inv: any) => {
    if (inv.outstanding > 0.5) {
      if (inv.overdueDays > 0) push('danger', `Installation invoice ${(inv.id || '').slice(-5)} overdue by ${inv.overdueDays} day(s) — ${fmt(inv.outstanding)}.`, 'install-payment');
      else push('warn', `Installation Payment Due — ${fmt(inv.outstanding)}, due ${inv.dueDate}.`, 'install-payment');
    }
  });
  if (installBillingApplicable && manualInstallationBilling > 0 && installationOutstanding <= 0.5) push('good', 'Installation Payment Completed.', 'install-payment');

  // Step 8: Retention
  if (retention.started && !retention.released) {
    push('info', `Retention started — release due ${retention.releaseDate || 'due date'}.`, 'retention');
  }
  if (retention.released) push('good', `Retention Released on ${retention.releasedDate || 'date'}.`, 'retention');

  return {
    stage: currentStage,
    totalPOValue,
    advanceTargetValue,
    totalAdvanceReceived,
    pendingAdvance,
    advanceRatio,
    productionEligibleValue,
    productionEligibleQty,
    totalProductionQty,
    totalProductionValue,
    advanceConsumedByProduction,
    availableAdvanceBalance,
    remainingProductionCapacity,
    dispMilestoneValue: dispatchMilestoneTarget,
    productionAdvancePending,
    totalDispatchedQty,
    totalDispatchedValue,
    readyForDispatchQty,
    readyForDispatchValue,
    totalInvoiceValue,
    totalInvoicedQty,
    pendingBillingValue,
    pendingBillingQty,
    totalDispatchPayments,
    outstandingAmount,
    installedQty,
    remainingInstallQty,
    installationProgress,
    installTargetValue,
    installEligibleValue,
    installMilestoneValueOnPO: installMilestoneTarget,
    manualInstallationBilling,
    manualInstallationPayments,
    unbilledAccrued,
    installBillingApplicable,
    installationOutstanding,
    itemStats,
    invoiceAging,
    installInvoiceAging,
    completionConditionsMet,
    retentionTargetValue,
    retentionMilestoneValueOnPO: retentionTargetValue,
    retentionEligibleValue,
    retentionPaymentsReceived,
    retentionDueAmount,
    retentionOutstanding,
    retention,
    notif,
    lc
  };
}

export function timelineStatus(dueDateStr: string | null | undefined): { status: string; days: number } {
  if (!dueDateStr) return { status: 'Unknown', days: 0 };
  const days = daysBetween(todayISO(), dueDateStr);
  if (days < 0) return { status: 'Overdue', days: Math.abs(days) };
  if (days === 0) return { status: 'Due Today', days: 0 };
  if (days <= 7) return { status: 'Due Soon', days };
  return { status: 'On Track', days };
}

export function normalizeCore(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/private\s+limited|pvt\s+ltd|pvt\.\s*ltd\.|llp|inc|corp|corporation|co\./gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  return d[m][n];
}

export function similarity(a: string, b: string): number {
  const normA = normalizeCore(a);
  const normB = normalizeCore(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const dist = levenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - dist / maxLen;
}

export function findSimilarClient(inputName: string, existingNames: string[], threshold = 0.7): string | null {
  if (!inputName || !inputName.trim()) return null;
  const normInput = normalizeCore(inputName);

  for (const existing of existingNames) {
    if (existing.trim().toLowerCase() === inputName.trim().toLowerCase()) return null;
    const normExisting = normalizeCore(existing);
    if (normInput === normExisting && normInput.length > 0) return existing;
    if (similarity(inputName, existing) >= threshold) return existing;
  }
  return null;
}

export function formatPoGraph(po: any): ClientPoGraph {
  return {
    id: po.id,
    poNumber: po.poNumber,
    client: po.client?.name || '',
    clientId: po.clientId,
    project: po.project?.name || '',
    projectId: po.projectId || undefined,
    vendor: po.vendor || 'Indian Timber Products',
    poDate: po.poDate ? po.poDate.toISOString().slice(0, 10) : '',
    deliveryDate: po.deliveryDate ? po.deliveryDate.toISOString().slice(0, 10) : '',
    status: po.status || 'Active',
    totalBasic: po.totalBasic || 0,
    totalTax: po.totalTax || 0,
    totalOrderValue: po.totalOrderValue || 0,
    termsRaw: po.termsRaw || '',
    creditDays: po.creditDays || 30,
    retentionMonths: po.retentionMonths || 12,
    notes: po.notes || '',
    items: (po.items || []).map((it: any) => ({
      id: it.id,
      itemIndex: it.itemIndex,
      desc: it.desc,
      uom: it.uom,
      qty: it.qty,
      unitPrice: it.unitPrice,
      value: it.value
    })),
    milestones: (po.milestones || []).map((m: any) => ({
      id: m.id,
      label: m.label,
      mode: m.mode,
      value: m.value,
      basis: m.basis
    })),
    lifecycle: {
      advancePayments: (po.advancePayments || []).map((p: any) => ({
        id: p.id,
        date: p.date ? p.date.toISOString().slice(0, 10) : '',
        amount: p.amount,
        ref: p.ref || '',
        note: p.note || ''
      })),
      productions: (po.productions || []).map((p: any) => ({
        id: p.id,
        date: p.date ? p.date.toISOString().slice(0, 10) : '',
        qty: p.qty,
        value: p.value,
        note: p.note || '',
        allocations: (p.allocations || []).map((a: any) => ({
          itemId: a.itemId,
          itemIndex: po.items.find((it: any) => it.id === a.itemId)?.itemIndex ?? 0,
          qty: a.qty
        }))
      })),
      dispatches: (po.dispatches || []).map((d: any) => ({
        id: d.id,
        date: d.date ? d.date.toISOString().slice(0, 10) : '',
        qty: d.qty,
        value: d.value,
        note: d.note || '',
        allocations: (d.allocations || []).map((a: any) => ({
          itemId: a.itemId,
          itemIndex: po.items.find((it: any) => it.id === a.itemId)?.itemIndex ?? 0,
          qty: a.qty
        }))
      })),
      invoices: (po.invoices || []).map((inv: any) => ({
        id: inv.id,
        date: inv.date ? inv.date.toISOString().slice(0, 10) : '',
        qty: inv.qty,
        value: inv.value,
        dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : '',
        note: inv.note || '',
        allocations: (inv.allocations || []).map((a: any) => ({
          itemId: a.itemId,
          itemIndex: po.items.find((it: any) => it.id === a.itemId)?.itemIndex ?? 0,
          qty: a.qty
        }))
      })),
      customerPayments: (po.customerPayments || []).map((p: any) => ({
        id: p.id,
        date: p.date ? p.date.toISOString().slice(0, 10) : '',
        amount: p.amount,
        type: p.type || 'dispatch',
        ref: p.ref || '',
        note: p.note || ''
      })),
      installations: (po.installations || []).map((inst: any) => ({
        id: inst.id,
        date: inst.date ? inst.date.toISOString().slice(0, 10) : '',
        qty: inst.qty,
        note: inst.note || '',
        allocations: (inst.allocations || []).map((a: any) => ({
          itemId: a.itemId,
          itemIndex: po.items.find((it: any) => it.id === a.itemId)?.itemIndex ?? 0,
          qty: a.qty
        }))
      })),
      installationInvoices: (po.installationInvoices || []).map((iinv: any) => ({
        id: iinv.id,
        date: iinv.date ? iinv.date.toISOString().slice(0, 10) : '',
        qty: iinv.qty,
        value: iinv.value,
        dueDate: iinv.dueDate ? iinv.dueDate.toISOString().slice(0, 10) : '',
        note: iinv.note || '',
        allocations: (iinv.allocations || []).map((a: any) => ({
          itemId: a.itemId,
          itemIndex: po.items.find((it: any) => it.id === a.itemId)?.itemIndex ?? 0,
          qty: a.qty
        }))
      })),
      installationPayments: [],
      retention: {
        started: po.retentionState?.started || false,
        startDate: po.retentionState?.startDate ? po.retentionState.startDate.toISOString().slice(0, 10) : null,
        amount: po.retentionState?.amount || 0,
        periodMonths: po.retentionState?.periodMonths || 12,
        releaseDate: po.retentionState?.releaseDate ? po.retentionState.releaseDate.toISOString().slice(0, 10) : null,
        released: po.retentionState?.released || false,
        releasedDate: po.retentionState?.releasedDate ? po.retentionState.releasedDate.toISOString().slice(0, 10) : null
      },
      history: (po.history || []).map((h: any) => ({
        id: h.id,
        ts: h.ts ? h.ts.toISOString() : new Date().toISOString(),
        type: h.type,
        text: h.text
      }))
    }
  };
}

export const includePoRelations = {
  client: true,
  project: true,
  items: true,
  milestones: true,
  advancePayments: true,
  productions: { include: { allocations: true } },
  dispatches: { include: { allocations: true } },
  invoices: { include: { allocations: true } },
  customerPayments: true,
  installations: { include: { allocations: true } },
  installationInvoices: { include: { allocations: true } },
  retentionState: true,
  history: { orderBy: { ts: 'desc' as const } }
};

