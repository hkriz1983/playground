"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Friend = {
  id: string;
  name: string;
  nickname: string;
  phone: string | null;
  avatar: string | null;
};

export default function AddBillPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Step 2: Participants
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  // Step 3: Amount & Split Mode
  const [totalAmount, setTotalAmount] = useState('');
  const [splitMode, setSplitMode] = useState<'AUTO' | 'CUSTOM_PERCENTAGE' | 'CUSTOM_EXACT'>('AUTO');
  const [percentageMap, setPercentageMap] = useState<{ [friendId: string]: string }>({});
  const [exactAmountMap, setExactAmountMap] = useState<{ [friendId: string]: string }>({});

  // Step 4 Output
  const [createdShareCode, setCreatedShareCode] = useState<string | null>(null);
  const [createdBillId, setCreatedBillId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/splittzy/friends')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFriendsList(data);
          const selfFriend = data.find((f: Friend) => f.nickname === 'Myself');
          if (selfFriend) {
            setSelectedFriendIds([selfFriend.id]);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingFriends(false));
  }, []);

  // Photo Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        setPhotos((prev) => [...prev, data.url]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleFriend = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((fId) => fId !== id) : [...prev, id]
    );
  };

  // Validation per step
  const validateStep1 = () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a Bill Name.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const validateStep2 = () => {
    if (selectedFriendIds.length === 0) {
      setErrorMsg('Please select at least one friend.');
      return false;
    }
    setErrorMsg('');
    return true;
  };

  const validateStep3 = () => {
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) {
      setErrorMsg('Please enter a valid Total Amount greater than 0.');
      return false;
    }

    if (splitMode === 'CUSTOM_PERCENTAGE') {
      let sumPct = 0;
      for (const fId of selectedFriendIds) {
        sumPct += parseFloat(percentageMap[fId] || '0');
      }
      if (Math.abs(sumPct - 100) > 0.1) {
        setErrorMsg(`Percentages must total 100%. Current sum: ${sumPct.toFixed(1)}%`);
        return false;
      }
    } else if (splitMode === 'CUSTOM_EXACT') {
      let sumExact = 0;
      for (const fId of selectedFriendIds) {
        sumExact += parseFloat(exactAmountMap[fId] || '0');
      }
      if (Math.abs(sumExact - total) > 0.1) {
        setErrorMsg(`Exact amounts must sum up to Total Amount (₹${total}). Current sum: ₹${sumExact.toFixed(2)}`);
        return false;
      }
    }

    setErrorMsg('');
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');

    const participants = selectedFriendIds.map((fId) => ({
      friendId: fId,
      percentage: percentageMap[fId] ? parseFloat(percentageMap[fId]) : 0,
      exactAmount: exactAmountMap[fId] ? parseFloat(exactAmountMap[fId]) : 0,
    }));

    try {
      const res = await fetch('/api/splittzy/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          date,
          totalAmount: parseFloat(totalAmount),
          splitMode,
          billPhotos: photos,
          participants,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create bill');
      }

      const newBill = await res.json();
      setCreatedShareCode(newBill.shareCode);
      setCreatedBillId(newBill.id);
      setStep(4);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPublicUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/splittzy/p/${createdShareCode}`;
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(getPublicUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link href="/splittzy" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-on-surface">+ Add New Bill</h1>
          <p className="text-xs text-on-surface-variant">Create a bill and share split details with friends.</p>
        </div>
      </div>

      {/* Wizard Progress Indicator */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-container/60 border border-outline-variant/40 rounded-2xl">
        {[
          { num: 1, label: 'Bill Details' },
          { num: 2, label: 'Participants' },
          { num: 3, label: 'Split Mode' },
          { num: 4, label: 'Share Link' },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                step === s.num
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : step > s.num
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-surface-variant text-outline'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                step === s.num ? 'text-emerald-400 font-bold' : step > s.num ? 'text-on-surface' : 'text-outline'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: BILL DETAILS */}
      {step === 1 && (
        <div className="bg-surface-container/50 border border-outline-variant/50 rounded-2xl p-6 backdrop-blur-xl space-y-5">
          <h2 className="text-lg font-bold font-display text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500">receipt</span>
            Step 1: Enter Bill Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              Bill Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Goa Trip Dinner, Cafe Coffee Day, Apartment Wifi"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              Bill Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Photo / Receipt Upload */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Bill Photos / Receipts (Optional)
            </label>
            
            <div className="flex flex-wrap items-center gap-3">
              {photos.map((url, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-outline-variant/50 group">
                  <img src={url} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}

              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-outline-variant/60 hover:border-emerald-500/60 bg-surface-container-high/40 flex flex-col items-center justify-center text-outline hover:text-emerald-400 cursor-pointer transition-all">
                {uploadingPhoto ? (
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-2xl">add_a_photo</span>
                    <span className="text-[10px] font-semibold mt-1">Upload</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-outline-variant/30">
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              Next: Select Participants
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PARTICIPANTS */}
      {step === 2 && (
        <div className="bg-surface-container/50 border border-outline-variant/50 rounded-2xl p-6 backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold font-display text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">group</span>
              Step 2: Select Participants ({selectedFriendIds.length} selected)
            </h2>
            <Link
              href="/splittzy/friends"
              target="_blank"
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              + Quick Add Friend
            </Link>
          </div>

          {loadingFriends ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : friendsList.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-high/40 rounded-xl text-outline text-sm">
              No friends created yet.{' '}
              <Link href="/splittzy/friends" className="text-emerald-400 underline font-semibold">
                Click here to add friends
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
              {friendsList.map((friend) => {
                const isSelected = selectedFriendIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleFriend(friend.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/60 text-on-surface shadow-sm'
                        : 'bg-surface-container-high/40 border-outline-variant/40 hover:border-outline-variant/80 text-on-surface-variant'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                      ) : (
                        friend.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-semibold text-sm truncate">{friend.name}</p>
                      <p className="text-[11px] font-mono text-outline">@{friend.nickname}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-outline-variant/60'
                      }`}
                    >
                      {isSelected && <span className="material-symbols-outlined text-xs font-bold">check</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-surface-variant hover:bg-surface-container-high text-on-surface text-sm font-semibold rounded-xl transition-all"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              Next: Amount & Split Mode
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AMOUNT & SPLIT MODE */}
      {step === 3 && (
        <div className="bg-surface-container/50 border border-outline-variant/50 rounded-2xl p-6 backdrop-blur-xl space-y-6">
          <h2 className="text-lg font-bold font-display text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500">calculate</span>
            Step 3: Total Amount & Split Mode
          </h2>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
              Total Bill Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-lg">₹</span>
              <input
                type="number"
                step="any"
                placeholder="1000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl pl-9 pr-4 py-3 text-lg font-bold text-on-surface focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Split Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Select Split Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { mode: 'AUTO', label: 'Auto Split (Equal)', icon: 'equalizer' },
                { mode: 'CUSTOM_PERCENTAGE', label: 'Custom %', icon: 'percent' },
                { mode: 'CUSTOM_EXACT', label: 'Custom Exact ₹', icon: 'pin' },
              ].map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => setSplitMode(m.mode as 'AUTO' | 'CUSTOM_PERCENTAGE' | 'CUSTOM_EXACT')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    splitMode === m.mode
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm'
                      : 'bg-surface-container-high/40 border-outline-variant/40 hover:border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calculation Breakdown Table */}
          {totalAmount && parseFloat(totalAmount) > 0 && (
            <div className="bg-surface-container-low/80 border border-outline-variant/40 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase text-outline tracking-wider">Calculated Shares</h3>
              <div className="space-y-2">
                {selectedFriendIds.map((fId) => {
                  const friend = friendsList.find((f) => f.id === fId);
                  const total = parseFloat(totalAmount) || 0;
                  let calculated = 0;

                  if (splitMode === 'AUTO') {
                    calculated = Number((total / selectedFriendIds.length).toFixed(2));
                  } else if (splitMode === 'CUSTOM_PERCENTAGE') {
                    const pct = parseFloat(percentageMap[fId] || '0');
                    calculated = Number(((total * pct) / 100).toFixed(2));
                  } else if (splitMode === 'CUSTOM_EXACT') {
                    calculated = parseFloat(exactAmountMap[fId] || '0');
                  }

                  return (
                    <div key={fId} className="flex items-center justify-between text-sm py-1 border-b border-outline-variant/20 last:border-0">
                      <span className="font-semibold text-on-surface">{friend?.name || 'Friend'}</span>

                      <div className="flex items-center gap-3">
                        {splitMode === 'CUSTOM_PERCENTAGE' && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="0"
                              value={percentageMap[fId] || ''}
                              onChange={(e) => setPercentageMap({ ...percentageMap, [fId]: e.target.value })}
                              className="w-16 bg-surface-container-high border border-outline-variant/50 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:border-emerald-500 font-mono"
                            />
                            <span className="text-xs text-outline font-bold">%</span>
                          </div>
                        )}

                        {splitMode === 'CUSTOM_EXACT' && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-outline font-bold">₹</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={exactAmountMap[fId] || ''}
                              onChange={(e) => setExactAmountMap({ ...exactAmountMap, [fId]: e.target.value })}
                              className="w-20 bg-surface-container-high border border-outline-variant/50 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>
                        )}

                        <span className="font-display font-bold text-emerald-400 w-20 text-right">
                          ₹{isNaN(calculated) ? 0 : calculated}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-surface-variant hover:bg-surface-container-high text-on-surface text-sm font-semibold rounded-xl transition-all"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? 'Creating Bill...' : 'Create Bill & Generate Link'}
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CREATION OUTPUT */}
      {step === 4 && (
        <div className="bg-surface-container/50 border border-emerald-500/50 rounded-2xl p-8 backdrop-blur-xl text-center space-y-6 animate-in zoom-in-95 duration-200 shadow-xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <span className="material-symbols-outlined text-4xl">task_alt</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold font-display text-on-surface">Bill Created Successfully!</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Your bill &quot;<span className="text-emerald-400 font-semibold">{title}</span>&quot; has been created with a total of ₹{totalAmount}.
            </p>
          </div>

          {/* Unique Shareable Link Box */}
          <div className="bg-surface-container-low/80 border border-outline-variant/50 rounded-xl p-4 text-left space-y-2">
            <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Unique Public Shareable Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getPublicUrl()}
                className="w-full bg-surface-container-high border border-outline-variant/40 rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:outline-none"
              />
              <button
                onClick={copyPublicLink}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shrink-0 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">{copied ? 'done' : 'content_copy'}</span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => router.push(`/splittzy/bills/${createdBillId}`)}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all shadow-md"
            >
              Go to Owner Bill Details
            </button>
            <button
              onClick={() => router.push('/splittzy')}
              className="w-full sm:w-auto px-6 py-2.5 bg-surface-variant hover:bg-surface-container-high text-on-surface text-sm font-semibold rounded-xl transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
