import { useState } from "react";
import { ArrowRight, Link2, Bot as BotIcon } from "lucide-react";
import { MT5CopierConnectDialog } from "@/components/MT5CopierConnectDialog";
import BuyLicenseBot from "@/components/BuyLicenseBot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CopierLogo = () => (
  <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="currentColor" opacity="0.15" />
    <rect x="9" y="20" width="5" height="12" rx="1.5" fill="currentColor" />
    <rect x="17.5" y="12" width="5" height="20" rx="1.5" fill="currentColor" />
    <rect x="26" y="16" width="5" height="16" rx="1.5" fill="currentColor" />
    <path d="M9 15 L17 9 L25 12 L31 7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M26 7 L31 7 L31 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MT5CopierBanner = () => {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);

  const openRequest = () => {
    setOptionsOpen(false);
    setRequestOpen(true);
  };

  const openLicense = () => {
    setOptionsOpen(false);
    setLicenseOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOptionsOpen(true)}
        className="mb-4 flex w-full items-center gap-2.5 rounded-xl bg-gradient-to-r from-secondary to-secondary/70 px-3 py-2.5 text-left shadow-sm card-3d-hover"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-foreground/15 p-1.5 text-secondary-foreground glow-pulse-secondary">
          <CopierLogo />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold leading-tight text-secondary-foreground">
            MT5 Copier — Connect Your Account
          </div>
          <div className="truncate text-[10px] leading-tight text-secondary-foreground/80">
            Auto-copy every signal to your MT5 account
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary-foreground px-2.5 py-1 text-[10px] font-extrabold text-secondary">
          Connect <ArrowRight className="h-2.5 w-2.5" />
        </span>
      </button>

      <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DialogContent className="w-[calc(100%-24px)] max-w-md rounded-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>Connect MT5 / MT4</DialogTitle>
            <DialogDescription>Choose one option to continue.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid gap-3">
            <button
              type="button"
              onClick={openRequest}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-emerald-500/60 hover:bg-muted/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Link2 className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Request Copy Trading</span>
                <span className="mt-1 block text-xs text-muted-foreground">Continue with the existing MT5 copier request form.</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={openLicense}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-emerald-500/60 hover:bg-muted/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <BotIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Buy License Bot</span>
                <span className="mt-1 block text-xs text-muted-foreground">Open the Live Signals Chinese Bot page.</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* The original request form is opened only after the user selects Request Copy Trading. */}
      <MT5CopierConnectDialog open={requestOpen} onOpenChange={setRequestOpen} />

      <Dialog open={licenseOpen} onOpenChange={setLicenseOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-16px)] max-w-2xl overflow-y-auto rounded-2xl p-3 sm:p-5">
          <BuyLicenseBot onBack={() => setLicenseOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MT5CopierBanner;
