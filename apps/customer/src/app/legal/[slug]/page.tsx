"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import ReactMarkdown from "react-markdown";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalDocumentPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const legalDoc = useQuery(api.legal.getLatestBySlug, { slug });

  if (legalDoc === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-hive-amber" />
        <span className="text-sm text-hive-text-muted">Loading document...</span>
      </div>
    );
  }

  if (legalDoc === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <h1 className="text-2xl font-serif font-black text-hive-dark">Document Not Found</h1>
        <p className="text-sm text-hive-text-muted">The legal document "{slug}" could not be found.</p>
        <Link href="/" className="text-hive-amber font-semibold hover:underline mt-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-hive-border/30 p-8 sm:p-12">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-hive-text-muted hover:text-hive-dark transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>
        <div className="prose prose-hive max-w-none">
          <ReactMarkdown>{legalDoc.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
