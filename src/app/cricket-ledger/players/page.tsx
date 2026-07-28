"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

type LedgerPlayer = { id: string; name: string; role: string; phone: string | null; };

export default function PlayersPage() {
  const [players, setPlayers] = useState<LedgerPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modal, setModal] = useState<{ isOpen: boolean, player?: LedgerPlayer }>({ isOpen: false });
  const [name, setName] = useState('');
  const [role, setRole] = useState('Player');
  const [phone, setPhone] = useState('');

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ledger/players');
      if (res.ok) setPlayers(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchPlayers(); }, []);

  const handleSave = async () => {
    const payload = { name, role, phone };
    if (modal.player) {
      await fetch('/api/ledger/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: modal.player.id, ...payload })
      });
    } else {
      await fetch('/api/ledger/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    setModal({ isOpen: false });
    fetchPlayers();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this player?')) {
      await fetch(`/api/ledger/players?id=${id}`, { method: 'DELETE' });
      fetchPlayers();
    }
  };

  const openModal = (p?: LedgerPlayer) => {
    setModal({ isOpen: true, player: p });
    if (p) { setName(p.name); setRole(p.role); setPhone(p.phone || ''); }
    else { setName(''); setRole('Player'); setPhone(''); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 p-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/cricket-ledger" className="p-2 bg-surface-container rounded-full hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-display text-3xl font-bold">Player Master</h1>
        </div>
        <button onClick={() => openModal()} className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90">
          <span className="material-symbols-outlined text-[20px]">person_add</span> Add Player
        </button>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {players.map(p => (
            <div key={p.id} className="bg-surface-container border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg">{p.name}</h3>
                <div className="flex items-center gap-2 text-sm text-on-surface-variant mt-1">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs font-mono">{p.role}</span>
                  {p.phone && <span className="font-mono">{p.phone}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(p)} className="p-2 text-outline-variant hover:text-primary transition-colors"><span className="material-symbols-outlined text-sm">edit</span></button>
                <button onClick={() => handleDelete(p.id)} className="p-2 text-outline-variant hover:text-error transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
              </div>
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-full p-8 text-center border-2 border-dashed border-outline-variant/50 rounded-2xl text-outline font-body">No players added yet.</div>
          )}
        </div>
      )}

      {modal.isOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-3xl p-6 w-full max-w-sm border border-outline-variant/30 shadow-2xl">
            <h3 className="font-display text-xl font-bold mb-4">{modal.player ? 'Edit Player' : 'New Player'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-mono text-outline mb-1 block">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface" />
              </div>
              <div>
                <label className="text-xs font-mono text-outline mb-1 block">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface">
                  <option>Player</option><option>Captain</option><option>Guest</option><option>Coach</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-outline mb-1 block">Phone (optional)</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-surface p-3 rounded-xl border border-outline-variant/50 text-on-surface font-mono" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModal({ isOpen: false })} className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface font-medium hover:bg-surface-variant/80 transition-colors">Cancel</button>
                <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-primary text-on-primary font-bold hover:bg-primary/90 transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
