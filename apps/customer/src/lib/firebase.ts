// apps/customer/src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, GoogleAuthProvider } from "firebase/auth";
import { authPerfLog } from "./authPerf";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB1Qn8xKgOA_mYOLfCNZagS9QEMO0u0Ud8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "hive-fashion.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hive-fashion",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "hive-fashion.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "455960950280",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:455960950280:web:f4be4436f24cd3828d83bd",
};

// Initialize Firebase only on client or during SSR if not already initialized.
// This module only ever runs its top-level code once per JS module instance (Next.js/webpack
// module caching), so a duplicate-initialization bug would show up as this log firing more than
// once per page load in the console.
const wasAlreadyInitialized = getApps().length > 0;
export const app = wasAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);
authPerfLog(`Firebase app ${wasAlreadyInitialized ? "reused (already initialized)" : "initialized"}`);

export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});
authPerfLog("Firebase Auth instance ready");

export const googleProvider = new GoogleAuthProvider();
