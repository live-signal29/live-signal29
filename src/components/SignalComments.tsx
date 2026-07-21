import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function SignalComments({ signalId }: { signalId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [uid, setUid] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("signal_comments").select("*").eq("signal_id", signalId).order("created_at", { ascending: false });
    setComments(data || []);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    load();
    const ch = supabase.channel(`comments-${signalId}`).on("postgres_changes", { event: "*", schema: "public", table: "signal_comments", filter: `signal_id=eq.${signalId}` }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [signalId]);

  const post = async () => {
    if (!text.trim() || !uid) return;
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", uid).single();
    const { error } = await supabase.from("signal_comments").insert({ signal_id: signalId, user_id: uid, user_name: prof?.full_name || "Trader", comment: text.trim() });
    if (error) return toast.error(error.message);
    setText("");
  };

  const del = async (id: string) => { await supabase.from("signal_comments").delete().eq("id", id); };

  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold"><MessageSquare className="w-4 h-4" /> Comments ({comments.length})</div>
      {uid && (
        <div className="flex gap-2 mb-3">
          <Input placeholder="Write a comment..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && post()} />
          <Button size="sm" onClick={post}>Post</Button>
        </div>
      )}
      <div className="space-y-2 max-h-60 overflow-auto">
        {comments.map(c => (
          <div key={c.id} className="flex items-start gap-2 p-2 bg-muted/40 rounded text-sm">
            <div className="flex-1">
              <div className="flex items-center gap-2"><span className="font-semibold text-xs">{c.user_name || "Trader"}</span><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span></div>
              <p>{c.comment}</p>
            </div>
            {c.user_id === uid && <button onClick={() => del(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></button>}
          </div>
        ))}
        {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Be the first to comment!</p>}
      </div>
    </div>
  );
}
