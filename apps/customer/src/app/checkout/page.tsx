import { redirect } from "next/navigation";

export default function CheckoutPageRedirect() {
  redirect("/checkout/address");
}
