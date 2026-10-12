import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface TrialExpiredPopupProps {
  open: boolean;
  onClose: () => void;
}

// One-tap answers. "reason" values must match the CHECK constraint on premium_feedback.
const REASONS: { value: string; label: string }[] = [
  { value: "too_expensive", label: "💸 Too expensive" },
  { value: "dont_trust", label: "🤔 Not sure about signals yet" },
  { value: "not_needed", label: "🙅 Don't need it" },
  { value: "need_features", label: "🧩 Missing features" },
  { value: "just_looking", label: "👀 Just looking" },
];

const TrialExpiredPopup = ({ open, onClose }: TrialExpiredPopupProps) => {
  const navigate = useNavigate();
  const [answered, setAnswered] = useState(true); // hidden until we know
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // When the popup opens, check whether this user already answered.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setUserId(user.id);
        const { count } = await supabase
          .from("premium_feedback" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (!cancelled) setAnswered((count ?? 0) > 0);
      } catch {
        if (!cancelled) setAnswered(true); // on any error: don't show the survey
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleOk = () => {
    onClose();
    navigate("/premium#plans-section");
  };

  const sendReason = async (reason: string) => {
    if (!userId || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("premium_feedback" as any)
      .insert({ user_id: userId, reason });
    setSaving(false);
    // A duplicate (already answered) is fine too.
    if (error && (error as any).code !== "23505") {
      toast.error("Could not save. Please try again.");
      return;
    }
    setAnswered(true);
    toast.success("Thanks! This helps us improve.");
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl flex items-center gap-2">
            Trial Expired 🔒
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Your free trial has expired. Upgrade to premium to continue receiving live trading signals.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!answered && (
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-sm font-medium mb-2">
              Not upgrading right now? Tell us why (1 tap):
            </p>
            <div className="flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <Button
                  key={r.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => sendReason(r.value)}
                  className="h-8 text-xs"
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleOk}
            className="w-full bg-warning hover:bg-warning/90 text-black font-semibold"
          >
            See Premium Plans
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TrialExpiredPopup;
