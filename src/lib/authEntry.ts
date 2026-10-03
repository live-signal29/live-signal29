const KEY = "ls_returning_user";

/** Call when we see a logged-in session: this device has an account. */
export const markReturningUser = () => {
  try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
};

/** New visitors -> /signup, returning users -> /login */
export const authEntryPath = (): "/login" | "/signup" => {
  try {
    return localStorage.getItem(KEY) ? "/login" : "/signup";
  } catch {
    return "/login";
  }
};
