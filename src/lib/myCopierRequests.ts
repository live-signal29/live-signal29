// Tracks which MT5 Copier requests were submitted from this device/browser.
//
// The app has no login for regular users — copier requests are submitted
// anonymously via an edge function (no auth, no user_id). So there is no
// server-side session to key off of. Instead, right after a request is
// submitted successfully, we remember its id locally. That lets the public
// Copier List hide a "Rejected" card from everyone except the person who
// actually submitted it, without needing a user account system.
//
// This is a "same device, same browser" identity, not a verified login —
// good enough to keep other users' rejections private, but note it won't
// follow the user to a different device/browser.

const STORAGE_KEY = "my_mt5_copier_request_ids";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Call this right after a copier request is successfully submitted. */
export function rememberOwnCopierRequestId(id: string | null | undefined): void {
  if (!id || typeof window === "undefined") return;
  try {
    const ids = readIds();
    if (!ids.includes(id)) {
      ids.push(id);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — safe to ignore.
  }
}

/** True if this device submitted the given copier request id. */
export function isOwnCopierRequestId(id: string | null | undefined): boolean {
  if (!id) return false;
  return readIds().includes(id);
}
