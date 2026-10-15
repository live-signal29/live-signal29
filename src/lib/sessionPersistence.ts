import { supabase } from "@/integrations/supabase/client";

// Keeps the user logged in until they press Logout.
//
// Problem: on phones (Android WebView / in-app browsers) the main login storage (localStorage) can be wiped or
// not flushed when the app is closed, so the user had to do "Continue with Telegram" again.
// Fix: every time Supabase gives us a session we also keep a copy of the refresh token in 3 more places
// (IndexedDB, a long-lived cookie, a second localStorage key). On app start, if the main session is gone,
// we silently restore it from whichever copy survived. Logout (or a revoked token) clears all copies.

const IDB_NAME = "ls_auth_backup";
const IDB_STORE = "kv";
const IDB_KEY = "refresh_token";
const LS_KEY = "ls_rt_backup";
const COOKIE = "ls_rt";
const COOKIE_DAYS = 365;

/* ---------- IndexedDB ---------- */
const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idbSet = async (value: string | null) => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      if (value) tx.objectStore(IDB_STORE).put(value, IDB_KEY);
      else tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* unavailable: other copies still work */
  }
};

const idbGet = async (): Promise<string | null> => {
  try {
    const db = await openDb();
    const v = await new Promise<string | null>((resolve, reject) => {
      const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as string) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return v;
  } catch {
    return null;
  }
};

/* ---------- cookie ---------- */
const cookieSet = (value: string | null) => {
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    if (value) {
      const maxAge = COOKIE_DAYS * 24 * 60 * 60;
      document.cookie = `${COOKIE}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
    } else {
      document.cookie = `${COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
    }
  } catch {
    /* ignore */
  }
};

const cookieGet = (): string | null => {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
};

/* ---------- localStorage copy ---------- */
const lsSet = (value: string | null) => {
  try {
    if (value) localStorage.setItem(LS_KEY, value);
    else localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
};
const lsGet = (): string | null => {
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
};

/* ---------- public API ---------- */
const saveBackup = (refreshToken: string) => {
  lsSet(refreshToken);
  cookieSet(refreshToken);
  void idbSet(refreshToken);
};

const clearBackup = () => {
  lsSet(null);
  cookieSet(null);
  void idbSet(null);
};

let started = false;

/** Call once at startup: mirrors every session change into the backup copies. */
export function startSessionBackup() {
  if (started) return;
  started = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.refresh_token) {
      saveBackup(session.refresh_token);
    } else if (event === "SIGNED_OUT") {
      // Logout pressed, or the server revoked the token: nothing valid left to restore.
      clearBackup();
    }
  });
}

/** If the main session is missing but a backup survived, silently log the user back in. */
export async function restoreSession(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      saveBackup(data.session.refresh_token);
      return;
    }

    const refreshToken = (await idbGet()) || cookieGet() || lsGet();
    if (!refreshToken) return;

    const run = supabase.auth.refreshSession({ refresh_token: refreshToken });
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
    const res: any = await Promise.race([run, timeout]);
    if (!res) return; // slow network: keep the backup, try again next start

    if (res.error) {
      const msg = String(res.error.message || "").toLowerCase();
      const status = res.error.status;
      const invalid = status === 400 || status === 401 || status === 403 || msg.includes("refresh token");
      if (invalid) clearBackup(); // token really is dead -> user must log in again
    } else if (res.data?.session?.refresh_token) {
      saveBackup(res.data.session.refresh_token);
    }
  } catch {
    /* never block app start */
  }
}
