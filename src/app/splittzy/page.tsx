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

  // Helper to calculate user share text on card
  const getCardShareBadge = (bill: Bill) => {
    // Check pending receivable amount
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

  const activeBills = bills.filter((b) => b.participants.some((p) => p.status !== 'PAID'));
  const completedBills = bills.filter((b) => b.participants.length > 0 && b.participants.every((p) => p.status === 'PAID'));

  const renderBillCard = (bill: Bill) => (
    <div
      key={bill.id}
      className="bg-surface-container/50 backdrop-blur-xl border border-outline-variant/60 rounded-2xl p-5 flex flex-col justify-between hover:shadow-xl hover:border-emerald-500/40 transition-all duration-200 group"
    >
      <div>
        {/* Bill Title & Date */}
        <div className="mb-4">
          <h3 className="text-lg font-bold font-display text-on-surface truncate group-hover:text-emerald-400 transition-colors">
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

        {/* Personal Net Share Status Badge */}
        <div className="my-4 p-3 bg-surface-container-low/60 rounded-xl border border-outline-variant/30 text-center">
          {getCardShareBadge(bill)}
        </div>
      </div>

      {/* Card Action Buttons: Details | Export | Link */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-outline-variant/30">
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
                <p className="text-xs text-on-surface-variant mt-1">All bills are either settled or non-existent.</p>
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
        </div>
      )}
    </div>
  );
}
