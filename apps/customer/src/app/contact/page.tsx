import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#FDFBF7] pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-hive-dark/60 hover:text-hive-gold mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Shop
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-serif font-black text-hive-dark mb-4 tracking-tight">Contact Us</h1>
        <p className="text-hive-dark/70 mb-10 leading-relaxed text-sm md:text-base">
          We're here to help! If you have any questions about your order, returns, or our platform, please reach out using the contact information below.
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-hive-border/20 p-6 md:p-8 space-y-8">
          
          <div className="space-y-2">
            <h2 className="text-sm font-bold tracking-wider uppercase text-hive-dark/50">Email Support</h2>
            <p className="text-hive-dark text-base">
              For all inquiries and refund requests, email us at:<br />
              <a href="mailto:support@hivenow.in" className="text-hive-gold font-medium hover:underline">
                support@hivenow.in
              </a>
            </p>
            <p className="text-xs text-hive-dark/50 mt-1">We typically respond within 24-48 business hours.</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold tracking-wider uppercase text-hive-dark/50">Phone Support</h2>
            <p className="text-hive-dark text-base">
              +91 98765 43210
            </p>
            <p className="text-xs text-hive-dark/50 mt-1">Available Mon-Fri, 10:00 AM - 6:00 PM (IST)</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold tracking-wider uppercase text-hive-dark/50">Registered Address</h2>
            <address className="not-italic text-hive-dark text-base leading-relaxed">
              <strong>BEELYN LLP</strong><br />
              55/4379, Door No. 3623, Valanjambalam Junction,<br />
              Kochi M.G. Road, Ernakulam Town South Police Station,<br />
              Ernakulam, Kerala – 682016, India
            </address>
          </div>

        </div>
      </div>
    </main>
  );
}
