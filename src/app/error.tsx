'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js App Error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-surface-container border border-outline-variant/60 p-8 rounded-2xl max-w-md w-full backdrop-blur-xl shadow-xl">
        <span className="material-symbols-outlined text-4xl text-rose-500 mb-2">warning</span>
        <h2 className="text-xl font-bold font-display text-on-surface mb-2">Something went wrong!</h2>
        <p className="text-xs text-on-surface-variant mb-6 font-body">
          {error?.message || 'An unexpected error occurred while rendering this page.'}
        </p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-md"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
