import { useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FormState {
  name: string;
  contact_number: string;
  mt5_login: string;
  broker_name: string;
  broker_server: string;
  mt5_password: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  contact_number: "",
  mt5_login: "",
  broker_name: "",
  broker_server: "",
  mt5_password: "",
  note: "",
};

// Compact field styles so the whole form fits on a small phone screen with
// minimal scrolling.
const fieldLabelClass = "text-xs font-medium";
const fieldInputClass = "h-9 text-sm";

/**
 * Simple stacked-candlestick "copier" mark — stands in as a lightweight
 * logo badge for the MT5 Copier feature without using any broker/MetaTrader
 * trademarked artwork.
 */
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

/**
 * Promotional banner shown once near the top of the signals feed (above the
 * signal cards, visible without scrolling, in every category). Opens a
 * dialog where a user can submit their MT5 account details so it can be
 * manually connected to the Telegram-to-MT5 copier. On submit, an edge
 * function saves the request and pings the admin's Telegram notification
 * bot.
 */
export const MT5CopierBanner = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.contact_number.trim() ||
      !form.mt5_login.trim() ||
      !form.broker_name.trim() ||
      !form.broker_server.trim() ||
      !form.mt5_password.trim()
    ) {
      toast.error("Please fill your name, contact number, MT5 login, broker name, server and password");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "mt5-copier-request",
        { body: form }
      );

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Request failed");
      }

      toast.success("Request submitted!", {
        description: "Our team will contact you shortly to connect your MT5 account.",
      });
      setForm(EMPTY_FORM);
      setOpen(false);
    } catch (err) {
      toast.error("Could not submit request", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-primary/70 px-4 py-3.5 text-left shadow-md shadow-primary/20 transition-transform active:scale-[0.98]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground p-2">
          <CopierLogo />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold leading-tight text-primary-foreground">
            MT5 Copier — Connect Your Account
          </div>
          <div className="text-[11px] leading-tight text-primary-foreground/85">
            Every signal auto-copied straight to your MT5 trading account
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary-foreground px-3 py-1.5 text-[11px] font-extrabold text-primary">
          Connect <ArrowRight className="h-3 w-3" />
        </span>
      </button>

      {/* max-h + overflow-y-auto so the form scrolls inside the dialog on
          small screens instead of getting cut off with no way to reach the
          submit button. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1 pb-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary p-1.5">
                <CopierLogo />
              </div>
              <DialogTitle className="text-base">Connect to MT5 Copier</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Share your MT5 details and our team will link your account to the signal copier.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className={fieldLabelClass}>Your Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Ali Raza"
                  value={form.name}
                  onChange={update("name")}
                  className={fieldInputClass}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contact_number" className={fieldLabelClass}>Contact Number</Label>
                <Input
                  id="contact_number"
                  placeholder="+923001234567"
                  value={form.contact_number}
                  onChange={update("contact_number")}
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mt5_login" className={fieldLabelClass}>MT5 Login</Label>
                <Input
                  id="mt5_login"
                  placeholder="e.g., 8373738"
                  value={form.mt5_login}
                  onChange={update("mt5_login")}
                  inputMode="numeric"
                  className={fieldInputClass}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="broker_name" className={fieldLabelClass}>Broker Name</Label>
                <Input
                  id="broker_name"
                  placeholder="e.g., Exness"
                  value={form.broker_name}
                  onChange={update("broker_name")}
                  className={fieldInputClass}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="broker_server" className={fieldLabelClass}>Broker Server</Label>
              <Input
                id="broker_server"
                placeholder="e.g., Exness-MT5Real3"
                value={form.broker_server}
                onChange={update("broker_server")}
                className={fieldInputClass}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="mt5_password" className={fieldLabelClass}>Trading Password</Label>
              <Input
                id="mt5_password"
                type="password"
                placeholder="Enter your MT5 trading password"
                value={form.mt5_password}
                onChange={update("mt5_password")}
                className={fieldInputClass}
              />
              <p className="flex items-start gap-1 text-[10px] leading-snug text-muted-foreground">
                <ShieldCheck className="h-3 w-3 shrink-0 mt-0.5" />
                Used only to connect your account to the copier — kept private and secure.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="note" className={fieldLabelClass}>Note / Contact Details (optional)</Label>
              <Textarea
                id="note"
                placeholder="WhatsApp number, best time to contact, etc."
                value={form.note}
                onChange={update("note")}
                rows={2}
                className="text-sm"
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MT5CopierBanner;
