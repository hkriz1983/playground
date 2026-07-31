"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Participant = {
  id: string;
  friendId: string;
  shareAmount: number;
  status: string;
  friend: {
    name: string;
    nickname: string;
    avatar: string | null;
  };
};

type Bill = {
  id: string;
  title: string;
  date: string;
  totalAmount: number;
  splitMode: string;
  shareCode: string;
  isCancelled?: boolean;
  cancellationReason?: string | null;
  participants: Participant[];
};

type Summary = {
  totalReceivable: number;
  totalDue: number;
  netReceive: number;
};

export default function SplittzyDashboard() {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalReceivable: 0, totalDue: 0, netReceive: 0 });
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState<string>('date_desc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cancellation modal state
  const [cancelModalBill, setCancelModalBill] = useState<Bill | null>(null);
  const [cancellationReasonInput, setCancellationReasonInput] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);

  const fetchBills = (sort = sortOption) => {
    setLoading(true);
    fetch(`/api/splittzy/bills?sort=${sort}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.bills) {
          setBills(data.bills);
          setSummary(data.summary);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBills(sortOption);
  }, [sortOption]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyLink = (shareCode: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/splittzy/p/${shareCode}`;
    navigator.clipboard.writeText(publicUrl);
    showToast('Public shareable link copied to clipboard!');
  };

  const handleExportBill = (bill: Bill) => {
    const rows = [
      ['Splittzy Bill Summary'],
      ['Bill Name', bill.title],
      ['Status', bill.isCancelled ? `CANCELLED (${bill.cancellationReason || 'No reason provided'})` : 'ACTIVE'],
      ['Date', new Date(bill.date).toLocaleDateString()],
      ['Total Amount', `₹${bill.totalAmount}`],
      ['Share Code', bill.shareCode],
      [''],
      ['Participant', 'Share Amount (₹)', 'Payment Status'],
      ...bill.participants.map((p) => [
        p.friend?.name || 'Friend',
        p.shareAmount,
        p.status,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${bill.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_summary.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${bill.title} to CSV!`);
  };

  const handleOpenCancelModal = (bill: Bill) => {
    setCancelModalBill(bill);
    setCancellationReasonInput('');
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalBill || !cancellationReasonInput.trim()) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/splittzy/bills/${cancelModalBill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_bill',
          cancellationReason: cancellationReasonInput.trim(),
        }),
      });

      if (res.ok) {
        setCancelModalBill(null);
        setCancellationReasonInput('');
        showToast('Bill cancelled successfully!');
        fetchBills(sortOption);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to cancel bill');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  const handleUncancelBill = async (billId: string) => {
    if (!confirm('Are you sure you want to restore this cancelled bill?')) return;

    try {
      const res = await fetch(`/api/splittzy/bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uncancel_bill',
        }),
      });

      if (res.ok) {
        showToast('Bill restored to active status!');
        fetchBills(sortOption);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to calculate user share text on card
  const getCardShareBadge = (bill: Bill) => {
    if (bill.isCancelled) {
      return (
        <div>
          <span className="text-xl font-bold font-display text-rose-500 uppercase tracking-wide">
            CANCELLED
          </span>
          {bill.cancellationReason && (
            <p className="text-xs text-on-surface-variant line-clamp-1 italic mt-1">
              &quot;{bill.cancellationReason}&quot;
            </p>
          )}
        </div>
      );
    }

    let pendingReceivable = 0;
    let pendingPayable = 0;

    bill.participants.forEach((p) => {
      if (p.status !== 'PAID') {
        if (p.shareAmount > 0) pendingReceivable += p.shareAmount;
        if (p.shareAmount < 0) pendingPayable += Math.abs(p.shareAmount);
      }
    });

    if (pendingReceivable > 0) {
      return (
        <span className="text-2xl font-bold font-display text-emerald-500">
          get rs {pendingReceivable}
        </span>
      );
    } else if (pendingPayable > 0) {
      return (
        <span className="text-2xl font-bold font-display text-rose-500">
          Due {pendingPayable}
        </span>
      );
    } else {
      return (
        <span className="text-xl font-semibold font-display text-emerald-400">
          All Settled
        </span>
      );
    }
  };

  const activeBills = bills.filter((b) => !b.isCancelled && b.participants.some((p) => p.status !== 'PAID'));
  const completedBills = bills.filter((b) => !b.isCancelled && b.participants.length > 0 && b.participants.every((p) => p.status === 'PAID'));
  const cancelledBills = bills.filter((b) => b.isCancelled);

  const renderBillCard = (bill: Bill) => (
    <div
      key={bill.id}
      className={`bg-surface-container/50 backdrop-blur-xl border rounded-2xl p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-200 group ${
        bill.isCancelled
          ? 'border-rose-500/30 bg-rose-950/10'
          : 'border-outline-variant/60 hover:border-emerald-500/40'
      }`}
    >
      <div>
        {/* Bill Title & Date */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h3 className={`text-lg font-bold font-display truncate transition-colors ${
              bill.isCancelled ? 'text-on-surface-variant line-through' : 'text-on-surface group-hover:text-emerald-400'
            }`}>
              {bill.title}
            </h3>
            <p className="text-xs font-mono text-on-surface-variant mt-0.5">
              {new Date(bill.date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
          {bill.isCancelled && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
              Cancelled
            </span>
          )}
        </div>

        {/* Personal Net Share Status Badge */}
        <div className={`my-4 p-3 rounded-xl border text-center ${
          bill.isCancelled
            ? 'bg-rose-500/10 border-rose-500/20'
            : 'bg-surface-container-low/60 border-outline-variant/30'
        }`}>
          {getCardShareBadge(bill)}
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-outline-variant/30">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => router.push(`/splittzy/bills/${bill.id}`)}
            className="py-1.5 px-2 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 rounded-lg text-xs font-semibold text-on-surface transition-all flex items-center justify-center gap-1"
          >
            Details
          </button>

          <button
            onClick={() => handleExportBill(bill)}
            className="py-1.5 px-2 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 rounded-lg text-xs font-semibold text-on-surface transition-all flex items-center justify-center gap-1"
          >
            Export
          </button>

          <button
            onClick={() => handleCopyLink(bill.shareCode)}
            className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
          >
            Link
          </button>
        </div>

        {/* Cancel or Restore Button */}
        {bill.isCancelled ? (
          <button
            onClick={() => handleUncancelBill(bill.id)}
            className="w-full py-1.5 px-2 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 rounded-lg text-xs font-semibold text-emerald-400 transition-all flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">restore</span>
            Restore Bill
          </button>
        ) : (
          <button
            onClick={() => handleOpenCancelModal(bill)}
            className="w-full py-1.5 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">cancel</span>
            Cancel Bill
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* App Header & Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-on-surface">Splittzy</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Fintech Hub
            </span>
          </div>
          <p className="text-sm text-on-surface-variant font-body">
            Smart bill splitting, quick participant share tracking, and instant settlements.
          </p>
        </div>

        {/* Quick Nav Links */}
        <div className="flex items-center gap-3">
          <Link
            href="/splittzy/friends"
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-variant rounded-xl border border-outline-variant/30 text-sm font-medium text-on-surface transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            Friends Master
          </Link>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/40 rounded-2xl p-4 md:p-6 shadow-lg flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
        {/* 3 Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
          {/* Total Receivable */}
          <div className="bg-surface-container-low/80 border border-blue-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-xs font-semibold text-blue-400 tracking-wide uppercase mb-1">
              Total receivable amount
            </span>
            <span className="text-2xl font-bold font-display text-blue-400">
              Rs{summary.totalReceivable}
            </span>
          </div>

          {/* Total Due Amount */}
          <div className="bg-surface-container-low/80 border border-rose-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-xs font-semibold text-rose-500 tracking-wide uppercase mb-1">
              Total due amount
            </span>
            <span className="text-2xl font-bold font-display text-rose-500">
              Rs{summary.totalDue}
            </span>
          </div>

          {/* Net Receive / Balance */}
          <div className="bg-surface-container-low/80 border border-emerald-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
            <span className="text-xs font-semibold text-emerald-500 tracking-wide uppercase mb-1">
              {summary.netReceive >= 0 ? 'Net Recieve' : 'Net Payable'}
            </span>
            <span className={`text-2xl font-bold font-display ${summary.netReceive >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {summary.netReceive >= 0 ? `Rs${summary.netReceive}` : `-Rs${Math.abs(summary.netReceive)}`}
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center justify-end gap-3 flex-wrap border-t lg:border-t-0 lg:border-l border-outline-variant/30 pt-4 lg:pt-0 lg:pl-6">
          <Link
            href="/splittzy/friends"
            className="px-4 py-2.5 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 text-on-surface text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add friends
          </Link>

          <Link
            href="/splittzy/bills/new"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-emerald-600/30 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add Bills
          </Link>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="appearance-none px-4 py-2.5 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 text-on-surface text-sm font-semibold rounded-xl transition-all pr-8 cursor-pointer shadow-sm"
            >
              <option value="date_desc">Sort: Newest First</option>
              <option value="date_asc">Sort: Oldest First</option>
              <option value="amount_desc">Sort: Highest Amount</option>
              <option value="amount_asc">Sort: Lowest Amount</option>
            </select>
            <span className="material-symbols-outlined text-[18px] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-outline">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8 mt-2">
          {/* Active Bills Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                Active Bills ({activeBills.length})
              </h2>
            </div>

            {activeBills.length === 0 ? (
              <div className="bg-surface-container/40 border border-outline-variant/50 backdrop-blur-xl p-8 text-center rounded-2xl text-outline font-body">
                <p className="text-sm font-semibold text-on-surface">No active bills</p>
                <p className="text-xs text-on-surface-variant mt-1">All bills are either settled, cancelled, or non-existent.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {activeBills.map(renderBillCard)}
              </div>
            )}
          </div>

          {/* Completed Bills Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display text-emerald-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                Completed Bills ({completedBills.length})
              </h2>
            </div>

            {completedBills.length === 0 ? (
              <div className="bg-surface-container/40 border border-outline-variant/50 backdrop-blur-xl p-8 text-center rounded-2xl text-outline font-body">
                <p className="text-sm font-semibold text-on-surface">No completed bills yet</p>
                <p className="text-xs text-on-surface-variant mt-1">Once all participants pay their share, bills will move here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {completedBills.map(renderBillCard)}
              </div>
            )}
          </div>

          {/* Cancelled Bills Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display text-rose-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400">cancel</span>
                Cancelled Bills ({cancelledBills.length})
              </h2>
            </div>

            {cancelledBills.length === 0 ? (
              <div className="bg-surface-container/40 border border-outline-variant/50 backdrop-blur-xl p-8 text-center rounded-2xl text-outline font-body">
                <p className="text-sm font-semibold text-on-surface">No cancelled bills</p>
                <p className="text-xs text-on-surface-variant mt-1">Bills cancelled with a reason will appear here and are excluded from summary balances.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cancelledBills.map(renderBillCard)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Cancel Bill with Reason */}
      {cancelModalBill && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant/60 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display text-rose-400 flex items-center gap-2">
                <span className="material-symbols-outlined">cancel</span>
                Cancel Bill: {cancelModalBill.title}
              </h2>
              <button onClick={() => setCancelModalBill(null)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <p className="text-xs text-on-surface-variant">
                Cancelling this bill will remove its amount from all total receivable, due, and net calculations, and move it to the <strong>Cancelled Bills</strong> section.
              </p>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Duplicate entry, bill wrong amount, or party cancelled..."
                  value={cancellationReasonInput}
                  onChange={(e) => setCancellationReasonInput(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setCancelModalBill(null)}
                  className="px-4 py-2 bg-surface-variant text-on-surface text-sm font-semibold rounded-xl"
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  disabled={cancelling || !cancellationReasonInput.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
