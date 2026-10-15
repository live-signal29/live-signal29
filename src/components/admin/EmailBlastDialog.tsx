import { useMemo, useState } from "react";
import { Mail, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DEFAULT_SUBJECT = "Your free trial has ended - get Premium";
const DEFAULT_BODY = `Hello,

Your free trial has expired, so you no longer have instant access to all live signals.

Upgrade to Premium and get:
• Instant access to all live signals
• Complete entry, take-profit and stop-loss levels in real time
• Priority support

Get Premium now:
https://livesignals29.online/premium

Need help? Contact our support:
https://t.me/Queenisupport_bot

Open the app and choose a Premium plan to continue trading with confidence.`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // WebView fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

type Props = {
  /** emails of the users currently selected in the table */
  emails: string[];
};

export default function EmailBlastDialog({ emails }: Props) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  const list = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of emails) {
      const e = (raw || "").trim().toLowerCase();
      if (EMAIL_RE.test(e) && !seen.has(e)) {
        seen.add(e);
        out.push(e);
      }
    }
    return out;
  }, [emails]);

  const copyEmails = async () => {
    const ok = await copyText(list.join(", "));
    ok ? toast.success(`${list.length} emails copied. Paste them in the BCC field.`) : toast.error("Copy failed.");
  };

  const copyMessage = async () => {
    const ok = await copyText(`${subject}\n\n${body}`);
    ok ? toast.success("Subject + message copied.") : toast.error("Copy failed.");
  };

  const openMail = () => {
    // everyone goes in BCC so nobody sees the other addresses
    const url = `mailto:?bcc=${encodeURIComponent(list.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-violet-500 text-violet-600" disabled={list.length === 0}>
          <Mail className="h-4 w-4 mr-2" />
          Email ({list.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email {list.length} user(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted p-3 text-xs break-all max-h-24 overflow-y-auto">
            {list.join(", ")}
          </div>
          <Button className="w-full" onClick={copyEmails}>
            <Copy className="h-4 w-4 mr-2" />
            Copy all {list.length} emails
          </Button>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copyMessage}>
              <Copy className="h-4 w-4 mr-2" />
              Copy message
            </Button>
            <Button variant="outline" onClick={openMail}>
              <Mail className="h-4 w-4 mr-2" />
              Open Mail app
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: paste the emails in the BCC field so users cannot see each other. If "Open Mail app" does not
            fill everyone, use "Copy all emails" and paste them manually. Gmail allows about 500 recipients per day.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
