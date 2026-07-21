import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    const t = setTimeout(async () => {
      const [{ data: sigs }, { data: ideas }] = await Promise.all([
        supabase.from("signals").select("id,pair,type,category").ilike("pair", `%${q}%`).eq("published", true).limit(5),
        supabase.from("market_ideas").select("id,title").ilike("title", `%${q}%`).limit(5),
      ]);
      setResults([
        ...(sigs || []).map(s => ({ type: "signal", ...s })),
        ...(ideas || []).map(i => ({ type: "idea", ...i })),
      ]);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 rounded hover:bg-muted" aria-label="Search"><Search className="w-5 h-5" /></button>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center pt-20 px-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4" />
              <Input autoFocus placeholder="Search signals, ideas, pairs..." value={q} onChange={e => setQ(e.target.value)} className="border-0 focus-visible:ring-0" />
              <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="max-h-96 overflow-auto space-y-1">
              {results.map((r, i) => (
                <button key={i} onClick={() => { setOpen(false); nav(r.type === "signal" ? `/signal/${r.id}` : "/chart-analysis"); }} className="w-full text-left p-2 rounded hover:bg-muted flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">{r.type}</span>
                  <span className="flex-1 truncate">{r.pair ? `${r.type === "signal" ? r.type : ""} ${r.pair}` : r.title}</span>
                </button>
              ))}
              {q && results.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No results</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
