import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { MT5CopierConnectDialog } from "@/components/MT5CopierConnectDialog";

const CopierLogo = () => (
  <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="currentColor" opacity="0.15" />
    <rect x="9" y="20" width="5" height="12" rx="1.5" fill="currentColor" />
    <rect x="17.5" y="12" width="5" height="20" rx="1.5" fill="currentColor" />
    <rect x="26" y="16" width="5" height="16" rx="1.5" fill="currentColor" />
    <path
      d="M9 15 L17 9 L25 12 L31 7"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M26 7 L31 7 L31 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Thin trigger button — the actual form/dialog lives in MT5CopierConnectDialog
// so this banner (shown on Dashboard, Account Management and Premium) can
// never drift out of sync with the version used from the Copier Leaderboard.
export const MT5CopierBanner = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-2.5 rounded-xl bg-gradient-to-r from-secondary to-secondary/70 px-3 py-2.5 text-left shadow-sm card-3d-hover"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-foreground/15 text-secondary-foreground p-1.5 glow-pulse-secondary">
          <CopierLogo />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold leading-tight text-secondary-foreground truncate">
            MT5 Copier — Connect Your Account
          </div>
          <div className="text-[10px] leading-tight text-secondary-foreground/80 truncate">
            Auto-copy every signal to your MT5 account
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary-foreground px-2.5 py-1 text-[10px] font-extrabold text-secondary">
          Connect <ArrowRight className="h-2.5 w-2.5" />
        </span>
      </button>

      <MT5CopierConnectDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default MT5CopierBanner;
