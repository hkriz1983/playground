"use client";

import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import Link from 'next/link';
import * as XLSX from 'xlsx';

type LedgerCategory = { id: string; name: string; unitWord: string; isFixedRate: boolean; defaultRate: number; order: number; };
type LedgerEntry = { id: string; date: string; amount: number; description: string | null; categoryId: string; };
type LedgerPayment = { id: string; date: string; amount: number; description: string | null; };
type LedgerPlayer = { id: string; name: string; role: string; phone: string | null; };
type PlayerPayment = { id: string; playerId: string; amount: number; date: string; againstWhat: string; receiptUrl: string | null; player: LedgerPlayer };

export default function CricketLedgerPage() {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [data, setData] = useState<{ categories: LedgerCategory[], entries: LedgerEntry[], payments: LedgerPayment[], playerPayments: PlayerPayment[], openingBalance: number } | null>(null);
  const [players, setPlayers] = useState<LedgerPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [entryModal, setEntryModal] = useState<{ isOpen: boolean, category?: LedgerCategory }>({ isOpen: false });
  const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean, category?: LedgerCategory }>({ isOpen: false });
  const [playerPaymentModal, setPlayerPaymentModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  
  // Form state
  const [amount, setAmount] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  
  const [catName, setCatName] = useState('');
  const [catUnit, setCatUnit] = useState('session');
  const [catFixed, setCatFixed] = useState(true);
  const [catRate, setCatRate] = useState('0');

  // Player payment state
  const [playerId, setPlayerId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const fetchMonthData = async (date: Date) => {
    setLoading(true);
    const monthStr = format(date, 'yyyy-MM');
    try {
      const res = await fetch(`/api/ledger/data?month=${monthStr}`);
      if (res.ok) setData(await res.json());
      const pRes = await fetch('/api/ledger/players');
      if (pRes.ok) setPlayers(await pRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchMonthData(currentMonth); }, [currentMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const openingBalance = data?.openingBalance || 0;
  const currentMonthEntriesTotal = data?.entries.reduce((sum, e) => sum + e.amount, 0) || 0;
  const currentMonthPaymentsTotal = data?.payments.reduce((sum, p) => sum + p.amount, 0) || 0;
  const closingBalance = openingBalance + currentMonthEntriesTotal - currentMonthPaymentsTotal;

  const currentMonthPlayerPaymentsTotal = data?.playerPayments.reduce((sum, p) => sum + p.amount, 0) || 0;

  const isCredit = closingBalance < 0;
  const displayBalance = Math.abs(closingBalance);

  const handleSaveEntry = async () => {
    if (!entryModal.category) return;
    await fetch('/api/ledger/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: entryModal.category.id, amount: parseFloat(amount), date: dateStr, description })
    });
    setEntryModal({ isOpen: false });
    fetchMonthData(currentMonth);
  };

  const handleDeleteEntry = async (id: string) => {
    await fetch(`/api/ledger/entries?id=${id}`, { method: 'DELETE' });
    fetchMonthData(currentMonth);
  };

  const handleSavePayment = async () => {
    await fetch('/api/ledger/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount), date: dateStr, description })
    });
    setPaymentModal({ isOpen: false });
    fetchMonthData(currentMonth);
  };

  const handleDeletePayment = async (id: string) => {
    await fetch(`/api/ledger/payments?id=${id}`, { method: 'DELETE' });
    fetchMonthData(currentMonth);
  };

  const handleSavePlayerPayment = async () => {
    if (!playerId || !amount || !description) return alert('Fill all fields');
    
    let receiptUrl = null;
    if (receiptFile) {
      const formData = new FormData();
      formData.append('file', receiptFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        receiptUrl = url;
      }
    }

    await fetch('/api/ledger/player-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, amount: parseFloat(amount), date: dateStr, againstWhat: description, receiptUrl })
    });
    setPlayerPaymentModal({ isOpen: false });
    setReceiptFile(null);
    fetchMonthData(currentMonth);
  };

  const handleDeletePlayerPayment = async (id: string) => {
    await fetch(`/api/ledger/player-payments?id=${id}`, { method: 'DELETE' });
    fetchMonthData(currentMonth);
  };

  const handleSaveCategory = async () => {
    const payload = { name: catName, unitWord: catUnit, isFixedRate: catFixed, defaultRate: parseFloat(catRate) };
    if (categoryModal.category) {
      await fetch('/api/ledger/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryModal.category.id, ...payload })
      });
    } else {
      await fetch('/api/ledger/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, order: (data?.categories.length || 0) + 1 })
      });
    }
    setCategoryModal({ isOpen: false });
    fetchMonthData(currentMonth);
  };

  const handleDeleteCategory = async () => {
    if (!categoryModal.category) return;
    if (confirm("Are you sure? This will not delete entries but might break views.")) {
      await fetch(`/api/ledger/categories?id=${categoryModal.category.id}`, { method: 'DELETE' });
      setCategoryModal({ isOpen: false });
      fetchMonthData(currentMonth);
    }
  };

  const openEntryModal = (cat: LedgerCategory) => {
    setEntryModal({ isOpen: true, category: cat });
    setAmount(cat.isFixedRate ? cat.defaultRate.toString() : '');
    setDescription('');
    setDateStr(format(new Date(), 'yyyy-MM-dd'));
  };

  const openCategoryModal = (cat?: LedgerCategory) => {
    setCategoryModal({ isOpen: true, category: cat });
    if (cat) {
      setCatName(cat.name); setCatUnit(cat.unitWord); setCatFixed(cat.isFixedRate); setCatRate(cat.defaultRate.toString());
    } else {
      setCatName(''); setCatUnit('session'); setCatFixed(true); setCatRate('0');
    }
  };

  const openPlayerPaymentModal = () => {
    setPlayerPaymentModal({ isOpen: true });
    setPlayerId(players[0]?.id || '');
    setAmount('');
    setDescription('');
    setDateStr(format(new Date(), 'yyyy-MM-dd'));
    setReceiptFile(null);
  };

  // Export/Import
  const exportData = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const wsCategories = XLSX.utils.json_to_sheet(data.categories);
    XLSX.utils.book_append_sheet(wb, wsCategories, "Categories");

    const wsEntries = XLSX.utils.json_to_sheet(data.entries.map(e => ({
      ...e,
      categoryName: data.categories.find(c => c.id === e.categoryId)?.name || 'Unknown'
    })));
    XLSX.utils.book_append_sheet(wb, wsEntries, "Entries");

    const wsPayments = XLSX.utils.json_to_sheet(data.payments);
    XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");

    const wsPlayerPayments = XLSX.utils.json_to_sheet(data.playerPayments.map(p => ({
      ...p,
      playerName: players.find(player => player.id === p.playerId)?.name || 'Unknown'
    })));
    XLSX.utils.book_append_sheet(wb, wsPlayerPayments, "Player Payments");

    const wsMeta = XLSX.utils.json_to_sheet([{ openingBalance: data.openingBalance }]);
    XLSX.utils.book_append_sheet(wb, wsMeta, "Metadata");

    XLSX.writeFile(wb, `ledger_backup_${format(new Date(), 'yyyy-MM')}.xlsx`);
  };

  if (loading && !data) return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 p-4">
      {/* Header & Month Nav */}
      <div className="flex items-center justify-between bg-surface-container p-4 rounded-2xl border border-outline-variant/30 shadow-sm">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-variant rounded-full text-on-surface transition-colors">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <div className="flex items-center gap-4">
          <h2 className="font-display text-xl font-bold text-on-surface">{format(currentMonth, 'MMMM yyyy')}</h2>
          <Link href="/cricket-ledger/players" className="p-1 hover:text-primary transition-colors text-outline" title="Player Master">
            <span className="material-symbols-outlined">group</span>
          </Link>
        </div>
        <button onClick={handleNextMonth} className="p-2 hover:bg-surface-variant rounded-full text-on-surface transition-colors">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {/* Balance Card */}
      <div className={`p-8 rounded-3xl border transition-all duration-300 shadow-lg relative overflow-hidden ${isCredit ? 'bg-success/10 border-success/30 text-success' : 'bg-error/10 border-error/30 text-error'}`}>
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -mr-20 -mt-20 opacity-20 ${isCredit ? 'bg-success' : 'bg-error'}`}></div>
        <p className="text-sm font-mono font-medium uppercase tracking-wider mb-2 opacity-80">
          {isCredit ? 'Credit Available' : 'Balance Payable'}
        </p>
        <h1 className="font-display text-5xl font-black tracking-tight">₹{displayBalance.toLocaleString()}</h1>
        <div className="mt-4 flex gap-4 text-xs font-body opacity-70">
          <span>Opening: ₹{openingBalance.toLocaleString()}</span>
          <span>•</span>
          <span>Entries: ₹{currentMonthEntriesTotal.toLocaleString()}</span>
          <span>•</span>
          <span>Paid: ₹{currentMonthPaymentsTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Category Cards */}
      <div className="space-y-4">
        {data?.categories.map(cat => {
          const catEntries = data.entries.filter(e => e.categoryId === cat.id);
          const catTotal = catEntries.reduce((sum, e) => sum + e.amount, 0);
          return (
            <div key={cat.id} className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-bold text-on-surface">{cat.name}</h3>
                  <button onClick={() => openCategoryModal(cat)} className="text-outline-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100 p-1">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
                <span className="font-mono text-lg font-semibold text-on-surface">₹{catTotal.toLocaleString()}</span>
              </div>
              
              {catEntries.length > 0 && (
                <div className="mb-4 space-y-2">
                  {catEntries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between text-sm py-1 border-b border-outline-variant/10 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-outline font-mono text-xs">{format(new Date(entry.date), 'dd MMM')}</span>
                        <span className="text-on-surface-variant">{entry.description || `1 ${cat.unitWord}`}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-on-surface">₹{entry.amount.toLocaleString()}</span>
                        <button onClick={() => handleDeleteEntry(entry.id)} className="text-outline hover:text-error transition-colors">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button onClick={() => openEntryModal(cat)} className="w-full py-2 flex items-center justify-center gap-2 bg-surface-variant/50 hover:bg-surface-variant rounded-xl text-primary font-medium text-sm transition-colors border border-primary/10">
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add {cat.unitWord}
              </button>
            </div>
          );
        })}

        <button onClick={() => openCategoryModal()} className="w-full py-4 border-2 border-dashed border-outline-variant/50 hover:border-primary/50 hover:bg-primary/5 rounded-2xl text-on-surface-variant hover:text-primary transition-colors font-medium flex items-center justify-center gap-2">
          <span className="material-symbols-outlined">add_circle</span> Add new category
        </button>
      </div>

      {/* Payments to Coach Section */}
      <div className="bg-surface-container-high border border-outline-variant/50 rounded-2xl p-5 shadow-sm mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-success">payments</span>
            <h3 className="font-display text-lg font-bold text-on-surface">Payments to Coach</h3>
          </div>
          <span className="font-mono text-lg font-bold text-success">₹{currentMonthPaymentsTotal.toLocaleString()}</span>
        </div>
        
        {data?.payments.length ? (
          <div className="mb-4 space-y-2">
            {data.payments.map(payment => (
              <div key={payment.id} className="flex items-center justify-between text-sm py-1 border-b border-outline-variant/10 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-outline font-mono text-xs">{format(new Date(payment.date), 'dd MMM')}</span>
                  <span className="text-on-surface-variant">{payment.description || 'Payment'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-success">₹{payment.amount.toLocaleString()}</span>
                  <button onClick={() => handleDeletePayment(payment.id)} className="text-outline hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <button onClick={() => { setPaymentModal({ isOpen: true }); setAmount(''); setDateStr(format(new Date(), 'yyyy-MM-dd')); setDescription(''); }} className="w-full py-2 flex items-center justify-center gap-2 bg-success/10 hover:bg-success/20 rounded-xl text-success font-medium text-sm transition-colors border border-success/20">
          <span className="material-symbols-outlined text-[18px]">add</span> Record Payment
        </button>
      </div>

      {/* Player Payments Section */}
      <div className="bg-surface-container-high border border-outline-variant/50 rounded-2xl p-5 shadow-sm mt-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">groups</span>
            <h3 className="font-display text-lg font-bold text-on-surface">Player Contributions</h3>
          </div>
          <span className="font-mono text-lg font-bold text-primary">₹{currentMonthPlayerPaymentsTotal.toLocaleString()}</span>
        </div>
        
        {data?.playerPayments.length ? (
          <div className="mb-4 space-y-3 relative z-10">
            {data.playerPayments.map(payment => (
              <div key={payment.id} className="flex items-start justify-between text-sm py-2 border-b border-outline-variant/10 last:border-0">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{payment.player.name}</span>
                    <span className="text-outline font-mono text-xs">{format(new Date(payment.date), 'dd MMM')}</span>
                  </div>
                  <span className="text-on-surface-variant text-xs">{payment.againstWhat}</span>
                  {payment.receiptUrl && (
                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs mt-1">
                      <span className="material-symbols-outlined text-[14px]">receipt_long</span> View Receipt
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <span className="font-mono text-primary font-bold">₹{payment.amount.toLocaleString()}</span>
                  <button onClick={() => handleDeletePlayerPayment(payment.id)} className="text-outline hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-outline mb-4 relative z-10">No player payments recorded this month.</p>}

        <button onClick={openPlayerPaymentModal} className="w-full py-2 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary font-medium text-sm transition-colors border border-primary/20 relative z-10">
          <span className="material-symbols-outlined text-[18px]">add</span> Record Player Payment
        </button>
      </div>

      {/* Export / Import */}
      <div className="flex gap-4 pt-4 border-t border-outline-variant/30 justify-center">
        <button onClick={exportData} className="flex items-center gap-2 text-sm text-outline hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[18px]">download</span> Export Backup
        </button>
      </div>

      {/* Entry Modal */}
      {entryModal.isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-3xl p-6 w-full max-w-sm border border-outline-variant/30 shadow-2xl">
            <h3 className="font-display text-xl font-bold mb-4">Add {entryModal.category?.name}</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-mono text-outline mb-1 block">Date</label><input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface" /></div>
              <div><label className="text-xs font-mono text-outline mb-1 block">Amount (₹)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface font-mono" /></div>
              <div><label className="text-xs font-mono text-outline mb-1 block">Description (optional)</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface" placeholder={`e.g. 1 ${entryModal.category?.unitWord}`} /></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setEntryModal({ isOpen: false })} className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface font-medium hover:bg-surface-variant/80 transition-colors">Cancel</button><button onClick={handleSaveEntry} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors">Save</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-3xl p-6 w-full max-w-sm border border-outline-variant/30 shadow-2xl border-t-4 border-t-success">
            <h3 className="font-display text-xl font-bold mb-4 text-success flex items-center gap-2"><span className="material-symbols-outlined">payments</span> Record Payment</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-mono text-outline mb-1 block">Date</label><input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface" /></div>
              <div><label className="text-xs font-mono text-outline mb-1 block">Amount Paid (₹)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface font-mono text-success font-bold" /></div>
              <div className="flex gap-3 pt-2"><button onClick={() => setPaymentModal({ isOpen: false })} className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface font-medium hover:bg-surface-variant/80 transition-colors">Cancel</button><button onClick={handleSavePayment} className="flex-1 py-3 rounded-xl bg-success text-on-success font-bold hover:bg-success/90 transition-colors">Save Payment</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Player Payment Modal */}
      {playerPaymentModal.isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-3xl p-6 w-full max-w-sm border border-outline-variant/30 shadow-2xl border-t-4 border-t-primary">
            <h3 className="font-display text-xl font-bold mb-4 text-primary flex items-center gap-2"><span className="material-symbols-outlined">groups</span> Player Payment</h3>
            {players.length === 0 ? (
              <div className="text-center">
                <p className="text-sm text-outline mb-4">No players added to the master yet.</p>
                <Link href="/cricket-ledger/players" className="text-primary hover:underline">Go to Player Master</Link>
                <button onClick={() => setPlayerPaymentModal({ isOpen: false })} className="w-full mt-4 py-3 rounded-xl bg-surface-variant text-on-surface font-medium hover:bg-surface-variant/80">Cancel</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-mono text-outline mb-1 block">Who Paid?</label>
                  <select value={playerId} onChange={e => setPlayerId(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface">
                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-mono text-outline mb-1 block">Date</label><input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface" /></div>
                <div><label className="text-xs font-mono text-outline mb-1 block">Amount Paid (₹)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface font-mono font-bold" /></div>
                <div><label className="text-xs font-mono text-outline mb-1 block">Against What?</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface" placeholder="e.g. June Coaching" /></div>
                <div>
                  <label className="text-xs font-mono text-outline mb-1 block">Upload Receipt (optional)</label>
                  <input type="file" onChange={e => setReceiptFile(e.target.files?.[0] || null)} className="w-full bg-surface p-2 rounded-xl border border-outline-variant/50 text-on-surface text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                </div>
                <div className="flex gap-3 pt-2"><button onClick={() => setPlayerPaymentModal({ isOpen: false })} className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface font-medium hover:bg-surface-variant/80 transition-colors">Cancel</button><button onClick={handleSavePlayerPayment} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors">Save Payment</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Editor Modal */}
      {categoryModal.isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-3xl p-6 w-full max-w-sm border border-outline-variant/30 shadow-2xl">
            <h3 className="font-display text-xl font-bold mb-4">{categoryModal.category ? 'Edit Category' : 'New Category'}</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-mono text-outline mb-1 block">Category Name</label><input type="text" value={catName} onChange={e => setCatName(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface" placeholder="e.g. Coaching" /></div>
              <div><label className="text-xs font-mono text-outline mb-1 block">Unit Word</label><input type="text" value={catUnit} onChange={e => setCatUnit(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface" placeholder="e.g. session, match" /></div>
              <label className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-outline-variant/50 cursor-pointer hover:bg-surface-variant/30 transition-colors"><input type="checkbox" checked={catFixed} onChange={e => setCatFixed(e.target.checked)} className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary" /><span className="text-sm font-medium">Has Fixed Default Rate</span></label>
              {catFixed && (<div><label className="text-xs font-mono text-outline mb-1 block">Default Rate (₹)</label><input type="number" value={catRate} onChange={e => setCatRate(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface font-mono" /></div>)}
              <div className="flex gap-3 pt-4">
                {categoryModal.category && (<button onClick={handleDeleteCategory} className="py-3 px-4 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors"><span className="material-symbols-outlined">delete</span></button>)}
                <button onClick={() => setCategoryModal({ isOpen: false })} className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface font-medium hover:bg-surface-variant/80 transition-colors">Cancel</button>
                <button onClick={handleSaveCategory} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
