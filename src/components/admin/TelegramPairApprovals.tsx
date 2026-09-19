import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Loader2, Save, Search, Send } from "lucide-react";
import { toast } from "sonner";

interface PairRow {
  pair: string;
  category: string | null;
  is_approved: boolean;
}

const CATEGORY_OPTIONS = ["FOREX", "CRYPTO", "COMMODITIES", "DERIV"];

const TelegramPairApprovals = () => {
  const [rows, setRows] = useState<PairRow[]>([]);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newPair, setNewPair] = useState("");
  const [newCategory, setNewCategory] = useState("FOREX");
  const [adding, setAdding] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("telegram_pair_approvals")
      .select("pair, category, is_approved")
      .order("category", { ascending: true })
      .order("pair", { ascending: true });

    if (error) {
      toast.error("Failed to load pairs: " + error.message);
    } else if (data) {
      setRows(data as PairRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, []);

  const grouped = useMemo(() => {
    const filtered = rows.filter((r) =>
      r.pair.toLowerCase().includes(search.trim().toLowerCase())
    );
    const map: Record<string, PairRow[]> = {};
    for (const r of filtered) {
      const cat = r.category || "UNCATEGORIZED";
      if (!map[cat]) map[cat] = [];
      map[cat].push(r);
    }
    return map;
  }, [rows, search]);

  const isChecked = (row: PairRow) =>
    dirty[row.pair] !== undefined ? dirty[row.pair] : row.is_approved;

  const toggle = (row: PairRow) => {
    setDirty((d) => ({ ...d, [row.pair]: !isChecked(row) }));
  };

  const setAllInCategory = (category: string, value: boolean) => {
    const updates: Record<string, boolean> = {};
    (grouped[category] || []).forEach((r) => (updates[r.pair] = value));
    setDirty((d) => ({ ...d, ...updates }));
  };

  const dirtyCount = Object.keys(dirty).length;

  const saveChanges = async () => {
    if (dirtyCount === 0) return;
    setSaving(true);
    try {
      const pairs = Object.keys(dirty);
      for (const pair of pairs) {
        const { error } = await supabase
          .from("telegram_pair_approvals")
          .update({ is_approved: dirty[pair] })
          .eq("pair", pair);
        if (error) throw error;
      }
      toast.success(`Saved — ${pairs.length} pair(s) updated`);
      setDirty({});
      await loadRows();
    } catch (err: any) {
      toast.error("Save failed: " + (err?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const addNewPair = async () => {
    const pair = newPair.trim();
    if (!pair) return;
    setAdding(true);
    const { error } = await supabase
      .from("telegram_pair_approvals")
      .upsert({ pair, category: newCategory, is_approved: true }, { onConflict: "pair" });
    setAdding(false);
    if (error) {
      toast.error("Failed to add pair: " + error.message);
    } else {
      toast.success(`${pair} added & approved`);
      setNewPair("");
      await loadRows();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[180px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Intro */}
      <Card className="border-sky-200 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-sky-600" />
            <h3 className="font-bold">Telegram Signal Approvals</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Sirf yahan tick kiye gaye pairs ke naye signals Telegram channel par post honge.
            Naya pair aaye to yahan by default "not approved" list mein add ho jata hai — usko yahin se approve karo.
          </p>
        </CardContent>
      </Card>

      {/* Add new pair */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newPair}
              onChange={(e) => setNewPair(e.target.value)}
              placeholder="e.g. XAUUSD"
              className="flex-1"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button onClick={addNewPair} disabled={adding || !newPair.trim()} className="sm:w-auto">
              {adding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Add &amp; Approve
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pair…"
          className="pl-9"
        />
      </div>

      {/* Grouped list */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([category, pairs]) => (
          <Card key={category} className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2">
                <span className="text-sm font-bold">{category}</span>
                <div className="flex gap-3">
                  <button
                    className="text-xs font-medium text-emerald-600 hover:underline"
                    onClick={() => setAllInCategory(category, true)}
                  >
                    Select all
                  </button>
                  <button
                    className="text-xs font-medium text-slate-500 hover:underline"
                    onClick={() => setAllInCategory(category, false)}
                  >
                    Clear all
                  </button>
                </div>
              </div>
              <div className="divide-y">
                {pairs.map((row) => (
                  <label
                    key={row.pair}
                    className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium">{row.pair}</span>
                    <input
                      type="checkbox"
                      checked={isChecked(row)}
                      onChange={() => toggle(row)}
                      className="h-4 w-4 accent-slate-900"
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(grouped).length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">Koi pair nahi mila.</p>
        )}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-16 z-10 sm:bottom-0">
        <Card className="border-slate-200 shadow-md">
          <CardContent className="flex items-center justify-between p-3">
            <span className="text-xs text-slate-500">
              {dirtyCount > 0 ? `${dirtyCount} unsaved change(s)` : "No changes"}
            </span>
            <Button onClick={saveChanges} disabled={dirtyCount === 0 || saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TelegramPairApprovals;
