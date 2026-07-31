'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface flex items-center justify-center min-h-screen p-4 font-body">
        <div className="bg-surface-container border border-outline-variant/60 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <span className="material-symbols-outlined text-5xl text-rose-500 mb-3">error</span>
          <h1 className="text-2xl font-bold font-display text-on-surface mb-2">Application Error</h1>
          <p className="text-xs text-on-surface-variant mb-6">
            {error?.message || 'A global error occurred.'}
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all"
          >
            Refresh Page
          </button>
        </div>
      </body>
    </html>
  );
}
