import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { toast } from "sonner";

export function SignalRating({ signalId }: { signalId: string }) {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(0);
  const [uid, setUid] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("signal_ratings").select("rating,user_id").eq("signal_id", signalId);
    const arr = data || [];
    setCount(arr.length);
    setAvg(arr.length ? arr.reduce((s, r) => s + r.rating, 0) / arr.length : 0);
    const { data: { user } } = await supabase.auth.getUser();
    setUid(user?.id ?? null);
    const m = arr.find(r => r.user_id === user?.id);
    setMine(m?.rating || 0);
  };

  useEffect(() => { load(); }, [signalId]);

  const rate = async (r: number) => {
    if (!uid) return toast.error("Sign in to rate");
    const { error } = await supabase.from("signal_ratings").upsert({ signal_id: signalId, user_id: uid, rating: r }, { onConflict: "signal_id,user_id" });
    if (error) return toast.error(error.message);
    toast.success("Thanks for rating!");
    load();
  };

  return (
    <div className="flex items-center gap-1 text-xs">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => rate(i)}>
          <Star className={`w-4 h-4 ${i <= (mine || Math.round(avg)) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
        </button>
      ))}
      <span className="ml-1 text-muted-foreground">{avg.toFixed(1)} ({count})</span>
    </div>
  );
}
