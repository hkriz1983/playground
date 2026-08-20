"use client";

import React, { useState, useEffect } from 'react';
import {
  ClientPoGraph,
  fmt,
  todayISO,
  milestoneTarget,
  poFinancials,
  computeMilestoneBreakdown,
  computeLifecycle,
  MS_CATEGORIES,
  classifyMilestone,
  addDays,
  daysBetween,
  timelineStatus,
  findSimilarClient,
  milestoneReceivedAmount
} from '@/lib/clientPoEngine';

export default function ClientPoPage() {
  const [pos, setPos] = useState<ClientPoGraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'poregister' | 'lifecycle' | 'action' | 'reports' | 'masters' | 'settings'>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters for PO Register
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Execution Lifecycle State
  const [lcSearch, setLcSearch] = useState('');
  const [activePoId, setActivePoId] = useState<string | number | null>(null);
  const [activeStageTab, setActiveStageTab] = useState<string>('lcs-advance');

  // Action Center Filters & Sorting
  const [acSearch, setAcSearch] = useState('');
  const [acClient, setAcClient] = useState('');
  const [acProject, setAcProject] = useState('');
  const [acStage, setAcStage] = useState('');
  const [acPriority, setAcPriority] = useState('');
  const [acBucketFilter, setAcBucketFilter] = useState('');

  // Reports Filters & Tab
  const [reportsFilterPo, setReportsFilterPo] = useState('');

  // Masters Management State
  const [mastersClients, setMastersClients] = useState<any[]>([]);
  const [mastersProjects, setMastersProjects] = useState<any[]>([]);
  const [mastersItems, setMastersItems] = useState<any[]>([]);
  const [mastersUoms, setMastersUoms] = useState<any[]>([]);
  const [mastersTab, setMastersTab] = useState<'clients' | 'projects' | 'items' | 'uoms'>('clients');

  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [primaryMergeId, setPrimaryMergeId] = useState('');
  const [secondaryMergeId, setSecondaryMergeId] = useState('');

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [showUomModal, setShowUomModal] = useState(false);
  const [editingUom, setEditingUom] = useState<any | null>(null);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailPoId, setDetailPoId] = useState<string | number | null>(null);

  // Form State for New/Edit PO
  const [fClient, setFClient] = useState('');
  const [fProject, setFProject] = useState('');
  const [fPoNumber, setFPoNumber] = useState('');
  const [fPoDate, setFPoDate] = useState(todayISO());
  const [fDelivery, setFDelivery] = useState('');
  const [fStatus, setFStatus] = useState('Active');
  const [fBasic, setFBasic] = useState('');
  const [fTaxMode, setFTaxMode] = useState<'cgst_sgst' | 'igst' | 'custom'>('cgst_sgst');
  const [fTaxRate, setFTaxRate] = useState<string>('18');
  const [fTax, setFTax] = useState('');
  const [fTotal, setFTotal] = useState('');
  const [fTermsRaw, setFTermsRaw] = useState('');
  const [fCreditDays, setFCreditDays] = useState('30');
  const [fRetentionMonths, setFRetentionMonths] = useState('12');
  const [fNotes, setFNotes] = useState('');
  const [fItems, setFItems] = useState<{ desc: string; qty: string; uom: string; unitPrice: string }[]>([]);
  const [fMilestones, setFMilestones] = useState<{ label: string; mode: string; value: string; basis: string }[]>([]);
  const [clientWarn, setClientWarn] = useState<string | null>(null);

  // Form State for Entry Inputs in Stage Panes
  const [lcInputs, setLcInputs] = useState<Record<string, any>>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const fetchPos = async () => {
    try {
      const res = await fetch('/api/client-po/pos');
      if (res.ok) {
        const data = await res.json();
        setPos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [resClients, resProjects, resItems, resUoms] = await Promise.all([
        fetch('/api/client-po/masters/clients'),
        fetch('/api/client-po/masters/projects'),
        fetch('/api/client-po/masters/items'),
        fetch('/api/client-po/masters/uoms')
      ]);
      if (resClients.ok) setMastersClients(await resClients.json());
      if (resProjects.ok) setMastersProjects(await resProjects.json());
      if (resItems.ok) setMastersItems(await resItems.json());
      if (resUoms.ok) setMastersUoms(await resUoms.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPos();
    fetchMasters();
  }, []);

  // Recalculate Basic Total, Tax Amount, and Total Order Value from Items & Tax Settings
  useEffect(() => {
    let sum = 0;
    fItems.forEach(it => {
      const q = Number(it.qty) || 0;
      const p = Number(it.unitPrice) || 0;
      sum += q * p;
    });
    setFBasic(String(sum));

    let computedTax = 0;
    if (fTaxMode === 'cgst_sgst' || fTaxMode === 'igst') {
      const rate = Number(fTaxRate) || 0;
      computedTax = Math.round(sum * (rate / 100));
      setFTax(String(computedTax));
    } else {
      computedTax = Number(fTax) || 0;
    }
    setFTotal(String(sum + computedTax));
  }, [fItems, fTaxMode, fTaxRate]);

  // Client Fuzzy Search Warning
  useEffect(() => {
    if (!showFormModal || !fClient) { setClientWarn(null); return; }
    const existingNames = pos.map(p => p.client);
    const similar = findSimilarClient(fClient, existingNames);
    if (similar) {
      setClientWarn(similar);
    } else {
      setClientWarn(null);
    }
  }, [fClient, pos, showFormModal]);

  const applyPreset20_60_15_5 = () => {
    setFMilestones([
      { label: 'Advance against ABG/PDC', mode: 'percent', value: '20', basis: 'On PO acceptance' },
      { label: 'Post-delivery (3–4 weeks from invoice)', mode: 'percent', value: '60', basis: 'On delivery' },
      { label: 'After installation & certification', mode: 'percent', value: '15', basis: 'On installation bill certification' },
      { label: 'Retention', mode: 'percent', value: '5', basis: '12 months after completion' }
    ]);
  };

  const applyPreset100_Immediate = () => {
    setFMilestones([
      { label: 'Full payment — payable immediately, due net', mode: 'percent', value: '100', basis: 'On invoice' }
    ]);
    setFTermsRaw('Payable immediately, due net');
  };

  const applyPresetClear = () => {
    setFMilestones([]);
  };

  const openPOForm = (poId?: string | number) => {
    if (poId) {
      const po = pos.find(p => p.id === poId);
      if (!po) return;
      setEditingPoId(poId);
      setFClient(po.client);
      setFProject(po.project);
      setFPoNumber(po.poNumber);
      setFPoDate(po.poDate || todayISO());
      setFDelivery(po.deliveryDate || '');
      setFStatus(po.status || 'Active');
      setFBasic(String(po.totalBasic || ''));
      setFTax(String(po.totalTax || ''));
      setFTotal(String(po.totalOrderValue || ''));
      setFTermsRaw(po.termsRaw || '');
      setFCreditDays(String(po.creditDays || 30));
      setFRetentionMonths(String(po.retentionMonths || 12));
      setFNotes(po.notes || '');
      setFItems((po.items || []).map(it => ({
        desc: it.desc,
        qty: String(it.qty),
        uom: it.uom || 'NUM',
        unitPrice: String(it.unitPrice)
      })));
      setFMilestones((po.milestones || []).map(m => ({
        label: m.label,
        mode: m.mode,
        value: String(m.value),
        basis: m.basis || ''
      })));
    } else {
      setEditingPoId(null);
      setFClient('');
      setFProject('');
      setFPoNumber('');
      setFPoDate(todayISO());
      setFDelivery('');
      setFStatus('Active');
      setFBasic('');
      setFTax('');
      setFTotal('');
      setFTermsRaw('');
      setFCreditDays('30');
      setFRetentionMonths('12');
      setFNotes('');
      setFItems([{ desc: '', qty: '', uom: 'NUM', unitPrice: '' }]);
      setFMilestones([
        { label: 'Advance against ABG/PDC', mode: 'percent', value: '20', basis: 'On PO acceptance' },
        { label: 'Post-delivery (3–4 weeks from invoice)', mode: 'percent', value: '60', basis: 'On delivery' },
        { label: 'After installation & certification', mode: 'percent', value: '15', basis: 'On installation bill' },
        { label: 'Retention', mode: 'percent', value: '5', basis: '12 months after completion' }
      ]);
    }
    setShowFormModal(true);
  };

  const handleSavePO = async () => {
    if (!fClient.trim() || !fPoNumber.trim()) {
      alert('Client and PO Number are required.');
      return;
    }

    const itemsPayload = fItems.map(it => ({
      desc: it.desc.trim(),
      qty: Number(it.qty) || 0,
      uom: it.uom.trim() || 'NUM',
      unitPrice: Number(it.unitPrice) || 0
    })).filter(it => it.desc || it.qty || it.unitPrice);

    const milestonesPayload = fMilestones.map(m => ({
      label: m.label.trim(),
      mode: m.mode,
      value: Number(m.value) || 0,
      basis: m.basis.trim()
    })).filter(m => m.label);

    const basicVal = Number(fBasic) || 0;
    const taxVal = Number(fTax) || 0;
    let totalVal = Number(fTotal) || (basicVal + taxVal);

    const payload = {
      client: fClient.trim(),
      project: fProject.trim(),
      poNumber: fPoNumber.trim(),
      poDate: fPoDate,
      deliveryDate: fDelivery,
      status: fStatus,
      totalBasic: basicVal,
      totalTax: taxVal,
      totalOrderValue: totalVal,
      termsRaw: fTermsRaw.trim(),
      creditDays: Number(fCreditDays) || 30,
      retentionMonths: Number(fRetentionMonths) || 12,
      notes: fNotes.trim(),
      items: itemsPayload,
      milestones: milestonesPayload
    };

    try {
      const url = editingPoId ? `/api/client-po/pos/${editingPoId}` : '/api/client-po/pos';
      const method = editingPoId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowFormModal(false);
        showToast(editingPoId ? 'Purchase order updated' : 'Purchase order saved');
        await fetchPos();
        await fetchMasters();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save PO');
      }
    } catch (e) {
      alert('Error saving PO');
    }
  };

  const handleDeletePO = async (id: string | number) => {
    if (!confirm('Delete this purchase order? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/client-po/pos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('PO deleted');
        setShowDetailModal(false);
        await fetchPos();
        await fetchMasters();
      }
    } catch (e) {
      alert('Error deleting PO');
    }
  };

  const submitStageTransaction = async (poId: string | number, stage: string, bodyData: any) => {
    try {
      const res = await fetch(`/api/client-po/pos/${poId}/lifecycle/${stage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      if (res.ok) {
        showToast('Recorded transaction');
        await fetchPos();
      } else {
        const err = await res.json();
        alert(err.error || 'Transaction failed');
      }
    } catch (e) {
      alert('Error recording transaction');
    }
  };

  const submitDeleteEntry = async (poId: string | number, arrayName: string, entryId: string) => {
    if (!confirm('Delete this transaction entry? Balances will re-calculate.')) return;
    try {
      const res = await fetch(`/api/client-po/pos/${poId}/lifecycle/entry?arrayName=${arrayName}&entryId=${entryId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Entry deleted');
        await fetchPos();
      }
    } catch (e) {
      alert('Error deleting entry');
    }
  };

  const handleSaveClient = async () => {
    if (!editingClient?.name?.trim()) return;
    try {
      const url = '/api/client-po/masters/clients';
      const method = editingClient.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClient)
      });
      if (res.ok) {
        setShowClientModal(false);
        showToast(editingClient.id ? 'Client updated' : 'Client created');
        await fetchMasters();
        await fetchPos();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save client');
      }
    } catch (e) {
      alert('Error saving client');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Delete this client master?')) return;
    try {
      const res = await fetch(`/api/client-po/masters/clients?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Client deleted');
        await fetchMasters();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete client');
      }
    } catch (e) {
      alert('Error deleting client');
    }
  };

  const handleMergeClients = async () => {
    if (!primaryMergeId || !secondaryMergeId) {
      alert('Please select both primary and secondary clients.');
      return;
    }
    if (!confirm('Merge secondary client into primary? All POs will be re-linked.')) return;
    try {
      const res = await fetch('/api/client-po/masters/clients/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryClientId: primaryMergeId, secondaryClientId: secondaryMergeId })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Clients merged successfully');
        setShowMergeModal(false);
        await fetchMasters();
        await fetchPos();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to merge clients');
      }
    } catch (e) {
      alert('Error merging clients');
    }
  };

  const handleSaveProject = async () => {
    if (!editingProject?.name?.trim() || !editingProject?.clientId) {
      alert('Client and Project Name are required.');
      return;
    }
    try {
      const url = '/api/client-po/masters/projects';
      const method = editingProject.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProject)
      });
      if (res.ok) {
        setShowProjectModal(false);
        showToast(editingProject.id ? 'Project updated' : 'Project created');
        await fetchMasters();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save project');
      }
    } catch (e) {
      alert('Error saving project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project master?')) return;
    try {
      const res = await fetch(`/api/client-po/masters/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Project deleted');
        await fetchMasters();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete project');
      }
    } catch (e) {
      alert('Error deleting project');
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem?.name?.trim()) {
      alert('Item Name is required.');
      return;
    }
    try {
      const url = '/api/client-po/masters/items';
      const method = editingItem.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      });
      if (res.ok) {
        setShowItemModal(false);
        showToast(editingItem.id ? 'Line Item updated' : 'Line Item created');
        await fetchMasters();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save Line Item');
      }
    } catch (e) {
      alert('Error saving Line Item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this Line Item Master?')) return;
    try {
      const res = await fetch(`/api/client-po/masters/items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Line Item deleted');
        await fetchMasters();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete Line Item');
      }
    } catch (e) {
      alert('Error deleting Line Item');
    }
  };

  const handleSaveUom = async () => {
    if (!editingUom?.code?.trim() || !editingUom?.name?.trim()) {
      alert('UOM Code and Name are required.');
      return;
    }
    try {
      const url = '/api/client-po/masters/uoms';
      const method = editingUom.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUom)
      });
      if (res.ok) {
        setShowUomModal(false);
        showToast(editingUom.id ? 'UOM updated' : 'UOM created');
        await fetchMasters();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save UOM');
      }
    } catch (e) {
      alert('Error saving UOM');
    }
  };

  const handleDeleteUom = async (id: string) => {
    if (!confirm('Delete this UOM Master?')) return;
    try {
      const res = await fetch(`/api/client-po/masters/uoms?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('UOM deleted');
        await fetchMasters();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete UOM');
      }
    } catch (e) {
      alert('Error deleting UOM');
    }
  };


  const filteredPos = pos.filter(p => {
    if (filterClient && p.client !== filterClient) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      const match = p.poNumber.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || (p.project || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const selectedLcPo = pos.find(p => p.id === activePoId);
  const selectedLcCalc = selectedLcPo ? computeLifecycle(selectedLcPo) : null;
  const currentDetailPo = pos.find(p => p.id === detailPoId);
  const currentDetailFin = currentDetailPo ? poFinancials(currentDetailPo) : null;

  return (
    <div className="min-h-screen bg-[#F6F2E9] text-[#1B2A41] font-sans">
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1B2A41] text-white px-6 py-2.5 rounded-full text-sm shadow-xl z-50 animate-bounce">
          {toastMsg}
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#1B2A41] text-[#EDE6D6] border-b-4 border-[#B8862E] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="border-r border-white/20 pr-4">
              <div className="font-serif font-bold text-lg text-white">Client PO Register</div>
              <div className="font-mono text-[10px] text-[#E4C583]">v2.0 · Indian Timber Products</div>
            </div>
          </div>

          <button className="md:hidden text-white p-2 rounded bg-white/10" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            ☰ Menu
          </button>

          <ul className={`md:flex items-center gap-1 font-medium text-sm ${mobileNavOpen ? 'flex flex-col absolute top-16 left-0 right-0 bg-[#1B2A41] p-4 border-b border-white/20 z-50' : 'hidden'}`}>
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'poregister', label: 'PO Register' },
              { id: 'lifecycle', label: 'Execution Lifecycle' },
              { id: 'action', label: 'Action Center' },
              { id: 'reports', label: 'Reports' },
              { id: 'masters', label: 'Masters' },
              { id: 'settings', label: 'Settings' },
            ].map(tab => (
              <li key={tab.id}>
                <button
                  className={`px-4 py-2 rounded-md transition-colors ${currentPage === tab.id ? 'bg-[#B8862E] text-white font-semibold' : 'text-[#D9D2C0] hover:text-white hover:bg-white/10'}`}
                  onClick={() => { setCurrentPage(tab.id as any); setMobileNavOpen(false); }}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8CFB8] pb-4 mb-6">
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#1B2A41]">
              {currentPage === 'dashboard' && 'Dashboard'}
              {currentPage === 'poregister' && 'Client Purchase Order Register'}
              {currentPage === 'lifecycle' && 'Execution Lifecycle Workspace'}
              {currentPage === 'action' && 'Action Center (Priority Work Queue)'}
              {currentPage === 'reports' && 'Milestone & Execution Reports'}
              {currentPage === 'masters' && 'Masters Management (Clients & Projects)'}
              {currentPage === 'settings' && 'Application Settings'}
            </h1>
            <p className="text-xs text-[#3A4A63] mt-1">
              Indian Timber Products · Receivables, Delivery & Lifecycle Engine
            </p>
          </div>
          <div className="font-mono text-xs text-[#B8862E] bg-[#FFFDF8] border border-[#D8CFB8] px-3 py-1.5 rounded shadow-sm">
            Total POs: {pos.length}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-[#B8862E] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* DASHBOARD */}
            {currentPage === 'dashboard' && (
              <div className="space-y-6">
                {(() => {
                  let totalVal = 0, totalRecv = 0, totalReceivable = 0, activeCount = 0;
                  pos.forEach(p => {
                    const f = poFinancials(p);
                    totalVal += f.total;
                    totalRecv += f.received;
                    totalReceivable += f.receivable;
                    if (p.status === 'Active') activeCount++;
                  });
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-4 rounded-lg shadow-sm border-l-4 border-l-[#B8862E]">
                        <div className="text-xs uppercase text-[#3A4A63] font-semibold">Total Contract Value</div>
                        <div className="font-mono text-2xl font-bold mt-1">{fmt(totalVal)}</div>
                        <div className="text-xs text-[#3A4A63] mt-1">{pos.length} POs on file</div>
                      </div>
                      <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-4 rounded-lg shadow-sm border-l-4 border-l-[#3F6E4E]">
                        <div className="text-xs uppercase text-[#3A4A63] font-semibold">Total Received</div>
                        <div className="font-mono text-2xl font-bold mt-1 text-[#3F6E4E]">{fmt(totalRecv)}</div>
                        <div className="text-xs text-[#3A4A63] mt-1">across all milestones</div>
                      </div>
                      <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-4 rounded-lg shadow-sm border-l-4 border-l-[#A9432F]">
                        <div className="text-xs uppercase text-[#3A4A63] font-semibold">Total Receivable</div>
                        <div className="font-mono text-2xl font-bold mt-1 text-[#A9432F]">{fmt(totalReceivable)}</div>
                        <div className="text-xs text-[#3A4A63] mt-1">outstanding across stages</div>
                      </div>
                      <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-4 rounded-lg shadow-sm border-l-4 border-l-[#1B2A41]">
                        <div className="text-xs uppercase text-[#3A4A63] font-semibold">Active Orders</div>
                        <div className="font-mono text-2xl font-bold mt-1">{activeCount}</div>
                        <div className="text-xs text-[#3A4A63] mt-1">POs currently active</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'action', title: 'Action Center', sub: 'Triggers & alerts needing attention' },
                    { id: 'poregister', title: 'Client PO Register', sub: 'Browse & manage purchase orders' },
                    { id: 'lifecycle', title: 'Execution Lifecycle', sub: 'Record advance, dispatch, invoicing' },
                    { id: 'reports', title: 'Reports & Analytics', sub: 'Milestone breakdown by client' },
                  ].map(tile => (
                    <div
                      key={tile.id}
                      onClick={() => setCurrentPage(tile.id as any)}
                      className="bg-[#FFFDF8] border border-[#D8CFB8] hover:border-[#B8862E] p-4 rounded-lg shadow-sm cursor-pointer transition-transform hover:-translate-y-1"
                    >
                      <div className="font-serif font-semibold text-base text-[#1B2A41]">{tile.title}</div>
                      <div className="text-xs text-[#3A4A63] mt-1">{tile.sub}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="font-serif font-semibold text-lg mb-3">Payment Milestone Breakdown — Portfolio</div>
                  {(() => {
                    const { overall } = computeMilestoneBreakdown(pos);
                    const cats = MS_CATEGORIES.filter(c => overall[c].target !== 0 || overall[c].received !== 0);
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div className="bg-[#FFFDF8] border border-[#A9432F] p-4 rounded-lg shadow-sm">
                          <div className="text-xs font-semibold uppercase text-[#3A4A63]">Total Receivable</div>
                          <div className="font-mono text-xl font-bold text-[#A9432F] mt-2">{fmt(overall.receivable)}</div>
                        </div>
                        {cats.map(cat => (
                          <div key={cat} className="bg-[#FFFDF8] border border-[#D8CFB8] p-4 rounded-lg shadow-sm">
                            <div className="text-xs font-semibold uppercase text-[#3A4A63]">{cat}</div>
                            <div className="flex justify-between text-xs font-mono mt-2"><span>Due:</span><b>{fmt(overall[cat].target)}</b></div>
                            <div className="flex justify-between text-xs font-mono mt-1 text-[#3F6E4E]"><span>Recv:</span><b>{fmt(overall[cat].received)}</b></div>
                            <div className="flex justify-between text-xs font-mono mt-1 text-[#A9432F]"><span>Pend:</span><b>{fmt(overall[cat].pending)}</b></div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* PO REGISTER */}
            {currentPage === 'poregister' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      className="bg-[#FFFDF8] border border-[#D8CFB8] px-3 py-2 rounded text-xs"
                      value={filterClient}
                      onChange={e => setFilterClient(e.target.value)}
                    >
                      <option value="">All Clients</option>
                      {Array.from(new Set(pos.map(p => p.client))).sort().map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      className="bg-[#FFFDF8] border border-[#D8CFB8] px-3 py-2 rounded text-xs"
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Search PO no / project..."
                      className="bg-[#FFFDF8] border border-[#D8CFB8] px-3 py-2 rounded text-xs w-60"
                      value={filterSearch}
                      onChange={e => setFilterSearch(e.target.value)}
                    />
                  </div>
                  <button className="bg-[#B8862E] hover:bg-[#a07425] text-white px-4 py-2 rounded font-semibold text-xs transition-colors" onClick={() => openPOForm()}>
                    + New PO
                  </button>
                </div>

                <div className="bg-[#FFFDF8] border border-[#D8CFB8] rounded-lg overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                    <thead className="bg-[#EDE6D6] text-[#3A4A63] uppercase text-[10.5px] font-semibold border-b border-[#D8CFB8]">
                      <tr>
                        <th className="p-3">PO No.</th>
                        <th className="p-3">Client</th>
                        <th className="p-3">Project</th>
                        <th className="p-3">PO Date</th>
                        <th className="p-3 text-right">Order Value</th>
                        <th className="p-3 text-right">Received</th>
                        <th className="p-3 text-right">Receivable</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8CFB8]">
                      {filteredPos.length === 0 ? (
                        <tr><td colSpan={9} className="p-6 text-center text-[#3A4A63]">No purchase orders found.</td></tr>
                      ) : (
                        filteredPos.map(po => {
                          const f = poFinancials(po);
                          return (
                            <tr
                              key={po.id}
                              className="hover:bg-[#FBF7EC] cursor-pointer transition-colors"
                              onClick={() => { setDetailPoId(po.id); setShowDetailModal(true); }}
                            >
                              <td className="p-3 font-mono font-bold text-[#B8862E]">{po.poNumber}</td>
                              <td className="p-3 font-semibold text-[#1B2A41]">{po.client}</td>
                              <td className="p-3 text-[#3A4A63]">{po.project || '—'}</td>
                              <td className="p-3 font-mono text-[#3A4A63]">{po.poDate || '—'}</td>
                              <td className="p-3 font-mono text-right">{fmt(f.total)}</td>
                              <td className="p-3 font-mono text-right text-[#3F6E4E]">{fmt(f.received)}</td>
                              <td className="p-3 font-mono text-right font-semibold text-[#A9432F]">{fmt(f.receivable)}</td>
                              <td className="p-3">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${po.status === 'Closed' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-800'}`}>
                                  {po.status}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2" onClick={e => e.stopPropagation()}>
                                <button className="px-2 py-1 border border-[#1B2A41] text-[#1B2A41] hover:bg-[#1B2A41] hover:text-white rounded text-[11px] font-medium" onClick={() => openPOForm(po.id)}>
                                  Edit
                                </button>
                                <button className="px-2 py-1 border border-[#A9432F] text-[#A9432F] hover:bg-[#A9432F] hover:text-white rounded text-[11px] font-medium" onClick={() => handleDeletePO(po.id)}>
                                  Del
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EXECUTION LIFECYCLE */}
            {currentPage === 'lifecycle' && (
              <div className="space-y-6">
                {!selectedLcPo ? (
                  <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-6 rounded-lg shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-serif font-semibold text-lg">Find a Purchase Order</h3>
                      <span className="text-xs text-[#3A4A63] font-mono">Select a PO to view & record execution</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Search by PO Number, Client, Project, or Vendor..."
                      className="w-full bg-[#F6F2E9] border border-[#D8CFB8] px-4 py-2.5 rounded text-sm focus:outline-none focus:border-[#B8862E]"
                      value={lcSearch}
                      onChange={e => setLcSearch(e.target.value)}
                    />
                    <div className="overflow-x-auto border border-[#D8CFB8] rounded">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#EDE6D6] text-[#3A4A63] uppercase text-[10px] font-semibold border-b border-[#D8CFB8]">
                          <tr>
                            <th className="p-2.5">PO No.</th>
                            <th className="p-2.5">Client</th>
                            <th className="p-2.5">Project</th>
                            <th className="p-2.5">Stage</th>
                            <th className="p-2.5 text-right">Value</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D8CFB8]">
                          {pos
                            .filter(p => {
                              if (!lcSearch) return true;
                              const q = lcSearch.toLowerCase();
                              return p.poNumber.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || (p.project || '').toLowerCase().includes(q);
                            })
                            .map(p => {
                              const calc = computeLifecycle(p);
                              const f = poFinancials(p);
                              return (
                                <tr key={p.id} className="hover:bg-[#FBF7EC] cursor-pointer" onClick={() => setActivePoId(p.id)}>
                                  <td className="p-2.5 font-mono font-bold text-[#B8862E]">{p.poNumber}</td>
                                  <td className="p-2.5 font-semibold">{p.client}</td>
                                  <td className="p-2.5 text-[#3A4A63]">{p.project || '—'}</td>
                                  <td className="p-2.5"><span className="bg-[#EDE6D6] text-[#3A4A63] px-2 py-0.5 rounded text-[10px] font-semibold">{calc.stage}</span></td>
                                  <td className="p-2.5 font-mono text-right">{fmt(f.total)}</td>
                                  <td className="p-2.5">{p.status}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-[#1B2A41] text-[#EDE6D6] p-4 rounded-lg shadow-md border-l-4 border-l-[#B8862E] flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-lg font-bold text-white">{selectedLcPo.poNumber}</div>
                        <div className="text-xs text-white font-semibold">{selectedLcPo.client} — {selectedLcPo.project}</div>
                      </div>
                      <div className="bg-[#EDE6D6]/20 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        {selectedLcCalc?.stage}
                      </div>
                      <div className="flex gap-4 text-xs font-mono">
                        <div><span className="text-gray-400 block text-[10px]">TOTAL VALUE</span>{fmt(selectedLcCalc?.totalPOValue)}</div>
                        <div><span className="text-gray-400 block text-[10px]">RECEIVED</span>{fmt(poFinancials(selectedLcPo).received)}</div>
                        <div><span className="text-[#E4C583] block text-[10px]">RECEIVABLE</span><span className="text-[#E4C583] font-bold">{fmt(poFinancials(selectedLcPo).receivable)}</span></div>
                      </div>
                      <button className="border border-white/40 hover:bg-white/10 px-3 py-1.5 rounded text-xs" onClick={() => setActivePoId(null)}>
                        ← Back to PO List
                      </button>
                    </div>

                    {selectedLcCalc?.notif.map((n, i) => (
                      <div key={i} className={`p-3 rounded text-xs border-l-4 ${n.level === 'danger' ? 'bg-[#F8E9E5] border-[#A9432F] text-[#A9432F]' : n.level === 'warn' ? 'bg-[#FBF1E3] border-[#B8862E] text-[#8a620f]' : n.level === 'good' ? 'bg-[#E9F1EC] border-[#3F6E4E] text-[#3F6E4E]' : 'bg-[#EDE6D6] border-[#3A4A63] text-[#3A4A63]'}`}>
                        {n.text}
                      </div>
                    ))}

                    <div className="flex border-b-2 border-[#D8CFB8] overflow-x-auto gap-2">
                      {[
                        { id: 'lcs-advance', label: '1 · Advance' },
                        { id: 'lcs-production', label: '2 · Production' },
                        { id: 'lcs-dispatch', label: '3 · Dispatch' },
                        { id: 'lcs-invoice', label: '4 · Dispatch Invoice' },
                        { id: 'lcs-install', label: '5 · Installation' },
                        { id: 'lcs-install-invoice', label: '6 · Install Invoice' },
                        { id: 'lcs-retention', label: '7 · Retention' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          className={`px-4 py-2 font-semibold text-xs border-b-4 -mb-1 whitespace-nowrap transition-colors ${activeStageTab === tab.id ? 'border-[#B8862E] text-[#B8862E]' : 'border-transparent text-[#3A4A63] hover:text-[#1B2A41]'}`}
                          onClick={() => setActiveStageTab(tab.id)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {activeStageTab === 'lcs-advance' && (
                      <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-5 rounded-lg shadow-sm space-y-4">
                        <h4 className="font-serif font-semibold text-base">1 · Advance Payment (Value-Based)</h4>
                        <div className="flex flex-wrap gap-4 text-xs font-mono bg-[#F6F2E9] p-3 rounded">
                          <div>Required: <b>{fmt(selectedLcCalc?.advanceTargetValue)}</b></div>
                          <div>Received: <b>{fmt(selectedLcCalc?.totalAdvanceReceived)}</b></div>
                          <div>Consumed: <b>{fmt(selectedLcCalc?.advanceConsumedByProduction)}</b></div>
                          <div>Available: <b>{fmt(selectedLcCalc?.availableAdvanceBalance)}</b></div>
                          <div className="text-[#A9432F]">Pending: <b>{fmt(selectedLcCalc?.pendingAdvance)}</b></div>
                        </div>
                        <p className="text-xs text-[#3A4A63]">Advance receipts are recorded from the <b>Customer Payment</b> panel below.</p>
                      </div>
                    )}

                    {activeStageTab === 'lcs-production' && (
                      <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-5 rounded-lg shadow-sm space-y-4">
                        <h4 className="font-serif font-semibold text-base">2 · Sent for Production</h4>
                        <div className="flex flex-wrap gap-4 text-xs font-mono bg-[#F6F2E9] p-3 rounded">
                          <div>Eligible Production: <b>{fmt(selectedLcCalc?.productionEligibleValue)}</b></div>
                          <div>In Production: <b>{fmt(selectedLcCalc?.totalProductionValue)}</b> ({selectedLcCalc?.totalProductionQty} units)</div>
                          <div>Remaining Capacity: <b>{fmt(selectedLcCalc?.remainingProductionCapacity)}</b></div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-[#3A4A63] uppercase border-b pb-1">Release Quantity for Production</div>
                          <div className="space-y-2">
                            {selectedLcPo.items.map(it => {
                              const stat = selectedLcCalc?.itemStats.find(s => s.index === it.itemIndex);
                              return (
                                <div key={it.id} className="flex flex-wrap items-center justify-between text-xs p-2 bg-[#F6F2E9] rounded gap-2">
                                  <div className="font-semibold text-[#1B2A41] flex-1">{it.desc}</div>
                                  <div className="font-mono text-gray-500">Ordered: {it.qty} · In Prod: {stat?.productionQty || 0}</div>
                                  <input
                                    type="number"
                                    placeholder="Qty now"
                                    className="w-20 bg-white border border-[#D8CFB8] px-2 py-1 rounded text-right font-mono"
                                    value={lcInputs[`prod_${it.itemIndex}`] || ''}
                                    onChange={e => setLcInputs({ ...lcInputs, [`prod_${it.itemIndex}`]: e.target.value })}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex gap-2 items-center pt-2">
                            <input
                              type="date"
                              className="bg-white border border-[#D8CFB8] px-3 py-1.5 rounded text-xs"
                              value={lcInputs['prod_date'] || todayISO()}
                              onChange={e => setLcInputs({ ...lcInputs, prod_date: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="Note / Batch"
                              className="bg-white border border-[#D8CFB8] px-3 py-1.5 rounded text-xs flex-1"
                              value={lcInputs['prod_note'] || ''}
                              onChange={e => setLcInputs({ ...lcInputs, prod_note: e.target.value })}
                            />
                            <button
                              className="bg-[#B8862E] hover:bg-[#a07425] text-white px-4 py-1.5 rounded font-semibold text-xs"
                              onClick={() => {
                                let val = 0, q = 0;
                                const allocs = selectedLcPo.items.map(it => {
                                  const itemQty = Number(lcInputs[`prod_${it.itemIndex}`]) || 0;
                                  val += itemQty * it.unitPrice;
                                  q += itemQty;
                                  return { itemIndex: it.itemIndex, qty: itemQty };
                                }).filter(a => a.qty > 0);

                                if (allocs.length === 0) { alert('Enter qty for at least one item.'); return; }
                                submitStageTransaction(selectedLcPo.id, 'production', {
                                  qty: q,
                                  value: val,
                                  date: lcInputs['prod_date'] || todayISO(),
                                  note: lcInputs['prod_note'] || '',
                                  allocations: allocs
                                });
                              }}
                            >
                              + Send to Production
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                          <div className="text-xs font-semibold uppercase text-[#3A4A63]">Recorded Production Entries</div>
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#EDE6D6] font-semibold text-[#3A4A63]">
                              <tr>
                                <th className="p-2">Date</th>
                                <th className="p-2 text-right">Qty</th>
                                <th className="p-2 text-right">Value</th>
                                <th className="p-2">Note</th>
                                <th className="p-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#D8CFB8]">
                              {selectedLcCalc?.lc.productions.map(r => (
                                <tr key={r.id}>
                                  <td className="p-2 font-mono">{r.date}</td>
                                  <td className="p-2 font-mono text-right">{r.qty}</td>
                                  <td className="p-2 font-mono text-right">{fmt(r.value)}</td>
                                  <td className="p-2 text-[#3A4A63]">{r.note || '—'}</td>
                                  <td className="p-2 text-right">
                                    <button className="text-[#A9432F] font-semibold text-[11px]" onClick={() => submitDeleteEntry(selectedLcPo.id, 'productions', r.id)}>Del</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Customer Payment Panel */}
                    <div className="bg-[#1B2A41] text-[#EDE6D6] p-5 rounded-lg shadow-md border-t-4 border-t-[#B8862E] space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                        <div className="font-serif font-bold text-base text-white flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#B8862E] text-white flex items-center justify-center font-bold text-xs">₹</span>
                          Customer Payment Drawer
                        </div>
                        <div className="flex gap-4 text-xs font-mono text-[#E4C583]">
                          <span>Dispatch Outstanding: <b>{fmt(selectedLcCalc?.outstandingAmount)}</b></span>
                          <span>Install Outstanding: <b>{fmt(selectedLcCalc?.installationOutstanding)}</b></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-3 bg-white/5 p-4 rounded border border-white/10">
                          <div className="font-semibold text-white">Record Customer Receipt</div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              className="bg-white/10 border border-white/20 px-3 py-1.5 rounded text-white"
                              value={lcInputs['pay_date'] || todayISO()}
                              onChange={e => setLcInputs({ ...lcInputs, pay_date: e.target.value })}
                            />
                            <select
                              className="bg-white/10 border border-white/20 px-3 py-1.5 rounded text-white"
                              value={lcInputs['pay_type'] || 'dispatch'}
                              onChange={e => setLcInputs({ ...lcInputs, pay_type: e.target.value })}
                            >
                              <option value="dispatch" className="text-black">Against Dispatch</option>
                              <option value="advance" className="text-black">Against Advance</option>
                              <option value="installation" className="text-black">Against Installation</option>
                              <option value="retention" className="text-black">Against Retention</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Amount ₹"
                              className="bg-white/10 border border-white/20 px-3 py-1.5 rounded text-white font-mono"
                              value={lcInputs['pay_amount'] || ''}
                              onChange={e => setLcInputs({ ...lcInputs, pay_amount: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="Ref / Cheque / UTR"
                              className="bg-white/10 border border-white/20 px-3 py-1.5 rounded text-white"
                              value={lcInputs['pay_ref'] || ''}
                              onChange={e => setLcInputs({ ...lcInputs, pay_ref: e.target.value })}
                            />
                          </div>
                          <button
                            className="w-full bg-[#B8862E] hover:bg-[#a07425] text-white py-2 rounded font-semibold text-xs transition-colors"
                            onClick={() => {
                              const amt = Number(lcInputs['pay_amount']) || 0;
                              if (amt <= 0) { alert('Enter valid payment amount'); return; }
                              submitStageTransaction(selectedLcPo.id, 'payment', {
                                amount: amt,
                                type: lcInputs['pay_type'] || 'dispatch',
                                date: lcInputs['pay_date'] || todayISO(),
                                ref: lcInputs['pay_ref'] || '',
                                note: lcInputs['pay_note'] || ''
                              });
                            }}
                          >
                            + Record Payment Receipt
                          </button>
                        </div>

                        <div className="space-y-2 bg-white/5 p-4 rounded border border-white/10 overflow-y-auto max-h-60">
                          <div className="font-semibold text-white uppercase text-[10px] tracking-wider text-gray-400">Payment History Ledger</div>
                          <table className="w-full text-left text-xs">
                            <thead className="text-gray-400 text-[10px] uppercase border-b border-white/10">
                              <tr>
                                <th className="p-1">Date</th>
                                <th className="p-1">Type</th>
                                <th className="p-1 text-right">Amount</th>
                                <th className="p-1 text-right"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {[
                                ...selectedLcCalc?.lc.advancePayments.map(p => ({ ...p, against: 'Advance', srcArr: 'advancePayments' })) || [],
                                ...selectedLcCalc?.lc.customerPayments.map(p => ({ ...p, against: p.type || 'dispatch', srcArr: 'customerPayments' })) || []
                              ].map(r => (
                                <tr key={r.id}>
                                  <td className="p-1.5 font-mono">{r.date}</td>
                                  <td className="p-1.5"><span className="bg-[#B8862E]/20 text-[#E4C583] px-2 py-0.5 rounded text-[10px]">{r.against}</span></td>
                                  <td className="p-1.5 font-mono text-right font-bold text-white">{fmt(r.amount)}</td>
                                  <td className="p-1.5 text-right">
                                    <button className="text-red-400 text-[11px]" onClick={() => submitDeleteEntry(selectedLcPo.id, r.srcArr, r.id)}>Del</button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTION CENTER */}
            {currentPage === 'action' && (
              <div className="space-y-6">
                <div className="bg-[#FFFDF8] border border-[#D8CFB8] rounded-lg overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs border-collapse min-w-[800px]">
                    <thead className="bg-[#EDE6D6] text-[#3A4A63] uppercase text-[10.5px] font-semibold border-b border-[#D8CFB8]">
                      <tr>
                        <th className="p-3">Priority</th>
                        <th className="p-3">PO No.</th>
                        <th className="p-3">Client / Project</th>
                        <th className="p-3">Pending Invoice Value</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Aging Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8CFB8]">
                      {pos.flatMap(p => {
                        const calc = computeLifecycle(p);
                        return calc.invoiceAging.filter(inv => inv.outstanding > 0.5).map(inv => ({ po: p, inv }));
                      }).length === 0 ? (
                        <tr><td colSpan={7} className="p-6 text-center text-[#3A4A63]">No overdue or pending invoices requiring attention!</td></tr>
                      ) : (
                        pos.flatMap(p => {
                          const calc = computeLifecycle(p);
                          return calc.invoiceAging.filter(inv => inv.outstanding > 0.5).map(inv => ({ po: p, inv }));
                        }).map(({ po, inv }) => {
                          const isOverdue = inv.overdueDays > 0;
                          return (
                            <tr key={inv.id} className="hover:bg-[#FBF7EC]">
                              <td className="p-3 font-semibold">{isOverdue ? '🔴 High' : '🟠 Medium'}</td>
                              <td className="p-3 font-mono font-bold text-[#B8862E]">{po.poNumber}</td>
                              <td className="p-3">
                                <div className="font-semibold text-[#1B2A41]">{po.client}</div>
                                <div className="text-[11px] text-[#3A4A63]">{po.project}</div>
                              </td>
                              <td className="p-3 font-mono font-bold text-[#A9432F]">{fmt(inv.outstanding)}</td>
                              <td className="p-3 font-mono">{inv.dueDate}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${isOverdue ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                  {isOverdue ? `${inv.overdueDays}d overdue` : 'Due soon'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  className="bg-[#1B2A41] hover:bg-black text-white px-3 py-1 rounded text-[11px] font-medium"
                                  onClick={() => {
                                    setActivePoId(po.id);
                                    setActiveStageTab('lcs-invoice');
                                    setCurrentPage('lifecycle');
                                  }}
                                >
                                  Open →
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REPORTS */}
            {currentPage === 'reports' && (
              <div className="space-y-6">
                <div className="bg-[#1B2A41] text-[#EDE6D6] p-4 rounded-lg flex flex-wrap items-center gap-3">
                  <label className="text-xs uppercase font-semibold text-[#E4C583]">Focus PO:</label>
                  <select
                    className="bg-white/10 border border-white/20 text-white text-xs px-3 py-1.5 rounded min-w-[260px]"
                    value={reportsFilterPo}
                    onChange={e => setReportsFilterPo(e.target.value)}
                  >
                    <option value="" className="text-black">All Purchase Orders</option>
                    {pos.map(p => <option key={p.id} value={p.id} className="text-black">{p.poNumber} — {p.client}</option>)}
                  </select>
                </div>

                <div className="bg-[#FFFDF8] border border-[#D8CFB8] rounded-lg p-5 shadow-sm space-y-3">
                  <h3 className="font-serif font-semibold text-base">Milestone Breakdown by Client</h3>
                  <div className="overflow-x-auto">
                    {(() => {
                      const targetPos = reportsFilterPo ? pos.filter(p => p.id === reportsFilterPo) : pos;
                      const { byClient } = computeMilestoneBreakdown(targetPos);
                      const clients = Object.keys(byClient).sort();

                      return (
                        <table className="w-full text-left text-xs border-collapse border border-[#D8CFB8]">
                          <thead className="bg-[#EDE6D6] text-[#3A4A63] uppercase text-[10px] font-semibold border-b border-[#D8CFB8]">
                            <tr>
                              <th className="p-2.5">Client / Project</th>
                              {MS_CATEGORIES.map(c => <th key={c} className="p-2.5">{c}</th>)}
                              <th className="p-2.5 text-right">Total Receivable</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#D8CFB8]">
                            {clients.map(cl => {
                              const entry = byClient[cl];
                              return (
                                <tr key={cl} className="bg-[#F6F2E9] font-bold">
                                  <td className="p-2.5">{cl}</td>
                                  {MS_CATEGORIES.map(cat => {
                                    const d = entry.totals[cat];
                                    return (
                                      <td key={cat} className="p-2.5">
                                        <span className="text-[#3F6E4E]">{fmt(d.received)}</span> recv<br />
                                        <span className="text-[#A9432F]">{fmt(d.pending)}</span> pend
                                      </td>
                                    );
                                  })}
                                  <td className="p-2.5 font-mono text-right text-[#A9432F]">{fmt(entry.totals.receivable)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* MASTERS */}
            {currentPage === 'masters' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D8CFB8] pb-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`px-3 py-1.5 rounded font-semibold text-xs transition-colors ${mastersTab === 'clients' ? 'bg-[#1B2A41] text-white' : 'bg-[#EDE6D6] text-[#3A4A63] hover:bg-[#D8CFB8]'}`}
                      onClick={() => setMastersTab('clients')}
                    >
                      🏢 Client Master ({mastersClients.length})
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded font-semibold text-xs transition-colors ${mastersTab === 'projects' ? 'bg-[#1B2A41] text-white' : 'bg-[#EDE6D6] text-[#3A4A63] hover:bg-[#D8CFB8]'}`}
                      onClick={() => setMastersTab('projects')}
                    >
                      🏗️ Project Master ({mastersProjects.length})
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded font-semibold text-xs transition-colors ${mastersTab === 'items' ? 'bg-[#1B2A41] text-white' : 'bg-[#EDE6D6] text-[#3A4A63] hover:bg-[#D8CFB8]'}`}
                      onClick={() => setMastersTab('items')}
                    >
                      📦 SKU Item Master ({mastersItems.length})
                    </button>
                    <button
                      className={`px-3 py-1.5 rounded font-semibold text-xs transition-colors ${mastersTab === 'uoms' ? 'bg-[#1B2A41] text-white' : 'bg-[#EDE6D6] text-[#3A4A63] hover:bg-[#D8CFB8]'}`}
                      onClick={() => setMastersTab('uoms')}
                    >
                      📐 UOM Master ({mastersUoms.length})
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {mastersTab === 'clients' && (
                      <>
                        <button className="bg-[#B8862E] hover:bg-[#a07425] text-white px-3 py-1.5 rounded font-semibold text-xs" onClick={() => { setEditingClient({ name: '', legalName: '', gstin: '', creditDays: 30 }); setShowClientModal(true); }}>
                          + New Client
                        </button>
                        <button className="bg-[#1B2A41] hover:bg-black text-white px-3 py-1.5 rounded font-semibold text-xs" onClick={() => setShowMergeModal(true)}>
                          ⇄ Merge Duplicate Clients
                        </button>
                      </>
                    )}
                    {mastersTab === 'projects' && (
                      <button className="bg-[#B8862E] hover:bg-[#a07425] text-white px-3 py-1.5 rounded font-semibold text-xs" onClick={() => { setEditingProject({ clientId: mastersClients[0]?.id || '', name: '', code: '' }); setShowProjectModal(true); }}>
                        + New Project
                      </button>
                    )}
                    {mastersTab === 'items' && (
                      <button className="bg-[#B8862E] hover:bg-[#a07425] text-white px-3 py-1.5 rounded font-semibold text-xs" onClick={() => { setEditingItem({ name: '', code: '', defaultUnitPrice: 0, uomIds: mastersUoms.slice(0, 2).map(u => u.id) }); setShowItemModal(true); }}>
                        + New SKU Item
                      </button>
                    )}
                    {mastersTab === 'uoms' && (
                      <button className="bg-[#B8862E] hover:bg-[#a07425] text-white px-3 py-1.5 rounded font-semibold text-xs" onClick={() => { setEditingUom({ code: '', name: '' }); setShowUomModal(true); }}>
                        + New UOM
                      </button>
                    )}
                  </div>
                </div>

                {/* CLIENTS TAB */}
                {mastersTab === 'clients' && (
                  <div className="bg-[#FFFDF8] border border-[#D8CFB8] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead className="bg-[#EDE6D6] text-[#3A4A63] uppercase text-[10px] font-semibold border-b border-[#D8CFB8]">
                        <tr>
                          <th className="p-3">Client Name</th>
                          <th className="p-3 text-right">POs</th>
                          <th className="p-3 text-right">Order Value</th>
                          <th className="p-3 text-right">Received</th>
                          <th className="p-3 text-right">Receivable</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D8CFB8]">
                        {mastersClients.map(cl => (
                          <tr key={cl.id} className="hover:bg-[#FBF7EC]">
                            <td className="p-3 font-semibold text-[#1B2A41]">{cl.name}</td>
                            <td className="p-3 font-mono text-right">{cl.poCount}</td>
                            <td className="p-3 font-mono text-right">{fmt(cl.order)}</td>
                            <td className="p-3 font-mono text-right text-[#3F6E4E]">{fmt(cl.received)}</td>
                            <td className="p-3 font-mono text-right font-semibold text-[#A9432F]">{fmt(cl.receivable)}</td>
                            <td className="p-3 text-right space-x-2">
                              <button className="px-2 py-1 border border-[#1B2A41] text-[#1B2A41] rounded text-[11px]" onClick={() => { setEditingClient(cl); setShowClientModal(true); }}>Edit</button>
                              <button className="px-2 py-1 border border-[#A9432F] text-[#A9432F] rounded text-[11px]" onClick={() => handleDeleteClient(cl.id)}>Del</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* PROJECTS TAB */}
                {mastersTab === 'projects' && (
                  <div className="bg-[#FFFDF8] border border-[#D8CFB8] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead className="bg-[#EDE6D6] text-[#3A4A63] uppercase text-[10px] font-semibold border-b border-[#D8CFB8]">
                        <tr>
                          <th className="p-3">Project / Tower Name</th>
                          <th className="p-3">Client</th>
                          <th className="p-3">Project Code</th>
                          <th className="p-3 text-right">POs Linked</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D8CFB8]">
                        {mastersProjects.length === 0 ? (
                          <tr><td colSpan={5} className="p-6 text-center text-[#3A4A63]">No projects created yet. Click "+ New Project" to add one!</td></tr>
                        ) : (
                          mastersProjects.map(p => (
                            <tr key={p.id} className="hover:bg-[#FBF7EC]">
                              <td className="p-3 font-semibold text-[#1B2A41]">{p.name}</td>
                              <td className="p-3"><span className="bg-[#1B2A41]/10 text-[#1B2A41] px-2 py-0.5 rounded font-medium text-[11px]">{p.clientName}</span></td>
                              <td className="p-3 font-mono text-gray-500">{p.code || '—'}</td>
                              <td className="p-3 font-mono text-right">{p.poCount}</td>
                              <td className="p-3 text-right space-x-2">
                                <button className="px-2 py-1 border border-[#1B2A41] text-[#1B2A41] rounded text-[11px]" onClick={() => { setEditingProject(p); setShowProjectModal(true); }}>Edit</button>
                                <button className="px-2 py-1 border border-[#A9432F] text-[#A9432F] rounded text-[11px]" onClick={() => handleDeleteProject(p.id)}>Del</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* LINE ITEMS TAB */}
                {mastersTab === 'items' && (
                  <div className="bg-[#FFFDF8] border border-[#D8CFB8] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead className="bg-[#EDE6D6] text-[#3A4A63] uppercase text-[10px] font-semibold border-b border-[#D8CFB8]">
                        <tr>
                          <th className="p-3">Item Description / Name</th>
                          <th className="p-3">Item Code</th>
                          <th className="p-3 text-right">Default Unit Price</th>
                          <th className="p-3">Allowed UOMs</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D8CFB8]">
                        {mastersItems.length === 0 ? (
                          <tr><td colSpan={5} className="p-6 text-center text-[#3A4A63]">No SKU Items created yet. Click "+ New SKU Item" to add one!</td></tr>
                        ) : (
                          mastersItems.map(item => (
                            <tr key={item.id} className="hover:bg-[#FBF7EC]">
                              <td className="p-3 font-semibold text-[#1B2A41]">{item.name}</td>
                              <td className="p-3 font-mono text-gray-500">{item.code || '—'}</td>
                              <td className="p-3 font-mono text-right font-semibold text-[#B8862E]">{fmt(item.defaultUnitPrice)}</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {item.uoms.map((u: any) => (
                                    <span key={u.id} className="bg-[#B8862E]/15 text-[#8a620f] border border-[#B8862E]/30 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                                      {u.code}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button className="px-2 py-1 border border-[#1B2A41] text-[#1B2A41] rounded text-[11px]" onClick={() => { setEditingItem({ id: item.id, name: item.name, code: item.code, defaultUnitPrice: item.defaultUnitPrice, uomIds: item.uoms.map((u: any) => u.id) }); setShowItemModal(true); }}>Edit</button>
                                <button className="px-2 py-1 border border-[#A9432F] text-[#A9432F] rounded text-[11px]" onClick={() => handleDeleteItem(item.id)}>Del</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* UOMS TAB */}
                {mastersTab === 'uoms' && (
                  <div className="bg-[#FFFDF8] border border-[#D8CFB8] rounded-lg overflow-x-auto shadow-sm">
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                      <thead className="bg-[#EDE6D6] text-[#3A4A63] uppercase text-[10px] font-semibold border-b border-[#D8CFB8]">
                        <tr>
                          <th className="p-3">UOM Code</th>
                          <th className="p-3">Full Description</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D8CFB8]">
                        {mastersUoms.length === 0 ? (
                          <tr><td colSpan={3} className="p-6 text-center text-[#3A4A63]">No UOMs defined yet. Click "+ New UOM" to add one!</td></tr>
                        ) : (
                          mastersUoms.map(u => (
                            <tr key={u.id} className="hover:bg-[#FBF7EC]">
                              <td className="p-3 font-mono font-bold text-[#1B2A41]">{u.code}</td>
                              <td className="p-3 text-[#3A4A63]">{u.name}</td>
                              <td className="p-3 text-right space-x-2">
                                <button className="px-2 py-1 border border-[#1B2A41] text-[#1B2A41] rounded text-[11px]" onClick={() => { setEditingUom(u); setShowUomModal(true); }}>Edit</button>
                                <button className="px-2 py-1 border border-[#A9432F] text-[#A9432F] rounded text-[11px]" onClick={() => handleDeleteUom(u.id)}>Del</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {currentPage === 'settings' && (
              <div className="space-y-6 max-w-2xl">
                <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-6 rounded-lg shadow-sm space-y-4">
                  <h3 className="font-serif font-semibold text-lg border-b pb-2">Data Administration</h3>
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="font-semibold text-xs text-[#A9432F]">Flush All PO Module Data</div>
                      <div className="text-xs text-[#3A4A63]">Completely delete all POs, clients, projects, and lifecycle ledgers</div>
                    </div>
                    <button
                      className="bg-[#A9432F] hover:bg-red-800 text-white px-3 py-1.5 rounded text-xs font-semibold"
                      onClick={async () => {
                        if (!confirm('Flush all PO module data? This will permanently delete all POs and clients.')) return;
                        const res = await fetch('/api/client-po/seed', { method: 'DELETE' });
                        if (res.ok) {
                          showToast('All PO module data flushed');
                          await fetchPos();
                          await fetchMasters();
                        }
                      }}
                    >
                      Flush All Data
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="font-semibold text-xs">Reload Sample Dataset</div>
                      <div className="text-xs text-[#3A4A63]">Reload the 7 default sample POs into SQLite database</div>
                    </div>
                    <button
                      className="bg-[#B8862E] hover:bg-[#a07425] text-white px-3 py-1.5 rounded text-xs font-semibold"
                      onClick={async () => {
                        if (!confirm('Reload sample dataset?')) return;
                        const res = await fetch('/api/client-po/seed', { method: 'POST' });
                        if (res.ok) {
                          showToast('Data reset to sample dataset');
                          await fetchPos();
                          await fetchMasters();
                        }
                      }}
                    >
                      Reload Sample Data
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* NEW / EDIT PO MODAL */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#F6F2E9] border border-[#D8CFB8] rounded-lg max-w-4xl w-full shadow-2xl my-8 overflow-hidden">
            <div className="flex justify-between items-center bg-[#1B2A41] text-white p-4 border-b border-[#B8862E]">
              <h3 className="font-serif font-bold text-lg">{editingPoId ? 'Edit Purchase Order' : 'New Purchase Order'}</h3>
              <button className="text-white text-xl" onClick={() => setShowFormModal(false)}>&times;</button>
            </div>
            <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto text-xs">
              {clientWarn && (
                <div className="bg-[#FBF1E3] border border-[#B8862E] p-3 rounded text-[#8a620f] flex items-center justify-between">
                  <span>Similar existing client: <b>{clientWarn}</b>. Click to use exact name.</span>
                  <button className="bg-[#B8862E] text-white px-2 py-1 rounded text-[10px]" onClick={() => setFClient(clientWarn)}>Use "{clientWarn}"</button>
                </div>
              )}

              {/* Client & Project Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">Client Name</label>
                  <select
                    className="w-full bg-white border border-[#D8CFB8] p-2 rounded text-xs"
                    value={fClient}
                    onChange={e => setFClient(e.target.value)}
                  >
                    <option value="">-- Select Client from Master --</option>
                    {mastersClients.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">Project / Tower</label>
                  <select
                    className="w-full bg-white border border-[#D8CFB8] p-2 rounded text-xs"
                    value={fProject}
                    onChange={e => setFProject(e.target.value)}
                  >
                    <option value="">-- Select Project from Master --</option>
                    {mastersProjects
                      .filter(p => !fClient || p.clientName.toLowerCase() === fClient.toLowerCase())
                      .map(p => (
                        <option key={p.id} value={p.name}>{p.name} ({p.clientName})</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">PO Number</label>
                  <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={fPoNumber} onChange={e => setFPoNumber(e.target.value)} />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">PO Date</label>
                  <input type="date" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={fPoDate} onChange={e => setFPoDate(e.target.value)} />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">Delivery Date</label>
                  <input type="date" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={fDelivery} onChange={e => setFDelivery(e.target.value)} />
                </div>
                <div>
                  <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">Status</label>
                  <select className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={fStatus} onChange={e => setFStatus(e.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Payment Terms Section (Terms Raw, Credit Period, Retention Period) */}
              <div className="border-t border-[#D8CFB8] pt-4 space-y-3">
                <span className="font-semibold uppercase text-[#3A4A63]">Payment Terms & Terms Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">Payment Terms (as printed on PO)</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-[#D8CFB8] p-2 rounded text-xs"
                      placeholder="e.g. As per Annexure / Payable immediately"
                      value={fTermsRaw}
                      onChange={e => setFTermsRaw(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">Customer Credit Period (days)</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-[#D8CFB8] p-2 rounded text-xs font-mono"
                      placeholder="30"
                      value={fCreditDays}
                      onChange={e => setFCreditDays(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">Retention Period (months)</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-[#D8CFB8] p-2 rounded text-xs font-mono"
                      placeholder="12"
                      value={fRetentionMonths}
                      onChange={e => setFRetentionMonths(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SKU Items Table */}
              <div className="border-t border-[#D8CFB8] pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold uppercase text-[#3A4A63]">SKU Items</span>
                  <button className="text-[#B8862E] font-semibold text-xs hover:underline" onClick={() => setFItems([...fItems, { desc: '', qty: '', uom: 'NUM', unitPrice: '' }])}>+ Add SKU Item</button>
                </div>
                {fItems.map((it, idx) => {
                  const mItem = mastersItems.find(mi => mi.name === it.desc);
                  const allowedUoms = mItem && mItem.uoms && mItem.uoms.length > 0 ? mItem.uoms : mastersUoms;

                  return (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        className="flex-1 bg-white border border-[#D8CFB8] p-1.5 rounded text-xs"
                        value={it.desc}
                        onChange={e => {
                          const val = e.target.value;
                          const copy = [...fItems];
                          copy[idx].desc = val;
                          const selectedMasterItem = mastersItems.find(mi => mi.name === val);
                          if (selectedMasterItem) {
                            if (selectedMasterItem.defaultUnitPrice && (!copy[idx].unitPrice || Number(copy[idx].unitPrice) === 0)) {
                              copy[idx].unitPrice = String(selectedMasterItem.defaultUnitPrice);
                            }
                            if (selectedMasterItem.uoms && selectedMasterItem.uoms.length > 0) {
                              const currentUomValid = selectedMasterItem.uoms.some((u: any) => u.code === copy[idx].uom);
                              if (!currentUomValid) {
                                copy[idx].uom = selectedMasterItem.uoms[0].code;
                              }
                            }
                          }
                          setFItems(copy);
                        }}
                      >
                        <option value="">-- Select SKU Item --</option>
                        {mastersItems.map(mi => (
                          <option key={mi.id} value={mi.name}>{mi.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        className="w-20 bg-white border border-[#D8CFB8] p-1.5 rounded text-right font-mono text-xs"
                        value={it.qty}
                        onChange={e => { const copy = [...fItems]; copy[idx].qty = e.target.value; setFItems(copy); }}
                      />
                      <select
                        className="w-24 bg-white border border-[#D8CFB8] p-1.5 rounded font-mono text-xs"
                        value={it.uom}
                        onChange={e => { const copy = [...fItems]; copy[idx].uom = e.target.value; setFItems(copy); }}
                      >
                        {allowedUoms.map((u: any) => (
                          <option key={u.id || u.code} value={u.code}>{u.code}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Unit Price ₹"
                        className="w-28 bg-white border border-[#D8CFB8] p-1.5 rounded text-right font-mono text-xs"
                        value={it.unitPrice}
                        onChange={e => { const copy = [...fItems]; copy[idx].unitPrice = e.target.value; setFItems(copy); }}
                      />
                      <button className="text-[#A9432F] font-bold text-sm" onClick={() => setFItems(fItems.filter((_, i) => i !== idx))}>&times;</button>
                    </div>
                  );
                })}
              </div>

              {/* Tax Option & Order Sum Section */}
              <div className="border-t border-[#D8CFB8] pt-4 space-y-3">
                <div className="flex flex-wrap gap-4 items-center bg-[#FFFDF8] p-3 rounded border border-[#D8CFB8]">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-[#3A4A63] mb-1">Tax Option</label>
                    <select
                      className="bg-white border border-[#D8CFB8] p-1.5 rounded text-xs"
                      value={fTaxMode}
                      onChange={e => setFTaxMode(e.target.value as any)}
                    >
                      <option value="cgst_sgst">CGST + SGST (Split Equal)</option>
                      <option value="igst">IGST (Single Tax Rate)</option>
                      <option value="custom">Custom / Manual Tax Entry</option>
                    </select>
                  </div>
                  {fTaxMode !== 'custom' && (
                    <div>
                      <label className="block text-[10px] uppercase font-semibold text-[#3A4A63] mb-1">Tax Percentage (%)</label>
                      <select
                        className="bg-white border border-[#D8CFB8] p-1.5 rounded text-xs font-mono"
                        value={fTaxRate}
                        onChange={e => setFTaxRate(e.target.value)}
                      >
                        <option value="18">18% GST {fTaxMode === 'cgst_sgst' ? '(CGST 9% + SGST 9%)' : '(IGST 18%)'}</option>
                        <option value="12">12% GST {fTaxMode === 'cgst_sgst' ? '(CGST 6% + SGST 6%)' : '(IGST 12%)'}</option>
                        <option value="28">28% GST {fTaxMode === 'cgst_sgst' ? '(CGST 14% + SGST 14%)' : '(IGST 28%)'}</option>
                        <option value="5">5% GST {fTaxMode === 'cgst_sgst' ? '(CGST 2.5% + SGST 2.5%)' : '(IGST 5%)'}</option>
                        <option value="0">0% Tax / Exempt</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-[#3A4A63]">Basic Value (₹)</label>
                    <input type="number" className="w-full bg-white border border-[#D8CFB8] p-2 rounded font-mono" value={fBasic} onChange={e => {
                      const b = Number(e.target.value) || 0;
                      setFBasic(e.target.value);
                      const t = Number(fTax) || 0;
                      setFTotal(String(b + t));
                    }} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-[#3A4A63]">Tax Value (₹)</label>
                    <input type="number" className="w-full bg-white border border-[#D8CFB8] p-2 rounded font-mono" value={fTax} onChange={e => {
                      const t = Number(e.target.value) || 0;
                      setFTax(e.target.value);
                      const b = Number(fBasic) || 0;
                      setFTotal(String(b + t));
                    }} />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-[#3A4A63]">Total Order Value (₹)</label>
                    <input type="number" className="w-full bg-white border border-[#D8CFB8] p-2 rounded font-mono font-bold text-[#1B2A41]" value={fTotal} onChange={e => setFTotal(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Payment Milestones Section */}
              <div className="border-t border-[#D8CFB8] pt-4 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="font-semibold uppercase text-[#3A4A63]">Payment Milestones</span>
                  <button type="button" className="text-[#B8862E] font-semibold text-xs hover:underline" onClick={() => setFMilestones([...fMilestones, { label: '', mode: 'percent', value: '0', basis: '' }])}>
                    + Add milestone
                  </button>
                </div>

                {/* Presets Bar */}
                <div className="flex flex-wrap gap-2 items-center bg-[#EDE6D6]/70 p-2 rounded border border-[#D8CFB8]">
                  <span className="text-[11px] font-semibold text-[#3A4A63]">Presets:</span>
                  <button type="button" className="px-2.5 py-1 bg-white border border-[#D8CFB8] hover:border-[#B8862E] text-[#1B2A41] rounded text-[11px] font-medium shadow-sm transition-all" onClick={applyPreset20_60_15_5}>
                    20 / 60 / 15 / 5 (advance–delivery–install–retention)
                  </button>
                  <button type="button" className="px-2.5 py-1 bg-white border border-[#D8CFB8] hover:border-[#B8862E] text-[#1B2A41] rounded text-[11px] font-medium shadow-sm transition-all" onClick={applyPreset100_Immediate}>
                    100% payable immediately (due net)
                  </button>
                  <button type="button" className="px-2.5 py-1 bg-white border border-[#D8CFB8] hover:bg-gray-100 text-[#3A4A63] rounded text-[11px] font-medium transition-all" onClick={applyPresetClear}>
                    Clear
                  </button>
                </div>

                {/* Milestone Rows */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {fMilestones.map((m, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-white p-2 rounded border border-[#D8CFB8]">
                      <input
                        type="text"
                        placeholder="Milestone Label (e.g. Advance against ABG/PDC)"
                        className="flex-1 min-w-[200px] bg-white border border-[#D8CFB8] p-1.5 rounded text-xs"
                        value={m.label}
                        onChange={e => { const copy = [...fMilestones]; copy[idx].label = e.target.value; setFMilestones(copy); }}
                      />
                      <select
                        className="w-28 bg-white border border-[#D8CFB8] p-1.5 rounded text-xs"
                        value={m.mode}
                        onChange={e => { const copy = [...fMilestones]; copy[idx].mode = e.target.value; setFMilestones(copy); }}
                      >
                        <option value="percent">% of value</option>
                        <option value="fixed">Fixed ₹</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Value"
                        className="w-20 bg-white border border-[#D8CFB8] p-1.5 rounded text-right font-mono text-xs"
                        value={m.value}
                        onChange={e => { const copy = [...fMilestones]; copy[idx].value = e.target.value; setFMilestones(copy); }}
                      />
                      <input
                        type="text"
                        placeholder="Basis (e.g. On PO acceptance)"
                        className="flex-1 min-w-[180px] bg-white border border-[#D8CFB8] p-1.5 rounded text-xs"
                        value={m.basis}
                        onChange={e => { const copy = [...fMilestones]; copy[idx].basis = e.target.value; setFMilestones(copy); }}
                      />
                      <button type="button" className="text-[#A9432F] font-bold text-sm px-1" onClick={() => setFMilestones(fMilestones.filter((_, i) => i !== idx))}>&times;</button>
                    </div>
                  ))}
                </div>

                {/* Notes / Assumptions */}
                <div className="pt-2">
                  <label className="block uppercase text-[10px] text-[#3A4A63] font-semibold mb-1">NOTES</label>
                  <textarea
                    rows={2}
                    className="w-full bg-white border border-[#D8CFB8] p-2 rounded text-xs"
                    placeholder="Any assumptions, LOA reference, etc."
                    value={fNotes}
                    onChange={e => setFNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-[#EDE6D6] border-t border-[#D8CFB8] flex justify-end gap-2">
              <button className="px-4 py-2 border border-[#1B2A41] rounded text-xs" onClick={() => setShowFormModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-[#B8862E] text-white rounded text-xs font-semibold" onClick={handleSavePO}>Save PO</button>
            </div>
          </div>
        </div>
      )}

      {/* PO DETAIL VIEW MODAL */}
      {showDetailModal && currentDetailPo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[#F6F2E9] border border-[#D8CFB8] rounded-lg max-w-4xl w-full shadow-2xl my-8 overflow-hidden">
            {/* Title Header */}
            <div className="flex justify-between items-center bg-[#1B2A41] text-white p-4 border-b border-[#B8862E]">
              <h3 className="font-serif font-bold text-lg">PO {currentDetailPo.poNumber} — {currentDetailPo.project || 'Main Project'}</h3>
              <button className="text-white text-xl hover:text-gray-300" onClick={() => setShowDetailModal(false)}>&times;</button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-xs">
              {/* Tabs Bar */}
              <div className="flex border-b border-[#D8CFB8] gap-6 text-xs font-semibold">
                <button className="pb-2 border-b-2 border-[#1B2A41] text-[#1B2A41]">Overview</button>
                <button className="pb-2 text-[#3A4A63] hover:text-[#1B2A41]" onClick={() => { setShowDetailModal(false); setActivePoId(currentDetailPo.id); setCurrentPage('lifecycle'); }}>Execution Lifecycle</button>
                <button className="pb-2 text-[#3A4A63] hover:text-[#1B2A41]" onClick={() => { setShowDetailModal(false); setActivePoId(currentDetailPo.id); setCurrentPage('lifecycle'); }}>Timeline</button>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 bg-[#FFFDF8] p-4 border border-[#D8CFB8] rounded-lg text-xs">
                <div>
                  <div className="uppercase text-[10px] font-semibold text-[#3A4A63]">CLIENT</div>
                  <div className="font-bold text-[#1B2A41]">{currentDetailPo.client}</div>
                </div>
                <div>
                  <div className="uppercase text-[10px] font-semibold text-[#3A4A63]">PROJECT</div>
                  <div className="font-bold text-[#1B2A41]">{currentDetailPo.project || '—'}</div>
                </div>
                <div>
                  <div className="uppercase text-[10px] font-semibold text-[#3A4A63]">PO DATE</div>
                  <div className="font-mono">{currentDetailPo.poDate || '—'}</div>
                </div>
                <div>
                  <div className="uppercase text-[10px] font-semibold text-[#3A4A63]">DELIVERY DATE</div>
                  <div className="font-mono">{currentDetailPo.deliveryDate || '—'}</div>
                </div>
                <div>
                  <div className="uppercase text-[10px] font-semibold text-[#3A4A63]">PAYMENT TERMS (AS PRINTED)</div>
                  <div className="font-medium text-[#1B2A41]">{currentDetailPo.termsRaw || 'As per Annexure'}</div>
                </div>
                <div>
                  <div className="uppercase text-[10px] font-semibold text-[#3A4A63]">STATUS</div>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${currentDetailPo.status === 'Active' ? 'bg-[#3F6E4E]/15 text-[#3F6E4E]' : 'bg-gray-200 text-gray-700'}`}>
                      {currentDetailPo.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* SKU Items Table */}
              <div className="space-y-2">
                <div className="font-semibold uppercase text-[#3A4A63]">SKU Items</div>
                <div className="bg-white border border-[#D8CFB8] rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#EDE6D6] text-[#3A4A63] font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">ITEM</th>
                        <th className="p-2.5 text-right">QTY</th>
                        <th className="p-2.5 text-[#3A4A63]">UOM</th>
                        <th className="p-2.5 text-right">UNIT PRICE</th>
                        <th className="p-2.5 text-right">VALUE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8CFB8]">
                      {currentDetailPo.items.map(it => (
                        <tr key={it.id || it.itemIndex} className="hover:bg-[#FBF7EC]">
                          <td className="p-2.5 font-semibold text-[#1B2A41]">{it.desc}</td>
                          <td className="p-2.5 font-mono text-right">{it.qty}</td>
                          <td className="p-2.5 font-mono text-[#3A4A63]">{it.uom}</td>
                          <td className="p-2.5 font-mono text-right">{fmt(it.unitPrice)}</td>
                          <td className="p-2.5 font-mono text-right font-semibold">{fmt(it.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-[#F6F2E9] p-2.5 border-t border-[#D8CFB8] text-right font-mono text-xs font-medium text-[#3A4A63]">
                    Basic: <span className="font-semibold text-[#1B2A41]">{fmt(currentDetailPo.totalBasic)}</span> &nbsp;·&nbsp;
                    Tax: <span className="font-semibold text-[#1B2A41]">{fmt(currentDetailPo.totalTax)}</span> &nbsp;·&nbsp;
                    <span className="font-bold text-[#1B2A41]">Order Value: {fmt(currentDetailPo.totalOrderValue)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Milestones Progress Card */}
              <div className="space-y-2">
                <div className="font-semibold uppercase text-[#3A4A63]">Payment Milestones</div>
                <div className="bg-[#FFFDF8] border border-[#D8CFB8] rounded-lg p-4 space-y-3">
                  {currentDetailPo.milestones
                    .filter(m => {
                      const cat = classifyMilestone(m.label);
                      const target = milestoneTarget(m, currentDetailPo.totalOrderValue);
                      // If retention and target is 0, do not show retention milestone row!
                      if (cat === 'Retention' && (m.value === 0 || target === 0)) return false;
                      return true;
                    })
                    .map((m, idx) => {
                      const targetVal = milestoneTarget(m, currentDetailPo.totalOrderValue);
                      const recvVal = milestoneReceivedAmount(m, currentDetailPo);

                      return (
                        <div key={idx} className="flex flex-wrap sm:flex-nowrap justify-between items-center border-b border-[#D8CFB8]/60 pb-2.5 last:border-b-0 last:pb-0">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#B8862E]"></span>
                              <span className="font-bold text-[#1B2A41] text-xs">{m.label}</span>
                            </div>
                            <div className="text-[11px] text-[#3A4A63] pl-4">
                              {m.mode === 'percent' ? `${m.value}% of order value` : fmt(m.value)} {m.basis ? `· ${m.basis}` : ''}
                            </div>
                          </div>
                          <div className="font-mono text-right text-xs">
                            Target: <span className="font-semibold text-[#1B2A41]">{fmt(targetVal)}</span> &nbsp;&nbsp;
                            Received: <span className="font-semibold text-[#3F6E4E]">{fmt(recvVal)}</span>
                          </div>
                        </div>
                      );
                    })}

                  <div className="pt-2 border-t border-[#D8CFB8] flex justify-end gap-4 font-mono text-xs text-right">
                    <div>Received: <span className="font-bold text-[#3F6E4E]">{fmt(currentDetailFin?.received)}</span></div>
                    <div>Receivable: <span className="font-bold text-[#A9432F]">{fmt(currentDetailFin?.receivable)}</span></div>
                  </div>
                </div>
              </div>

              {/* Notes Block */}
              {currentDetailPo.notes && (
                <div className="space-y-1">
                  <div className="font-semibold uppercase text-[#3A4A63]">Notes</div>
                  <div className="bg-[#FFFDF8] border border-[#D8CFB8] p-3 rounded text-xs text-[#3A4A63] font-mono leading-relaxed">
                    {currentDetailPo.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#EDE6D6] border-t border-[#D8CFB8] flex justify-end">
              <button className="px-4 py-2 bg-[#B8862E] hover:bg-[#a07425] text-white rounded text-xs font-semibold shadow-sm" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT MERGE MODAL */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F2E9] border border-[#D8CFB8] rounded-lg max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1B2A41]">Merge Duplicate Clients</h3>
            <p className="text-xs text-[#3A4A63]">Select the secondary client to merge INTO the primary client. All POs will be re-linked.</p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Primary Client (Keep)</label>
                <select className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={primaryMergeId} onChange={e => setPrimaryMergeId(e.target.value)}>
                  <option value="">Select Primary Client</option>
                  {mastersClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Secondary Client (Merge & Delete)</label>
                <select className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={secondaryMergeId} onChange={e => setSecondaryMergeId(e.target.value)}>
                  <option value="">Select Secondary Client</option>
                  {mastersClients.filter(c => c.id !== primaryMergeId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-1.5 border border-[#1B2A41] text-xs rounded" onClick={() => setShowMergeModal(false)}>Cancel</button>
              <button className="px-3 py-1.5 bg-[#1B2A41] text-white text-xs rounded font-semibold" onClick={handleMergeClients}>Merge Clients</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CLIENT MODAL */}
      {showClientModal && editingClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F2E9] border border-[#D8CFB8] rounded-lg max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1B2A41]">{editingClient.id ? 'Edit Client Master' : 'New Client Master'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Client Name</label>
                <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={editingClient.name || ''} onChange={e => setEditingClient({ ...editingClient, name: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Legal Name</label>
                <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={editingClient.legalName || ''} onChange={e => setEditingClient({ ...editingClient, legalName: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Default Credit Days</label>
                <input type="number" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={editingClient.creditDays || 30} onChange={e => setEditingClient({ ...editingClient, creditDays: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-1.5 border border-[#1B2A41] text-xs rounded" onClick={() => setShowClientModal(false)}>Cancel</button>
              <button className="px-3 py-1.5 bg-[#B8862E] text-white text-xs rounded font-semibold" onClick={handleSaveClient}>Save Client</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PROJECT MODAL */}
      {showProjectModal && editingProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F2E9] border border-[#D8CFB8] rounded-lg max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1B2A41]">{editingProject.id ? 'Edit Project Master' : 'New Project Master'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Client</label>
                <select
                  className="w-full bg-white border border-[#D8CFB8] p-2 rounded"
                  value={editingProject.clientId || ''}
                  onChange={e => setEditingProject({ ...editingProject, clientId: e.target.value })}
                >
                  <option value="">Select Client</option>
                  {mastersClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Project / Tower Name</label>
                <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={editingProject.name || ''} onChange={e => setEditingProject({ ...editingProject, name: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Project Code (Optional)</label>
                <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={editingProject.code || ''} onChange={e => setEditingProject({ ...editingProject, code: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-1.5 border border-[#1B2A41] text-xs rounded" onClick={() => setShowProjectModal(false)}>Cancel</button>
              <button className="px-3 py-1.5 bg-[#B8862E] text-white text-xs rounded font-semibold" onClick={handleSaveProject}>Save Project</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SKU ITEM MODAL */}
      {showItemModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F2E9] border border-[#D8CFB8] rounded-lg max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1B2A41]">{editingItem.id ? 'Edit SKU Item Master' : 'New SKU Item Master'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">SKU Item Description / Name</label>
                <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={editingItem.name || ''} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Item Code (Optional)</label>
                <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={editingItem.code || ''} onChange={e => setEditingItem({ ...editingItem, code: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Default Unit Price (₹)</label>
                <input type="number" className="w-full bg-white border border-[#D8CFB8] p-2 rounded font-mono" value={editingItem.defaultUnitPrice || 0} onChange={e => setEditingItem({ ...editingItem, defaultUnitPrice: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Allowed UOMs (Select Multiple)</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto bg-white border border-[#D8CFB8] p-2 rounded">
                  {mastersUoms.map(u => {
                    const checked = (editingItem.uomIds || []).includes(u.id);
                    return (
                      <label key={u.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const cur = editingItem.uomIds || [];
                            const next = e.target.checked ? [...cur, u.id] : cur.filter((id: string) => id !== u.id);
                            setEditingItem({ ...editingItem, uomIds: next });
                          }}
                        />
                        <span><b>{u.code}</b> ({u.name})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-1.5 border border-[#1B2A41] text-xs rounded" onClick={() => setShowItemModal(false)}>Cancel</button>
              <button className="px-3 py-1.5 bg-[#B8862E] text-white text-xs rounded font-semibold" onClick={handleSaveItem}>Save SKU Item</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT UOM MODAL */}
      {showUomModal && editingUom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F2E9] border border-[#D8CFB8] rounded-lg max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1B2A41]">{editingUom.id ? 'Edit UOM Master' : 'New UOM Master'}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">UOM Code (e.g. SQFT, RFT, NUM)</label>
                <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded uppercase" value={editingUom.code || ''} onChange={e => setEditingUom({ ...editingUom, code: e.target.value })} />
              </div>
              <div>
                <label className="block font-semibold mb-1">Full Description / Name</label>
                <input type="text" className="w-full bg-white border border-[#D8CFB8] p-2 rounded" value={editingUom.name || ''} onChange={e => setEditingUom({ ...editingUom, name: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="px-3 py-1.5 border border-[#1B2A41] text-xs rounded" onClick={() => setShowUomModal(false)}>Cancel</button>
              <button className="px-3 py-1.5 bg-[#B8862E] text-white text-xs rounded font-semibold" onClick={handleSaveUom}>Save UOM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

