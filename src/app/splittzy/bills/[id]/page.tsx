"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Participant = {
  id: string;
  friendId: string;
  shareAmount: number;
  status: string; // PENDING | PAYMENT_UPLOADED | PAID
  paymentScreenshot: string | null;
  paidAt: string | null;
  friend: {
    id: string;
    name: string;
    nickname: string;
    phone: string | null;
    avatar: string | null;
  };
};

type BillDetail = {
  id: string;
  title: string;
  date: string;
  totalAmount: number;
  splitMode: string;
  billPhotos: string | null; // JSON string array
  shareCode: string;
  isCancelled?: boolean;
  cancellationReason?: string | null;
  participants: Participant[];
};

type Friend = {
  id: string;
  name: string;
  nickname: string;
};

export default function OwnerBillDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const billId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add friend to bill modal
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [friendShareAmount, setFriendShareAmount] = useState('');

  // Cancel bill modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReasonInput, setCancellationReasonInput] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!billId) return;
    setLoading(true);
    fetch(`/api/splittzy/bills/${billId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setBill(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [billId]);

  const fetchBillDetail = () => {
    if (!billId) return;
    fetch(`/api/splittzy/bills/${billId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          setBill(data);
        }
      })
      .catch((err) => console.error(err));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const getPhotosArray = (): string[] => {
    if (!bill || !bill.billPhotos) return [];
    try {
      const parsed = JSON.parse(bill.billPhotos);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const photos = getPhotosArray();

  // Photo controls: Back, Replace, Next
  const handlePhotoNext = () => {
    if (photos.length === 0) return;
    setActivePhotoIdx((prev) => (prev + 1) % photos.length);
  };

  const handlePhotoBack = () => {
    if (photos.length === 0) return;
    setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleReplacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !bill) return;

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        const updatedPhotos = [...photos];
        if (photos.length === 0) {
          updatedPhotos.push(data.url);
        } else {
          updatedPhotos[activePhotoIdx] = data.url;
        }

        await fetch(`/api/splittzy/bills/${bill.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_photos',
            billPhotos: updatedPhotos,
          }),
        });

        fetchBillDetail();
        showToast('Receipt photo updated!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Owner direct payment proof upload for participant
  const handleOwnerProofUpload = async (participantId: string, file: File) => {
    if (!file || !bill) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        await fetch(`/api/splittzy/bills/${bill.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upload_participant_proof',
            participantId,
            screenshotUrl: data.url,
            status: 'PAID',
          }),
        });

        fetchBillDetail();
        showToast('Payment proof uploaded & marked as paid!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Settle / Mark as Paid
  const handleToggleSettle = async (participantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
    try {
      const res = await fetch(`/api/splittzy/bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settle_participant',
          participantId,
          status: newStatus,
        }),
      });

      if (res.ok) {
        fetchBillDetail();
        showToast(newStatus === 'PAID' ? 'Payment marked as done!' : 'Status reset to pending.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add friend to existing bill modal
  const openAddFriendModal = () => {
    fetch('/api/splittzy/friends')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAllFriends(data);
      });
    setIsAddFriendModalOpen(true);
  };

  const handleAddFriendToBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriendId || !friendShareAmount || !bill) return;

    try {
      const res = await fetch(`/api/splittzy/bills/${bill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_participant',
          friendId: selectedFriendId,
          shareAmount: parseFloat(friendShareAmount),
        }),
      });

      if (res.ok) {
        setIsAddFriendModalOpen(false);
        setSelectedFriendId('');
        setFriendShareAmount('');
        fetchBillDetail();
        showToast('Participant added to bill!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyPublicLink = () => {
    if (!bill) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/splittzy/p/${bill.shareCode}`;
    navigator.clipboard.writeText(publicUrl);
    showToast('Public share link copied!');
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill || !cancellationReasonInput.trim()) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/splittzy/bills/${bill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_bill',
          cancellationReason: cancellationReasonInput.trim(),
        }),
      });

      if (res.ok) {
        setIsCancelModalOpen(false);
        setCancellationReasonInput('');
        fetchBillDetail();
        showToast('Bill cancelled successfully!');
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

  const handleUncancelBill = async () => {
    if (!bill || !confirm('Are you sure you want to restore this bill?')) return;

    try {
      const res = await fetch(`/api/splittzy/bills/${bill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'uncancel_bill',
        }),
      });

      if (res.ok) {
        fetchBillDetail();
        showToast('Bill restored to active status!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="text-center py-16 bg-surface-container/40 rounded-2xl border border-outline-variant/50">
        <p className="text-on-surface font-semibold text-lg">Bill not found</p>
        <Link href="/splittzy" className="text-emerald-400 text-sm font-semibold underline mt-2 block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate totals for top summary header matching Screenshot 2
  let totalReceived = 0;
  bill.participants.forEach((p) => {
    if (p.status === 'PAID' && p.shareAmount > 0) {
      totalReceived += p.shareAmount;
    }
  });

  let pendingBalance = 0;
  bill.participants.forEach((p) => {
    if (p.status !== 'PAID' && p.shareAmount > 0) {
      pendingBalance += p.shareAmount;
    }
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Cancelled Bill Banner */}
      {bill.isCancelled && (
        <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
              <span className="material-symbols-outlined text-2xl">cancel</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
                THIS BILL HAS BEEN CANCELLED
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Reason: &quot;<span className="italic font-medium text-on-surface">{bill.cancellationReason || 'No reason provided'}</span>&quot;
              </p>
            </div>
          </div>
          <button
            onClick={handleUncancelBill}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-sm">restore</span>
            Restore Bill
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-surface-container/60 backdrop-blur-xl border border-outline-variant/40 rounded-2xl p-4 md:p-6 shadow-lg flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
        {/* Left: Bill Name - Date */}
        <div className="flex items-center gap-3">
          <Link href="/splittzy" className="text-on-surface-variant hover:text-emerald-400 transition-colors">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display text-on-surface flex items-center gap-2">
              {bill.title}
              <span className="text-sm font-mono text-outline font-normal">
                - {new Date(bill.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </h1>
            <span className="text-xs text-on-surface-variant font-mono">
              Split Mode: {bill.splitMode} | Code: {bill.shareCode}
            </span>
          </div>
        </div>

        {/* Center: 3 Badges (Total Bill Amount | Received | Pending Balance) */}
        <div className="grid grid-cols-3 gap-3 flex-1 max-w-xl">
          {/* Total Bill Amount */}
          <div className="bg-surface-container-low/80 border border-blue-500/30 rounded-xl p-3 text-center">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wide block">
              Total Bill Amount
            </span>
            <span className="text-xl font-bold font-display text-blue-400">
              ₹{bill.totalAmount}
            </span>
          </div>

          {/* Received */}
          <div className="bg-surface-container-low/80 border border-emerald-500/30 rounded-xl p-3 text-center">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide block">
              Received
            </span>
            <span className="text-xl font-bold font-display text-emerald-400">
              ₹{totalReceived}
            </span>
          </div>

          {/* Pending Balance */}
          <div className="bg-surface-container-low/80 border border-rose-500/30 rounded-xl p-3 text-center">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide block">
              Pending Balance
            </span>
            <span className="text-xl font-bold font-display text-rose-400">
              Get rs {pendingBalance}
            </span>
          </div>
        </div>

        {/* Right Actions: Add friends & Share Link & Cancel */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={openAddFriendModal}
            className="px-3.5 py-2.5 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 text-on-surface text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add friends
          </button>

          <button
            onClick={handleCopyPublicLink}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            Share Link
          </button>

          {!bill.isCancelled ? (
            <button
              onClick={() => {
                setCancellationReasonInput('');
                setIsCancelModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
              Cancel Bill
            </button>
          ) : (
            <button
              onClick={handleUncancelBill}
              className="px-3.5 py-2.5 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 text-emerald-400 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">restore</span>
              Restore Bill
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout (Matching Wireframe Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Bill Photo / Receipt Gallery (Matching Screenshot 2 Wireframe) */}
        <div className="lg:col-span-4 bg-surface-container/50 border border-outline-variant/50 rounded-2xl p-5 backdrop-blur-xl flex flex-col gap-4 shadow-sm">
          <h2 className="text-base font-bold font-display text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-3">
            <span className="material-symbols-outlined text-emerald-400">photo_library</span>
            Bill Photo / Receipt
          </h2>

          <div className="bg-amber-100/10 border border-amber-500/30 rounded-xl p-3 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden group">
            {photos.length > 0 ? (
              <img
                src={photos[activePhotoIdx]}
                alt="Bill Photo"
                className="max-h-[320px] w-full object-contain rounded-lg shadow-md cursor-pointer"
                onClick={() => setScreenshotModalUrl(photos[activePhotoIdx])}
              />
            ) : (
              <div className="text-center p-8 text-outline">
                <span className="material-symbols-outlined text-5xl mb-2 text-outline-variant">receipt</span>
                <p className="text-sm font-medium text-on-surface-variant">No bill photo uploaded</p>
                <p className="text-xs text-outline mt-1">Click &quot;Replace&quot; below to upload receipt image.</p>
              </div>
            )}

            {photos.length > 1 && (
              <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-on-surface">
                {activePhotoIdx + 1} / {photos.length}
              </div>
            )}
          </div>

          {/* Photo Gallery Navigation Controls: back | Replace | Next (Matching Screenshot 2 Wireframe) */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={handlePhotoBack}
              disabled={photos.length <= 1}
              className="py-2 px-3 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 rounded-xl text-xs font-semibold text-on-surface disabled:opacity-40 transition-all flex items-center justify-center gap-1"
            >
              back
            </button>

            <label className="py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-center">
              {uploadingPhoto ? 'Uploading...' : 'Replace'}
              <input type="file" accept="image/*" onChange={handleReplacePhoto} className="hidden" />
            </label>

            <button
              onClick={handlePhotoNext}
              disabled={photos.length <= 1}
              className="py-2 px-3 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 rounded-xl text-xs font-semibold text-on-surface disabled:opacity-40 transition-all flex items-center justify-center gap-1"
            >
              Next
            </button>
          </div>
        </div>

        {/* Right Panel: Participant Settlement Table (Matching Screenshot 2 Wireframe) */}
        <div className="lg:col-span-8 bg-surface-container/50 border border-outline-variant/50 rounded-2xl p-5 backdrop-blur-xl flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <h2 className="text-base font-bold font-display text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">table_chart</span>
              Participant Split & Settlement Table
            </h2>
            <span className="text-xs font-mono text-outline">
              {bill.participants.length} Friends
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-body border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/40 text-xs font-semibold uppercase text-outline tracking-wider">
                  <th className="py-3 px-4">Person / Friend</th>
                  <th className="py-3 px-4 text-right">Split Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Screenshot</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {bill.participants.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-high/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-on-surface">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center overflow-hidden">
                          {p.friend.avatar ? (
                            <img src={p.friend.avatar} alt={p.friend.name} className="w-full h-full object-cover" />
                          ) : (
                            p.friend.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{p.friend.name}</p>
                          <p className="text-[10px] font-mono text-outline">@{p.friend.nickname}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-display font-bold text-emerald-400 text-base">
                      ₹{p.shareAmount}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {p.status === 'PAID' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Paid
                        </span>
                      ) : p.status === 'PAYMENT_UPLOADED' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Uploaded / Verification
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {p.paymentScreenshot && (
                          <button
                            onClick={() => setScreenshotModalUrl(p.paymentScreenshot!)}
                            className="px-2 py-1 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 text-[11px] font-semibold rounded-lg text-emerald-400 transition-all flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">visibility</span>
                            View
                          </button>
                        )}
                        <label className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-semibold rounded-lg text-emerald-400 cursor-pointer transition-all flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-xs">upload_file</span>
                          {p.paymentScreenshot ? 'Replace' : 'Upload Proof'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleOwnerProofUpload(p.id, file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleSettle(p.id, p.status)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          p.status === 'PAID'
                            ? 'bg-surface-variant text-outline hover:text-on-surface border border-outline-variant/40'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                        }`}
                      >
                        {p.status === 'PAID' ? 'Mark Pending' : 'Mark Payment Done'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal: View Payment Screenshot / Lightbox */}
      {screenshotModalUrl && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant/60 rounded-2xl max-w-xl w-full p-4 shadow-2xl relative">
            <button
              onClick={() => setScreenshotModalUrl(null)}
              className="absolute top-3 right-3 bg-surface-variant text-on-surface hover:bg-rose-500 hover:text-white rounded-full p-1 transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="text-sm font-bold font-display text-on-surface mb-3 px-2">Payment Receipt Screenshot</h3>
            <div className="max-h-[75vh] overflow-y-auto rounded-xl border border-outline-variant/30 flex items-center justify-center bg-black/40">
              <img src={screenshotModalUrl} alt="Payment Proof" className="max-w-full h-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Friend to Bill */}
      {isAddFriendModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant/60 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display text-on-surface">Add Friend to Bill</h2>
              <button onClick={() => setIsAddFriendModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddFriendToBill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Select Friend *
                </label>
                <select
                  required
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Friend --</option>
                  {allFriends
                    .filter((f) => !bill.participants.some((p) => p.friendId === f.id))
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} (@{f.nickname})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Share Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 250"
                  value={friendShareAmount}
                  onChange={(e) => setFriendShareAmount(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsAddFriendModalOpen(false)}
                  className="px-4 py-2 bg-surface-variant text-on-surface text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md"
                >
                  Add Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Bill with Reason */}
      {isCancelModalOpen && bill && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant/60 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display text-rose-400 flex items-center gap-2">
                <span className="material-symbols-outlined">cancel</span>
                Cancel Bill: {bill.title}
              </h2>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <p className="text-xs text-on-surface-variant">
                Cancelling this bill will remove its amount from all total receivable, due, and net calculations on the dashboard, and move it to the <strong>Cancelled Bills</strong> section.
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
                  onClick={() => setIsCancelModalOpen(false)}
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
