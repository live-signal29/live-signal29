import { useState } from "react";
import {
  Loader2,
  ShieldCheck,
  Send,
  Clock3,
  User,
  Phone,
  Hash,
  Building2,
  Server,
  Lock,
  StickyNote,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
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

const fieldLabelClass = "text-[13px] font-medium text-foreground/90";

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

// Text input with a leading icon — keeps every field visually anchored and
// gives the form a consistent, "designed" rhythm instead of bare boxes.
interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ElementType;
}
const IconInput = ({ icon: Icon, className, ...props }: IconInputProps) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    <Input
      {...props}
      className={cn("h-11 pl-9 text-[15px] sm:text-sm", className)}
    />
  </div>
);

// Groups related fields under a small heading with a rule beneath it —
// the section break itself communicates "these fields belong together"
// without adding another card/border layer per field.
const FormSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      <div className="h-px flex-1 bg-border" />
    </div>
    {children}
  </div>
);

interface MT5CopierConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MT5CopierConnectDialog = ({ open, onOpenChange }: MT5CopierConnectDialogProps) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  // Set right after a successful submit, so we can show a "link your
  // Telegram" call-to-action instead of just closing the dialog.
  const [telegramLink, setTelegramLink] = useState<string | null>(null);

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

    const rawUsername = form.telegram_username.trim();
    if (!rawUsername.startsWith("@")) {
      toast.error("Invalid Telegram Username", {
        description: "Telegram username must start with '@' (e.g., @aliraza).",
      });
      return;
    }
    const cleanUsername = rawUsername.replace(/^@/, "");
    if (cleanUsername.length < 5 || cleanUsername.length > 32 || !/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      toast.error("Invalid Telegram Username", {
        description: "Telegram username must be 5-32 characters after the @ (letters, numbers, underscores only).",
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

      toast.success("Request submitted!", {
        description: "Start our Telegram bot to confirm your request.",
      });
      setForm(EMPTY_FORM);

      if (data?.telegram_link) {
        // Show the "link Telegram" step instead of closing right away —
        // this is what makes automatic status updates possible, since a
        // username alone isn't enough for the bot to message someone.
        setTelegramLink(data.telegram_link);
      } else {
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
    if (!isOpen) setTelegramLink(null);
    onOpenChange(isOpen);
  };

  if (telegramLink) {
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-[92vw] max-w-sm rounded-2xl p-5 sm:p-6">
          <DialogHeader className="items-center space-y-3 pb-1 text-center sm:text-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500 ring-4 ring-amber-500/5">
              <Clock3 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <DialogTitle className="text-base">Request Received — Not Confirmed Yet</DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                Your details have been sent to our team, but your copier connection is
                still <span className="font-semibold text-foreground">pending</span>.
                To confirm your request and get notified the moment your status changes,
                start our Telegram bot below.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <Button
              asChild
              className="h-12 w-full gap-2 rounded-xl bg-[#26A5E4] text-white hover:bg-[#26A5E4]/90"
            >
              <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                <Send className="h-4 w-4" />
                Start Bot to Confirm Request
              </a>
            </Button>
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground px-1">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              This step links your Telegram to your request — required so we can confirm
              it reached you and notify you the moment it's approved.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="flex w-[92vw] max-w-sm sm:max-w-md flex-col gap-0 rounded-2xl p-0 max-h-[88vh] overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-1 min-h-0 flex-col">
          <DialogHeader className="space-y-1 border-b bg-muted/30 px-5 py-4 text-left shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary p-1.5">
                <CopierLogo />
              </div>
              <DialogTitle className="text-base">Connect to MT5 Copier</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Share your MT5 details and Telegram username to link your account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 space-y-5 overflow-y-auto px-5 py-4">
            <FormSection title="Your Details">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className={fieldLabelClass}>Your Name</Label>
                  <IconInput
                    icon={User}
                    id="name"
                    placeholder="e.g., Ali Raza"
                    value={form.name}
                    onChange={update("name")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_number" className={fieldLabelClass}>
                    WhatsApp Number <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <IconInput
                    icon={Phone}
                    id="contact_number"
                    placeholder="+923001234567"
                    value={form.contact_number}
                    onChange={handlePhoneChange}
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    With country code, e.g. +923001234567
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telegram_username" className={fieldLabelClass}>
                  Telegram Username <span className="text-red-500">*</span>
                </Label>
                <IconInput
                  icon={Send}
                  id="telegram_username"
                  placeholder="@aliraza"
                  value={form.telegram_username}
                  onChange={update("telegram_username")}
                />
                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                  <Send className="h-3 w-3 shrink-0 mt-0.5" />
                  Required, with @ — this is how we confirm your request and send
                  automatic status updates on Telegram.
                </p>
              </div>
            </FormSection>

            <FormSection title="MT5 Account">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mt5_login" className={fieldLabelClass}>MT5 Login</Label>
                  <IconInput
                    icon={Hash}
                    id="mt5_login"
                    placeholder="e.g., 8373738"
                    value={form.mt5_login}
                    onChange={update("mt5_login")}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="broker_name" className={fieldLabelClass}>Broker Name</Label>
                  <IconInput
                    icon={Building2}
                    id="broker_name"
                    placeholder="e.g., Exness"
                    value={form.broker_name}
                    onChange={update("broker_name")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="broker_server" className={fieldLabelClass}>Broker Server</Label>
                <IconInput
                  icon={Server}
                  id="broker_server"
                  placeholder="e.g., Exness-MT5Real3"
                  value={form.broker_server}
                  onChange={update("broker_server")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mt5_password" className={fieldLabelClass}>Trading Password</Label>
                <IconInput
                  icon={Lock}
                  id="mt5_password"
                  type="password"
                  placeholder="Enter your MT5 trading password"
                  value={form.mt5_password}
                  onChange={update("mt5_password")}
                />
                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 shrink-0 mt-0.5" />
                  Used only to connect your account to the copier — kept private and secure.
                </p>
              </div>
            </FormSection>

            <div className="space-y-1.5">
              <Label htmlFor="note" className={fieldLabelClass}>
                Note <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="note"
                  placeholder="Any special instructions..."
                  value={form.note}
                  onChange={update("note")}
                  rows={2}
                  className="pl-9 text-[15px] sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border-t bg-background px-5 py-4 shrink-0">
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-[15px]"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MT5CopierConnectDialog;
