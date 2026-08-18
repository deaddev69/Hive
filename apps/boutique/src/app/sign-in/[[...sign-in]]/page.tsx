import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Sparkles, Info } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Informational Banner for First-Time Owners */}
      <div className="max-w-md w-full mb-6 bg-amber-50/90 border border-amber-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
            <Info className="h-4 w-4" />
          </div>
          <div className="text-xs text-amber-900 leading-relaxed">
            <span className="font-bold">First time logging in as a boutique owner?</span>
            <p className="mt-0.5 text-amber-800">
              If your boutique was registered by the Hive team, please{" "}
              <Link href="/sign-up" className="font-bold underline text-amber-950 hover:text-black">
                Sign Up here
              </Link>{" "}
              with your registered boutique email to create your password and activate your dashboard.
            </p>
          </div>
        </div>
      </div>

      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
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

