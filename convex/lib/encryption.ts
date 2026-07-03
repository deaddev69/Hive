// convex/lib/encryption.ts
// Secure AES-GCM symmetric encryption utility using Web Crypto API.

const ALGORITHM = "AES-GCM";

async function getKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  // Hash the secret using SHA-256 to derive a high-entropy 256-bit (32 bytes) key
  const hash = await crypto.subtle.digest("SHA-256", secretBytes);
  return await crypto.subtle.importKey(
    "raw",
    hash,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a text string using AES-GCM.
 * Returns a Base64-encoded string combining IV and Ciphertext.
 */
export async function encryptData(text: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(secret);
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(text)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Safe base64 encoding
  let binary = "";
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i] ?? 0);
  }
  return btoa(binary);
}

/**
 * Decrypts a Base64-encoded encrypted string using AES-GCM.
 */
export async function decryptData(encryptedBase64: string, secret: string): Promise<string> {
  const binaryString = atob(encryptedBase64);
  const combined = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    combined[i] = binaryString.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const key = await getKey(secret);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
