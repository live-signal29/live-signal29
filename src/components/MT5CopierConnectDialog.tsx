import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck, Send, Clock, CheckCircle2, Wifi } from "lucide-react";
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
import { rememberOwnCopierRequestId } from "@/lib/myCopierRequests";

interface FormState {
  name: string;
  contact_number: string;
  telegram_username: string;
  mt5_login: string;
  broker_name: string;
  broker_server: string;
  mt5_password: string;
  note: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  contact_number: "",
  telegram_username: "",
  mt5_login: "",
  broker_name: "",
  broker_server: "",
  mt5_password: "",
  note: "",
};

const fieldLabelClass = "text-xs font-medium";
// text-base (16px) on mobile, text-sm on larger screens — under 16px, iOS/Android
// browsers auto-zoom and scroll the page into view on focus, which is what was
// causing the form to visibly "jump" up and down while typing on a phone.
const fieldInputClass = "h-10 text-base sm:text-sm sm:h-9";

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

interface MT5CopierConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called once the user has confirmed via Telegram (right before the
  // dialog auto-closes), so the parent can e.g. scroll to the leaderboard.
  onConfirmed?: () => void;
}

export const MT5CopierConnectDialog = ({ open, onOpenChange, onConfirmed }: MT5CopierConnectDialogProps) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Set right after a successful submit. The request is saved at this
  // point, but NOT yet confirmed — confirmation only happens once the user
  // actually starts the Telegram bot (that's what gives us a chat_id to
  // message them on automatically).
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // While the "confirm on Telegram" screen is showing, poll for the user
  // having linked (i.e. tapped Start in the bot). Once linked, show a
  // "Verified!" state and auto-close + hand off to the parent after 3s.
  useEffect(() => {
    if (!telegramLink || !requestId || verified) return;

    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("mt5-copier-status", {
          body: { id: requestId },
        });
        if (data?.success && data?.linked) {
          setVerified(true);
        }
      } catch {
        // silent — just try again on the next tick
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [telegramLink, requestId, verified]);

  useEffect(() => {
    if (!verified) return;
    toast.success("Verified successfully!", {
      description: "Your request is confirmed. Taking you to the Copier list...",
    });
    closeTimeoutRef.current = setTimeout(() => {
      onOpenChange(false);
      setTelegramLink(null);
      setRequestId(null);
      setVerified(false);
      onConfirmed?.();
    }, 3000);

    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  useEffect(() => () => clearTimers(), []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/(?!^\+)[^\d]/g, "");
    setForm((prev) => ({ ...prev, contact_number: value }));
  };

  const update = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validateWhatsAppNumber = (phone: string): { valid: boolean; message: string } => {
    const cleanPhone = phone.trim();

    if (!cleanPhone.startsWith("+")) {
      return {
        valid: false,
        message: "WhatsApp number must start with '+' and country code (e.g., +92 or +91).",
      };
    }

    const digitsOnly = cleanPhone.substring(1);

    if (cleanPhone.startsWith("+92")) {
      if (digitsOnly.length !== 12) {
        return {
          valid: false,
          message: "Incomplete number! Pakistan WhatsApp numbers must have exactly 10 digits after +92.",
        };
      }
    } else if (cleanPhone.startsWith("+91")) {
      if (digitsOnly.length !== 12) {
        return {
          valid: false,
          message: "Incomplete number! India WhatsApp numbers must have exactly 10 digits after +91.",
        };
      }
    } else {
      if (digitsOnly.length < 11 || digitsOnly.length > 15) {
        return {
          valid: false,
          message: "Please enter a complete and correct WhatsApp number with country code.",
        };
      }
    }

    return { valid: true, message: "" };
  };

  const validateTelegramUsername = (username: string): { valid: boolean; message: string } => {
    const clean = username.replace(/^@/, "").trim();
    if (clean.length < 5 || clean.length > 32) {
      return { valid: false, message: "Telegram username must be 5-32 characters." };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      return { valid: false, message: "Telegram username can only contain letters, numbers and underscores." };
    }
    return { valid: true, message: "" };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.telegram_username.trim() ||
      !form.mt5_login.trim() ||
      !form.broker_name.trim() ||
      !form.broker_server.trim() ||
      !form.mt5_password.trim()
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const usernameCheck = validateTelegramUsername(form.telegram_username);
    if (!usernameCheck.valid) {
      toast.error("Invalid Telegram Username", {
        description: usernameCheck.message,
      });
      return;
    }

    if (form.contact_number.trim()) {
      const phoneCheck = validateWhatsAppNumber(form.contact_number);
      if (!phoneCheck.valid) {
        toast.error("Invalid WhatsApp Number", {
          description: phoneCheck.message,
        });
        return;
      }
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

      rememberOwnCopierRequestId(data?.id);
      setForm(EMPTY_FORM);

      if (data?.telegram_link) {
        // Don't close yet — the request isn't confirmed until they start the bot.
        setRequestId(data.id);
        setTelegramLink(data.telegram_link);
      } else {
        toast.success("Request submitted!");
        onOpenChange(false);
      }
    } catch (err) {
      toast.error("Could not submit request", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      clearTimers();
      setTelegramLink(null);
      setRequestId(null);
      setVerified(false);
    }
    onOpenChange(isOpen);
  };

  if (telegramLink) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md p-6">
          {verified ? (
            <>
              <DialogHeader className="items-center text-center space-y-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <DialogTitle className="text-lg">Verified Successfully!</DialogTitle>
                <DialogDescription className="text-sm">
                  Your request is confirmed. Taking you to the Copier list...
                </DialogDescription>
              </DialogHeader>
              <div className="pt-2 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="items-center text-center space-y-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
                  <Clock className="h-7 w-7" />
                </div>
                <DialogTitle className="text-lg">Request Received — Not Confirmed Yet</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Your details have been sent to our team, but your copier connection is still{" "}
                  <span className="font-semibold text-foreground">pending</span>. To confirm your
                  request and get notified the moment your status changes, start our Telegram
                  bot below.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-1">
                <Button
                  asChild
                  className="w-full h-11 gap-2 bg-[#26A5E4] hover:bg-[#1e8fc9] text-white font-semibold"
                >
                  <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                    <Send className="h-4 w-4" />
                    Start Bot to Confirm Request
                  </a>
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Waiting for you to confirm in Telegram...
                </div>

                <div className="space-y-2 pt-1">
                  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Required to confirm your request and send you status updates.
                  </p>
                  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                    <Wifi className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    If Telegram doesn't open or shows an error, turn on a VPN and try again —
                    Telegram is restricted in some countries without one.
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto overscroll-contain p-4 sm:p-6">
        <DialogHeader className="space-y-1 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary p-1.5">
              <CopierLogo />
            </div>
            <DialogTitle className="text-base">Connect to MT5 Copier</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Share your MT5 details and Telegram username to link your account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
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
            <Label htmlFor="telegram_username" className={fieldLabelClass}>
              Telegram Username <span className="text-red-500">*</span>
            </Label>
            <Input
              id="telegram_username"
              placeholder="e.g., @aliraza"
              value={form.telegram_username}
              onChange={update("telegram_username")}
              className={fieldInputClass}
            />
            <p className="text-[10px] leading-snug text-muted-foreground">
              Used to send you automatic status updates on Telegram.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="contact_number" className={fieldLabelClass}>
              WhatsApp Number (optional)
            </Label>
            <Input
              id="contact_number"
              placeholder="Enter WhatsApp Number"
              value={form.contact_number}
              onChange={handlePhoneChange}
              className={fieldInputClass}
            />
            <span className="text-[10px] text-muted-foreground block font-medium">
              + with country code (e.g. +923001234567)
            </span>
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
            <Label htmlFor="note" className={fieldLabelClass}>Note / Additional Details (optional)</Label>
            <Textarea
              id="note"
              placeholder="Any special instructions..."
              value={form.note}
              onChange={update("note")}
              rows={2}
              className="text-base sm:text-sm"
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
  );
};

export default MT5CopierConnectDialog;
