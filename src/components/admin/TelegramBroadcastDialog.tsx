import { useMemo, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const BATCH = 100;

export const EXPIRED_TRIAL_TEMPLATE = `Hello {name},

Your free trial has ended, so you no longer have instant access to every signal.

With Premium you get:
• Instant access to all live signals, with no waiting and no ads
• Complete entry, take-profit and stop-loss levels in real time
• Priority support from our team

Upgrade today and keep trading with confidence.`;

type Props = {
  /** ids of the users currently selected in the table */
  userIds: string[];
  /** user ids that have Telegram connected (any user) */
  connectedIds: Set<string>;
  onDone?: () => void;
};

export default function TelegramBroadcastDialog({ userIds, connectedIds, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(EXPIRED_TRIAL_TEMPLATE);
  const [buttons, setButtons] = useState(true);
  const [sending, setSending] = useState(false);

  // only users who really connected Telegram can get a Telegram message
  const reachableIds = useMemo(() => userIds.filter((id) => connectedIds.has(id)), [userIds, connectedIds]);
  const reachable = reachableIds.length;

  const send = async () => {
    const text = message.trim();
    if (!text) return toast.error("Please write a message.");
    if (reachable === 0) return toast.error("None of the selected users has Telegram connected.");
    if (!window.confirm(`Send this message to ${reachable} user(s) on Telegram now?`)) return;

    setSending(true);
    let sent = 0, blocked = 0, failed = 0, noTelegram = 0;
    try {
      for (let i = 0; i < reachableIds.length; i += BATCH) {
        const { data, error } = await supabase.functions.invoke("admin-telegram-broadcast", {
          body: { user_ids: reachableIds.slice(i, i + BATCH), message: text, buttons },
        });
        if (error || !data || (data as any).error) {
          throw new Error((data as any)?.error || error?.message || "Sending failed");
        }
        sent += (data as any).sent ?? 0;
        blocked += (data as any).blocked ?? 0;
        failed += (data as any).failed ?? 0;
        noTelegram += (data as any).no_telegram ?? 0;
      }
      toast.success(
        `Sent to ${sent} user(s)` +
          (blocked ? ` • ${blocked} blocked the bot` : "") +
          (failed ? ` • ${failed} failed` : "") +
          (noTelegram ? ` • ${noTelegram} have no Telegram` : "")
      );
      setOpen(false);
      onDone?.();
    } catch (e: any) {
      toast.error(
        (e?.message || "Sending failed") +
          (sent ? ` (already sent to ${sent} before the error)` : "")
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-sky-500 text-sky-600" disabled={reachable === 0}>
          <Send className="h-4 w-4 mr-2" />
          Telegram message ({reachable})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Telegram message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p>
              <strong>{reachable}</strong> of <strong>{userIds.length}</strong> selected user(s) logged in /
              connected with Telegram and will get this message.
            </p>
            {userIds.length - reachable > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {userIds.length - reachable} selected user(s) have no Telegram and will not get it.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={10} maxLength={3500} />
            <p className="text-xs text-muted-foreground">
              Use <code>{"{name}"}</code> to insert the user's first name.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={buttons} onChange={(e) => setButtons(e.target.checked)} />
            Add buttons: "Get Premium" and "Open the App"
          </label>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setMessage(EXPIRED_TRIAL_TEMPLATE)} disabled={sending}>
              Reset text
            </Button>
            <Button onClick={send} disabled={sending || reachable === 0} className="flex-1">
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {sending ? "Sending..." : `Send to ${reachable} user(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
