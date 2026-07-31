"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Friend = {
  id: string;
  name: string;
  nickname: string;
  phone: string | null;
  upiId: string | null;
  avatar: string | null;
  createdAt: string;
};

export default function FriendsMasterPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchFriends = (query = searchTerm) => {
    setLoading(true);
    fetch(`/api/splittzy/friends?search=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFriends(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFriends(searchTerm);
  }, [searchTerm]);

  const openAddModal = () => {
    setEditingFriend(null);
    setName('');
    setNickname('');
    setPhone('');
    setUpiId('');
    setAvatar('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (friend: Friend) => {
    setEditingFriend(friend);
    setName(friend.name);
    setNickname(friend.nickname);
    setPhone(friend.phone || '');
    setUpiId(friend.upiId || '');
    setAvatar(friend.avatar || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nickname.trim()) {
      setErrorMsg('Name and Nickname are required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const url = editingFriend ? `/api/splittzy/friends/${editingFriend.id}` : '/api/splittzy/friends';
      const method = editingFriend ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nickname: nickname.trim(),
          phone: phone.trim() || null,
          upiId: upiId.trim() || null,
          avatar: avatar.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save friend');
      }

      setIsModalOpen(false);
      fetchFriends(searchTerm);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setErrorMsg(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, friendName: string) => {
    if (!confirm(`Are you sure you want to delete ${friendName}?`)) return;

    try {
      const res = await fetch(`/api/splittzy/friends/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFriends(searchTerm);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/splittzy" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <h1 className="text-3xl font-bold font-display tracking-tight text-on-surface">Friends Master</h1>
          </div>
          <p className="text-sm text-on-surface-variant font-body">
            Manage your group of friends, UPI IDs, and contact info for splitting bills.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all self-start md:self-auto"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          Add New Friend
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input
          type="text"
          placeholder="Search friends by name, nickname, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-surface-container/60 border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-emerald-500 transition-colors shadow-sm"
        />
      </div>

      {/* Friends Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : friends.length === 0 ? (
        <div className="bg-surface-container/40 border border-outline-variant/50 backdrop-blur-xl p-12 text-center rounded-2xl text-outline font-body">
          <span className="material-symbols-outlined text-4xl mb-2 text-outline-variant">group_off</span>
          <p className="text-base font-semibold text-on-surface mb-1">No friends found</p>
          <p className="text-xs text-on-surface-variant mb-4">Click &quot;Add New Friend&quot; to add participants.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {friends.map((friend) => {
            const isSelf = friend.nickname === 'Myself';

            return (
              <div
                key={friend.id}
                className={`bg-surface-container/50 border rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-200 shadow-sm ${
                  isSelf ? 'border-blue-500/30 bg-blue-950/10' : 'border-outline-variant/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg overflow-hidden shrink-0">
                    {friend.avatar ? (
                      <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                    ) : (
                      friend.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-display font-semibold text-base text-on-surface truncate">{friend.name}</h3>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface-variant text-emerald-400 font-semibold">
                        @{friend.nickname}
                      </span>
                      {isSelf && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Me (Default)
                        </span>
                      )}
                    </div>
                    {friend.phone && (
                      <p className="text-xs font-mono text-on-surface-variant flex items-center gap-1.5 truncate">
                        <span className="material-symbols-outlined text-[14px] text-outline">call</span>
                        {friend.phone}
                      </p>
                    )}
                    {friend.upiId && (
                      <p className="text-xs font-mono text-emerald-400/90 flex items-center gap-1.5 truncate mt-1">
                        <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                        {friend.upiId}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-outline-variant/30">
                  <button
                    onClick={() => openEditModal(friend)}
                    className="p-2 hover:bg-surface-variant text-on-surface-variant hover:text-emerald-400 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Edit Friend"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Edit
                  </button>
                  {isSelf ? (
                    <span
                      className="p-2 text-outline/50 cursor-not-allowed flex items-center gap-1 text-xs"
                      title="Myself card cannot be deleted"
                    >
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(friend.id, friend.name)}
                      className="p-2 hover:bg-rose-500/10 text-outline hover:text-rose-400 rounded-lg transition-colors"
                      title="Delete Friend"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Friend Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant/60 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-display text-on-surface">
                {editingFriend ? 'Edit Friend' : 'Add New Friend'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Nickname *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  UPI ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. rahul@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Profile Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-surface-variant hover:bg-surface-container-high text-on-surface text-sm font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2"
                >
                  {saving ? 'Saving...' : editingFriend ? 'Update Friend' : 'Save Friend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
