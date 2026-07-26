"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Module = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  appLink: string;
};

export default function Launchpad() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/apps/mine')
      .then(res => res.json())
      .then(data => setModules(Array.isArray(data) ? data : []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative">
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight text-on-surface mb-2">Welcome back</h2>
            <p className="text-on-surface-variant font-body text-sm">Select an application to launch from your designated workspace.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-variant rounded-lg border border-outline-variant/30 text-sm font-medium transition-colors">
              <span className="material-symbols-outlined text-[20px]">tune</span>
              Customize
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4 mb-2">
            <h3 className="font-display text-xl font-semibold text-on-surface">Your Applications</h3>
          </div>
          
          {loading ? (
             <div className="flex justify-center items-center h-64">
               <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : modules.length === 0 ? (
            <div className="bg-surface-container/40 border border-outline-variant/50 backdrop-blur-xl p-12 text-center rounded-xl text-outline font-body">
              You do not have access to any applications yet. Contact your administrator.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {modules.map((mod) => (
                <Link key={mod.id} href={mod.appLink} className="block group">
                  <div className="h-full bg-surface-container/40 backdrop-blur-xl border border-outline-variant/50 p-6 rounded-2xl flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:bg-surface-container/80 relative overflow-hidden">
                    
                    {/* Hover Glow Effect */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-${mod.color}/10 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>

                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl bg-${mod.color}/10 text-${mod.color} flex items-center justify-center border border-${mod.color}/20 group-hover:scale-110 transition-transform duration-300`}>
                        <span className="material-symbols-outlined text-2xl">{mod.icon}</span>
                      </div>
                      <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">arrow_outward</span>
                    </div>

                    <div className="mt-2">
                      <h4 className="font-display text-lg font-semibold text-on-surface mb-1 group-hover:text-primary transition-colors">{mod.name}</h4>
                      <p className="text-sm font-body text-on-surface-variant line-clamp-2">{mod.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
