import { redirect } from "next/navigation";

// No self-service sign-up: sellers are pre-approved by admin via Gmail allowlist.
// Redirect to sign-in page instead.
export default function SignUpPage() {
  redirect("/sign-in");
}
