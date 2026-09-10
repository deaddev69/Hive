import type { Metadata } from "next";

export const metadata: Metadata = {
  // The root layout appends " | Hive"; carrying one here doubled it.
  title: "Join the Waitlist",
  description: "Experience premium hyper-local tailoring with doorstep delivery. Join our waitlist today.",
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
