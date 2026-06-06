"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useUser, useAuth } from "@clerk/nextjs";

/**
 * /debug — Temporary auth diagnostics page.
 * Shows what Clerk and Convex each believe about the current user.
 * Remove or protect this page before production.
 */
export default function DebugPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const whoAmI = useQuery(api.debug.whoAmI);
  const { getToken } = useAuth();
  const [tokenResult, setTokenResult] = useState<string>("Click 'Test Clerk Token' to fetch");

  const testToken = async () => {
    try {
      setTokenResult("Fetching...");
      const token = await getToken({ template: "convex" });
      if (!token) {
        setTokenResult("Returned null (no token found or template invalid)");
      } else {
        // Decode token payload (basic base64 decode)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1] || ""));
          setTokenResult(`Token exists!\n\nPayload:\n${JSON.stringify(payload, null, 2)}`);
        } else {
          setTokenResult(`Token exists but invalid format: ${token.substring(0, 20)}...`);
        }
      }
    } catch (err: any) {
      setTokenResult(`Error: ${err.message || err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-6 font-mono text-sm">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Auth Diagnostics</h1>

        {/* Clerk status */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
            Clerk (Client)
          </h2>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 pr-4 text-gray-500 w-40">isLoaded</td>
                <td className={`py-2 font-bold ${isLoaded ? "text-green-600" : "text-amber-500"}`}>
                  {String(isLoaded)}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-500">isSignedIn</td>
                <td className={`py-2 font-bold ${isSignedIn ? "text-green-600" : "text-red-500"}`}>
                  {String(isSignedIn)}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-500">userId</td>
                <td className="py-2 text-gray-800 break-all">{user?.id ?? "—"}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-500">email</td>
                <td className="py-2 text-gray-800">{user?.primaryEmailAddress?.emailAddress ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Token Inspection */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
            Clerk Token (template: "convex")
          </h2>
          <div className="space-y-4">
            <button
              onClick={testToken}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition"
            >
              Test Clerk Token
            </button>
            <pre className="bg-gray-100 p-4 rounded-xl text-xs overflow-auto max-h-60 break-all whitespace-pre-wrap">
              {tokenResult}
            </pre>
          </div>
        </section>

        {/* Convex status */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
            Convex (Server — ctx.auth.getUserIdentity)
          </h2>

          {whoAmI === undefined ? (
            <p className="text-amber-500">Loading…</p>
          ) : whoAmI.authenticated ? (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-2 pr-4 text-gray-500 w-40">authenticated</td>
                  <td className="py-2 font-bold text-green-600">true ✅</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-500">subject</td>
                  <td className="py-2 text-gray-800 break-all">{whoAmI.identity?.subject}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-500">tokenIdentifier</td>
                  <td className="py-2 text-gray-800 break-all">{whoAmI.identity?.tokenIdentifier}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-500">issuer</td>
                  <td className="py-2 text-gray-800 break-all">{whoAmI.identity?.issuer}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-gray-500">email</td>
                  <td className="py-2 text-gray-800">{whoAmI.identity?.email ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="space-y-3">
              <p className="text-red-600 font-bold">authenticated: false ❌</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 space-y-2">
                <p className="font-bold">ctx.auth.getUserIdentity() returned null.</p>
                <p>This means Convex is not receiving a valid Clerk JWT. Check:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>
                    <code>convex/auth.config.ts</code> must have the correct{" "}
                    <code>domain</code> (Clerk issuer URL).
                  </li>
                  <li>
                    The <code>CLERK_JWT_ISSUER_DOMAIN</code> env var must be set in the{" "}
                    <a
                      href="https://dashboard.convex.dev"
                      className="underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Convex Dashboard
                    </a>{" "}
                    → Settings → Environment Variables.
                  </li>
                  <li>
                    A <strong>Convex JWT Template</strong> must exist in Clerk Dashboard → JWT
                    Templates. The template name must be <code>convex</code>.
                  </li>
                  <li>
                    <code>ConvexProviderWithClerk</code> must wrap the app (not plain{" "}
                    <code>ConvexProvider</code>).
                  </li>
                </ol>
              </div>
            </div>
          )}
        </section>

        {/* Action links */}
        <section className="flex gap-3 text-xs">
          <a href="/sign-in" className="px-4 py-2 bg-gray-900 text-white rounded-lg">
            Go to Sign In
          </a>
          <a href="/sign-out" className="px-4 py-2 border border-gray-300 rounded-lg">
            Sign Out
          </a>
          <a href="/" className="px-4 py-2 border border-gray-300 rounded-lg">
            Home
          </a>
        </section>
      </div>
    </div>
  );
}
