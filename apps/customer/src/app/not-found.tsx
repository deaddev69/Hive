import Link from "next/link";
import { Compass, Home, ShoppingBag } from "lucide-react";

export const metadata = {
  // The root layout appends " | Hive" via its title template, so this must not repeat it.
  title: "Page not found",
  robots: { index: false, follow: true },
};

/**
 * Replaces Next's built-in 404, which rendered unstyled black-on-white text with no branding and
 * no way onward. Every stale link, mistyped URL and retired collection landed there, so it was
 * one of the more frequently seen pages on the site and the only one that looked like nothing had
 * been built yet.
 */
export default function NotFound() {
  return (
    <main className="min-h-[70vh] w-full flex flex-col items-center justify-center px-6 py-20 text-center">
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: "#1A120012", border: "1.5px dashed #1A120040" }}
      >
        <Compass className="w-8 h-8 text-hive-dark" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-serif font-extrabold text-hive-dark mb-2">
        We can&apos;t find that page
      </h1>
      <p className="text-sm text-hive-text-muted max-w-sm leading-relaxed mb-8">
        The link may be out of date, or the piece may have sold out and been taken down. Everything
        still in stock is a tap away.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-extrabold uppercase tracking-widest text-white hover:opacity-90 transition-all duration-200 shadow-md"
          style={{ background: "#1A1200", boxShadow: "0 4px 18px #1A120030" }}
        >
          <ShoppingBag className="w-3.5 h-3.5" strokeWidth={2.5} />
          Shop All
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border border-hive-border/60 text-hive-dark hover:border-hive-dark/30 hover:bg-hive-dark/5 transition-all duration-200"
        >
          <Home className="w-3.5 h-3.5 text-hive-dark" strokeWidth={2} />
          Back to Home
        </Link>
      </div>
    </main>
  );
}
