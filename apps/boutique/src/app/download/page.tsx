import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Hive Partners App",
  description:
    "Download the Hive Partners Android app for boutique owners and sellers",
};

export default function DownloadPage() {
  const apkUrl =
    "https://github.com/deaddev69/Hive/releases/latest/download/hive-partners.apk";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white p-6 font-sans">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="mx-auto w-28 h-28 rounded-3xl bg-[#FAB407] flex items-center justify-center shadow-xl shadow-amber-200/50">
          <img
            src="/logo.png"
            alt="Hive Partners"
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Hive Partners
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Manage orders, products, and your boutique — all from one app.
            Built exclusively for Hive boutique partners.
          </p>
        </div>

        {/* Download Button */}
        <a
          href={apkUrl}
          className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold text-base shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download for Android
        </a>

        {/* Install Instructions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-left space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            How to install
          </p>
          <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
            <li>Tap &quot;Download for Android&quot; above</li>
            <li>Open the downloaded .apk file</li>
            <li>
              If prompted, tap &quot;Settings&quot; → enable &quot;Install from
              this source&quot;
            </li>
            <li>Tap &quot;Install&quot; and open the app</li>
          </ol>
        </div>

        {/* Version info */}
        <p className="text-xs text-slate-400">
          Android only &middot; v1.1 &middot; 6.8 MB
        </p>
      </div>
    </div>
  );
}
