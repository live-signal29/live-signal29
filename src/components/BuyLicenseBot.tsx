import { useState } from "react";
import { ArrowLeft, KeyRound, Send, Bot, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface BuyLicenseBotProps {
  onBack: () => void;
}

const TELEGRAM_SUPPORT_URL = "https://t.me/Queenisupport_bot";

export const BuyLicenseBot = ({ onBack }: BuyLicenseBotProps) => {
  const [licenseKey, setLicenseKey] = useState("");

  const handleActivate = () => {
    if (!licenseKey.trim()) {
      toast.error("Please enter your license key.");
      return;
    }

    // No license-verification API exists in the supplied project yet.
    // Do not show a false success state; direct the user to support instead.
    toast.error("License verification is not connected yet.", {
      description: "Please contact support on Telegram for help.",
      action: {
        label: "Open Telegram",
        onClick: () => window.open(TELEGRAM_SUPPORT_URL, "_blank", "noopener,noreferrer"),
      },
    });
  };

  const formatLicenseKey = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
    return clean.match(/.{1,4}/g)?.join("-") ?? "";
  };

  return (
    <section className="mx-auto flex min-h-[65vh] w-full max-w-2xl flex-col items-center justify-center px-3 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 self-start inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-8 flex flex-col items-center text-center">
        <div className="relative mb-5 flex h-36 w-36 items-center justify-center rounded-full border-4 border-emerald-500/40 bg-emerald-950/70 shadow-[0_0_55px_rgba(16,185,129,0.25)]">
          <div className="absolute inset-2 rounded-full border border-emerald-400/20" />
          <Bot className="h-16 w-16 text-emerald-300" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-wide sm:text-3xl">
          Live Signals Chinese Bot
        </h2>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          Premium Trading Signals
        </p>
      </div>

      <div className="w-full rounded-3xl border border-border bg-card p-5 shadow-xl sm:p-7">
        <label htmlFor="license-key" className="mb-4 flex items-center gap-3 text-lg font-bold sm:text-xl">
          <KeyRound className="h-7 w-7 text-emerald-500" />
          Enter License Key
        </label>
        <input
          id="license-key"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={licenseKey}
          onChange={(event) => setLicenseKey(formatLicenseKey(event.target.value))}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength={19}
          className="h-16 w-full rounded-2xl border border-border bg-muted/70 px-4 text-center text-lg tracking-[0.14em] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:text-xl"
        />
        <button
          type="button"
          onClick={handleActivate}
          className="mt-5 flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-400 px-4 text-lg font-extrabold text-emerald-950 transition hover:bg-emerald-300 active:scale-[0.99]"
        >
          <Send className="h-6 w-6" />
          Activate Bot
        </button>
      </div>

      <a
        href={TELEGRAM_SUPPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-center font-bold transition hover:border-emerald-500/50 hover:bg-muted/50 sm:text-lg"
      >
        <Send className="h-6 w-6 shrink-0 text-emerald-500" />
        Get License Key DM on Telegram
      </a>

      <p className="mt-5 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-muted-foreground sm:text-sm">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        SSL Secured
        <span>•</span>
        256-bit Encrypted
        <span>•</span>
        License support
      </p>
    </section>
  );
};

export default BuyLicenseBot;
