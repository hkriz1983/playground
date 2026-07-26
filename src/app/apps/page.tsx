"use client";

import React, { useState, useEffect } from 'react';

type Module = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  appLink: string;
  github: string;
};

export default function AppMaster() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', description: '', icon: 'apps', color: 'primary', appLink: '', github: '' 
  });

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/apps');
      const data = await res.json();
      setModules(data);
    } catch (err) {
      console.error('Failed to fetch apps', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteApp = async (id: string) => {
    if (!confirm('Are you sure you want to delete this module?')) return;
    try {
      const res = await fetch(`/api/apps/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setModules(modules.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete app', err);
    }
  };

  const handleRegisterApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ name: '', description: '', icon: 'apps', color: 'primary', appLink: '', github: '' });
        fetchApps();
      }
    } catch (err) {
      console.error('Failed to create app', err);
    }
  };

  return (
    <div className="relative">
      {/* Background Aura Decoration */}
      <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-0 left-[280px] -z-10 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="flex flex-col gap-8 max-w-5xl">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="font-mono text-[12px] text-primary uppercase tracking-widest mb-1">Module Registry</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-on-surface">App Master</h2>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(192,193,255,0.4)] active:scale-95">
              <span className="material-symbols-outlined">add</span>
              <span>REGISTER NEW MODULE</span>
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4 mb-2">
            <h3 className="font-display text-xl font-semibold text-on-surface">
              Connected Modules <span className="text-on-surface-variant font-normal ml-2 opacity-50">({modules.length})</span>
            </h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-surface-variant rounded transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
              </button>
            </div>
          </div>

          {loading ? (
             <div className="flex justify-center items-center h-64">
               <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : modules.length === 0 ? (
            <div className="bg-surface-container/40 border border-outline-variant/50 backdrop-blur-xl p-12 text-center rounded-xl text-outline font-body">
              No apps registered. Click "Register New Module" to create one.
            </div>
          ) : modules.map((mod) => (
            <div key={mod.id} className="bg-surface-container/40 border border-outline-variant/50 backdrop-blur-xl p-4 rounded-xl flex items-center gap-6 group transition-all hover:-translate-y-0.5 hover:bg-surface-container/80 hover:border-primary/50 shadow-sm">
              <div className={`w-14 h-14 rounded-lg bg-surface-container-highest flex items-center justify-center text-${mod.color} border border-outline-variant/50 shadow-inner`}>
                <span className="material-symbols-outlined text-[32px]">{mod.icon}</span>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-display text-lg font-semibold text-on-surface">{mod.name}</h4>
                  <p className="text-on-surface-variant font-body text-xs">{mod.description}</p>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-on-surface-variant text-[10px] font-mono uppercase font-bold tracking-wider mb-1">App Link</span>
                  <a className="text-primary hover:underline truncate font-body text-sm" href={mod.appLink} target="_blank" rel="noreferrer">{mod.appLink || 'N/A'}</a>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-on-surface-variant text-[10px] font-mono uppercase font-bold tracking-wider mb-1">GitHub Repository</span>
                  <a className="text-on-surface hover:text-primary transition-colors flex items-center gap-1 font-body text-sm" href="#">
                    <span className="material-symbols-outlined text-[16px]">link</span>
                    <span>{mod.github || 'N/A'}</span>
                  </a>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/50 hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[20px]">edit</span>
                </button>
                <button onClick={() => deleteApp(mod.id)} className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant/50 hover:bg-error/20 text-on-surface-variant hover:text-error transition-colors">
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
                <a href={mod.appLink} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-90">
                  <span className="material-symbols-outlined">open_in_new</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Register App Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-high/30">
              <h3 className="font-display text-xl font-bold">Register New Module</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleRegisterApp} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-mono text-outline uppercase mb-2">Module Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="e.g. Cloud Deploy"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-mono text-outline uppercase mb-2">Description</label>
                  <input 
                    required
                    type="text" 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="e.g. Instant container orchestration"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-outline uppercase mb-2">Icon (Material)</label>
                  <input 
                    required
                    type="text" 
                    value={formData.icon}
                    onChange={e => setFormData({...formData, icon: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="e.g. apps"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-outline uppercase mb-2">Theme Color</label>
                  <select 
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                  >
                    <option value="primary">Primary (Blue)</option>
                    <option value="secondary">Secondary (Green)</option>
                    <option value="tertiary">Tertiary (Orange)</option>
                    <option value="error">Error (Red)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-mono text-outline uppercase mb-2">App Link URL</label>
                  <input 
                    type="url" 
                    value={formData.appLink}
                    onChange={e => setFormData({...formData, appLink: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="https://app.playground.io"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-mono text-outline uppercase mb-2">GitHub Repository</label>
                  <input 
                    type="text" 
                    value={formData.github}
                    onChange={e => setFormData({...formData, github: e.target.value})}
                    className="w-full bg-surface-dim border border-outline-variant rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                    placeholder="playground/repo-name"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-variant transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 rounded-lg text-sm font-medium bg-primary text-on-primary hover:bg-primary-fixed transition-colors shadow-lg shadow-primary/20">
                  Register App
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
