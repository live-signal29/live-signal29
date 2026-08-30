import { useState } from "react";
import { Zap, Link2, Loader2, ShieldAlert } from "lucide-react";
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
 * Banner shown between signal cards. Opens a dialog where a user can submit
 * their MT5 account details so it can be manually connected to the
 * Telegram-to-MT5 copier. On submit, an edge function saves the request and
 * pings the admin's Telegram notification bot.
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
        className="my-3 flex w-full items-center justify-between gap-3 rounded-[14px] border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 text-left shadow-[0_1px_3px_hsl(var(--foreground)/0.05)] transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">
              Connect MT5 to Telegram Copier
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              Auto-copy every signal directly to your trading account
            </div>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-extrabold text-primary-foreground">
          <Zap className="h-3 w-3" /> Connect
        </span>
      </button>

      {/* max-h + overflow-y-auto so the form scrolls inside the dialog on
          small screens instead of getting cut off with no way to reach the
          submit button. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-1 pb-1">
            <DialogTitle className="text-base">Connect Your MT5 Account</DialogTitle>
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
              <Label htmlFor="mt5_password" className={fieldLabelClass}>MT5 Password</Label>
              <Input
                id="mt5_password"
                type="password"
                placeholder="Investor (read-only) password recommended"
                value={form.mt5_password}
                onChange={update("mt5_password")}
                className={fieldInputClass}
              />
              <p className="flex items-start gap-1 text-[10px] leading-snug text-muted-foreground">
                <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
                Use the investor (read-only) password if your broker provides one.
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
