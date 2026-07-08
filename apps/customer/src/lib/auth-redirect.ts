import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function getSignInUrl(currentPath: string = ""): string {
  const fullPath = currentPath || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  return `/sign-in?redirect_url=${encodeURIComponent(fullPath)}`;
}

export function getSignUpUrl(currentPath: string = ""): string {
  const fullPath = currentPath || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/");
  return `/sign-up?redirect_url=${encodeURIComponent(fullPath)}`;
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
