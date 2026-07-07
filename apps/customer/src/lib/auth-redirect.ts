import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function getSignInUrl(currentPath: string = ""): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullPath = currentPath || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
  const redirectUrl = encodeURIComponent(origin + fullPath);

  if (process.env.NODE_ENV === "production") {
    return `https://accounts.hivenow.in/sign-in?redirect_url=${redirectUrl}`;
  } else {
    return `/sign-in?redirect_url=${encodeURIComponent(fullPath)}`;
  }
}

export function getSignUpUrl(currentPath: string = ""): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fullPath = currentPath || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
  const redirectUrl = encodeURIComponent(origin + fullPath);

  if (process.env.NODE_ENV === "production") {
    return `https://accounts.hivenow.in/sign-up?redirect_url=${redirectUrl}`;
  } else {
    return `/sign-up?redirect_url=${encodeURIComponent(fullPath)}`;
  }
}

export function navigateToSignIn(router: AppRouterInstance, currentPath: string = "") {
  const url = getSignInUrl(currentPath);
  if (url.startsWith("http")) {
    window.location.href = url;
  } else {
    router.push(url);
  }
}

export function navigateToSignUp(router: AppRouterInstance, currentPath: string = "") {
  const url = getSignUpUrl(currentPath);
  if (url.startsWith("http")) {
    window.location.href = url;
  } else {
    router.push(url);
  }
}
