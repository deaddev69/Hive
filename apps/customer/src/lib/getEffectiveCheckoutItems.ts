import { CartItem } from "@/store/cart-store";

export function getEffectiveCheckoutItems(
  cartItems: CartItem[],
  checkoutItems: CartItem[]
): CartItem[] {
  return checkoutItems.length > 0 ? checkoutItems : cartItems;
}
