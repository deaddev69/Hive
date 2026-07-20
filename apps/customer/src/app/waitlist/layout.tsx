import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the Waitlist | Hive by TailorBee",
  description: "Experience premium hyper-local tailoring with doorstep delivery. Join our waitlist today.",
};

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
