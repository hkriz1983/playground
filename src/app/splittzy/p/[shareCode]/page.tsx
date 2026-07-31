"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Participant = {
  id: string;
  friendId: string;
  shareAmount: number;
  status: string;
  paymentScreenshot: string | null;
  friend: {
    name: string;
    nickname: string;
    avatar: string | null;
  };
};

type PublicBill = {
  id: string;
  title: string;
  date: string;
  totalAmount: number;
  splitMode: string;
  billPhotos: string | null;
  shareCode: string;
  isCancelled?: boolean;
  cancellationReason?: string | null;
  participants: Participant[];
};

export default function PublicParticipantPage() {
  const params = useParams();
  const rawCode = params?.shareCode;
  const shareCode = Array.isArray(rawCode) ? rawCode[0] : rawCode;

  const [billData, setBillData] = useState<PublicBill | null>(null);
  const [ownerUpiId, setOwnerUpiId] = useState<string>('splittzy.owner@okicici');
  const [ownerName, setOwnerName] = useState<string>('Bill Owner');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Upload Payment Screenshot Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    if (!shareCode) return;
    setLoading(true);
    fetch(`/api/splittzy/public/${shareCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.bill) {
          setBillData(data.bill);
          if (data.ownerUpiId) setOwnerUpiId(data.ownerUpiId);
          if (data.ownerName) setOwnerName(data.ownerName);
        } else {
          setErrorMsg(data.error || 'Bill not found');
        }
      })
      .catch(() => setErrorMsg('Failed to load bill link'))
      .finally(() => setLoading(false));
  }, [shareCode]);

  const fetchPublicBill = () => {
    if (!shareCode) return;
    fetch(`/api/splittzy/public/${shareCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.bill) {
          setBillData(data.bill);
          if (data.ownerUpiId) setOwnerUpiId(data.ownerUpiId);
          if (data.ownerName) setOwnerName(data.ownerName);
        }
      })
      .catch(() => {});
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(ownerUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setScreenshotUrl(data.url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId || !screenshotUrl) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/splittzy/public/${shareCode}/upload-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: selectedParticipantId,
          screenshotUrl,
        }),
      });

      if (res.ok) {
        setIsUploadModalOpen(false);
        setScreenshotUrl('');
        setSelectedParticipantId('');
        setSuccessMsg('Payment screenshot submitted! Status updated to Pending Verification.');
        setTimeout(() => setSuccessMsg(''), 5000);
        fetchPublicBill();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getPhotosArray = (): string[] => {
    if (!billData || !billData.billPhotos) return [];
    try {
      const parsed = JSON.parse(billData.billPhotos);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const photos = getPhotosArray();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (errorMsg || !billData) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-surface-container border border-outline-variant/50 p-8 rounded-2xl text-center max-w-md">
          <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">link_off</span>
          <h1 className="text-xl font-bold text-on-surface">Invalid Public Link</h1>
          <p className="text-sm text-on-surface-variant mt-1">{errorMsg || 'This bill link could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface p-4 md:p-8 font-body max-w-4xl mx-auto pb-16">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-on-surface">Splittzy</h1>
            <span className="text-xs text-outline">Public Participant View</span>
          </div>
        </div>

        {!billData.isCancelled && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">upload_file</span>
            Upload Payment Proof
          </button>
        )}
      </div>

      {billData.isCancelled && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-in fade-in shadow-md">
          <span className="material-symbols-outlined text-2xl shrink-0">cancel</span>
          <div>
            <p className="font-bold text-sm">This bill has been cancelled by the creator.</p>
            <p className="text-on-surface-variant font-normal mt-0.5">
              Reason: &quot;<span className="italic font-medium text-on-surface">{billData.cancellationReason || 'No reason specified'}</span>&quot;
            </p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Bill Overview Header */}
      <div className="bg-surface-container/60 border border-outline-variant/50 rounded-2xl p-6 backdrop-blur-xl mb-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-on-surface">{billData.title}</h2>
            <p className="text-xs font-mono text-outline mt-1">
              Date: {new Date(billData.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl text-right">
            <span className="text-[10px] font-semibold uppercase text-emerald-400 block">Total Bill Amount</span>
            <span className="text-2xl font-bold font-display text-emerald-400">₹{billData.totalAmount}</span>
          </div>
        </div>

        {/* UPI Payment Card */}
        <div className="bg-surface-container-low/90 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
              ₹
            </div>
            <div>
              <p className="text-xs text-outline uppercase font-semibold">Pay Owner via UPI</p>
              <p className="font-mono text-sm font-bold text-emerald-400">{ownerUpiId}</p>
              <p className="text-[11px] text-on-surface-variant">Owner: {ownerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyUpi}
              className="px-3.5 py-2 bg-surface-variant hover:bg-surface-container-high border border-outline-variant/50 text-xs font-bold text-on-surface rounded-xl transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">{copiedUpi ? 'check' : 'content_copy'}</span>
              {copiedUpi ? 'Copied!' : 'Copy UPI'}
            </button>

            <a
              href={`upi://pay?pa=${ownerUpiId}&pn=${encodeURIComponent(ownerName)}&am=${billData.totalAmount}&cu=INR&tn=${encodeURIComponent(billData.title)}`}
              onClick={() => {
                // Ensure mobile intent trigger
                window.location.href = `upi://pay?pa=${ownerUpiId}&pn=${encodeURIComponent(ownerName)}&am=${billData.totalAmount}&cu=INR&tn=${encodeURIComponent(billData.title)}`;
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              Pay via UPI App
            </a>
          </div>
        </div>
      </div>

      {/* Bill Photos Gallery */}
      {photos.length > 0 && (
        <div className="bg-surface-container/50 border border-outline-variant/50 rounded-2xl p-5 mb-6 backdrop-blur-xl space-y-3">
          <h3 className="text-sm font-bold font-display text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">receipt</span>
            Uploaded Receipt Photos ({photos.length})
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
            {photos.map((url, idx) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="w-36 h-36 rounded-xl overflow-hidden border border-outline-variant/40 shrink-0 hover:border-emerald-500 transition-all group">
                <img src={url} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Participant List & Calculated Shares */}
      <div className="bg-surface-container/50 border border-outline-variant/50 rounded-2xl p-5 backdrop-blur-xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold font-display text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-3">
          <span className="material-symbols-outlined text-emerald-400">group</span>
          Participant Breakdown & Payment Status
        </h3>

        <div className="space-y-3">
          {billData.participants.map((p) => (
            <div key={p.id} className="p-4 rounded-xl bg-surface-container-high/40 border border-outline-variant/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center overflow-hidden">
                  {p.friend.avatar ? (
                    <img src={p.friend.avatar} alt={p.friend.name} className="w-full h-full object-cover" />
                  ) : (
                    p.friend.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-on-surface">{p.friend.name}</p>
                  <p className="text-xs font-mono text-outline">@{p.friend.nickname}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] font-semibold uppercase text-outline block">Calculated Share</span>
                  <span className="font-display font-bold text-emerald-400 text-lg">₹{p.shareAmount}</span>
                </div>

                <div>
                  {p.status === 'PAID' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Paid
                    </span>
                  ) : p.status === 'PAYMENT_UPLOADED' ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Payment Uploaded
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedParticipantId(p.id);
                        setIsUploadModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all"
                    >
                      Pending (Upload Proof)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Payment Screenshot Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant/60 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-display text-on-surface">Upload Payment Proof</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Who are you? *
                </label>
                <select
                  required
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Your Name --</option>
                  {billData.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.friend.name} (Share: ₹{p.shareAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Payment Screenshot *
                </label>
                <label className="w-full h-32 border-2 border-dashed border-outline-variant/60 hover:border-emerald-500/60 rounded-xl bg-surface-container-high/40 flex flex-col items-center justify-center text-outline hover:text-emerald-400 cursor-pointer transition-all">
                  {uploadingFile ? (
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : screenshotUrl ? (
                    <div className="relative w-full h-full p-2">
                      <img src={screenshotUrl} alt="Uploaded Proof" className="w-full h-full object-contain rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                      <span className="text-xs font-semibold mt-1">Upload Payment Screenshot</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-surface-variant text-on-surface text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || !selectedParticipantId || !screenshotUrl}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md"
                >
                  {submittingPayment ? 'Submitting...' : 'Submit Screenshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
