import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-surface-container border border-outline-variant/60 p-8 rounded-2xl max-w-md w-full backdrop-blur-xl shadow-xl">
        <span className="material-symbols-outlined text-5xl text-amber-500 mb-3">find_in_page</span>
        <h2 className="text-2xl font-bold font-display text-on-surface mb-2">Page Not Found</h2>
        <p className="text-xs text-on-surface-variant mb-6 font-body">
          The requested page or link could not be found.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-md"
        >
          Return to Launchpad
        </Link>
      </div>
    </div>
  );
}
