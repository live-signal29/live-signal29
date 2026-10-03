import { useState } from "react";
import { Globe, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SITE_LANGUAGES,
  SITE_LANG_KEY,
  getSavedLanguage,
  setSiteLanguage,
} from "@/lib/googleTranslate";

/** Language button for Login / Signup. Opens the same language list as the side menu. */
const AuthLanguagePicker = () => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(getSavedLanguage());

  const hasChoice =
    typeof window !== "undefined" && !!localStorage.getItem(SITE_LANG_KEY);
  const label = hasChoice
    ? (SITE_LANGUAGES.find((l) => l.code === current)?.label ?? "English")
        .split(" (")[0]
    : "AUTO";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Select language"
        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 max-w-[150px] transition"
      >
        <Globe className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select Language</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-1 pr-1">
            {SITE_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setCurrent(lang.code);
                  setOpen(false);
                  setSiteLanguage(lang.code);
                }}
                className={
                  "flex w-full items-center justify-between h-10 px-3 rounded-xl text-sm font-medium transition active:scale-[0.98] " +
                  (current === lang.code && hasChoice
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "hover:bg-accent text-foreground")
                }
              >
                <span className="truncate">{lang.label}</span>
                {current === lang.code && hasChoice && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuthLanguagePicker;
