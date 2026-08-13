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
        <div className="mx-auto w-32 h-32 rounded-[28px] bg-[#F5B800] flex items-center justify-center shadow-xl shadow-amber-300/60 overflow-hidden">
          <img
            src="/logo.png"
            alt="Hive Partners"
            className="w-full h-full object-cover"
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
          className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 bg-[#F5B800] hover:bg-[#e0a900] text-white rounded-2xl font-semibold text-base shadow-lg shadow-amber-400/30 active:scale-[0.98] transition-all"
          style={{ color: "#1a1a1a" }}
        >
          {/* Android icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.523 15.341a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm-9.546 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zM6.35 5.648l-1.386-2.4a.375.375 0 0 1 .651-.375l1.404 2.432A8.955 8.955 0 0 1 12 4.5c1.19 0 2.324.23 3.364.648l1.404-2.432a.375.375 0 1 1 .651.375l-1.386 2.4A9 9 0 0 1 21 13.5H3a9 9 0 0 1 3.35-7.852z"/>
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
          Android only &middot; v1.2 &middot; Latest build
        </p>
      </div>
    </div>
  );
}
