import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Sparkles, Store } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Header Banner */}
      <div className="max-w-md w-full mb-6 bg-slate-900 text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-amber-400 text-slate-950 rounded-xl">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Hive Boutique Partner Portal</h1>
            <p className="text-[11px] text-slate-300">Create your account to access your store</p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
          Sign up with your registered boutique email address. Your store will automatically link upon registration.
        </p>
      </div>

      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/boutique"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md shadow-xl rounded-2xl",
            card: "rounded-2xl border border-slate-200/80 shadow-none",
            primaryButton: "bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl",
          },
        }}
      />
    </div>
  );
}

