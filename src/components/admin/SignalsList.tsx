import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Check,
  CheckSquare,
  Crown,
  Edit,
  Eye,
  EyeOff,
  Filter,
  Search,
  Square,
  Trash2,
  X,
  Upload,
  Download,
  Trash,
} from "lucide-react";

import { toast } from "sonner";
import { format } from "date-fns";

import SignalForm from "./SignalForm";

const SignalsList = () => {
  const queryClient = useQueryClient();

  /* =========================================================
     STATE
  ========================================================= */

  const [editingSignal, setEditingSignal] = useState<any>(null);

  const [search, setSearch] = useState("");

  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showFilters, setShowFilters] = useState(false);

  const [selectedSignals, setSelectedSignals] = useState<Set<string>>(
    new Set()
  );

  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");

  const [processing, setProcessing] = useState(false);

  /* =========================================================
     FETCH SIGNALS
  ========================================================= */

  const {
    data: signals,
    isLoading,
  } = useQuery({
    queryKey: ["admin-signals"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    },
  });

  /* =========================================================
     FILTER + SORT
  ========================================================= */

  const filteredSignals = useMemo(() => {
    if (!signals) return [];

    const q = search.trim().toLowerCase();

    const filtered = signals.filter((signal: any) => {
      const matchesSearch =
        !q ||
        String(signal.pair || "")
          .toLowerCase()
          .includes(q) ||
        String(signal.main_category || "")
          .toLowerCase()
          .includes(q) ||
        String(signal.sub_category || "")
          .toLowerCase()
          .includes(q);

      const matchesRisk =
        riskFilter === "all" ||
        signal.risk_level === riskFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (signal.signal_status || signal.status || "open") ===
          statusFilter;

      const matchesType =
        typeFilter === "all" ||
        signal.signal_type === typeFilter;

      return (
        matchesSearch &&
        matchesRisk &&
        matchesStatus &&
        matchesType
      );
    });

    return filtered.sort((a: any, b: any) => {
      const statusA = String(
        a.signal_status || a.status || "open"
      ).toLowerCase();

      const statusB = String(
        b.signal_status || b.status || "open"
      ).toLowerCase();

      const closedA =
        statusA === "close" ||
        statusA === "closed";

      const closedB =
        statusB === "close" ||
        statusB === "closed";

      if (!closedA && closedB) return -1;
      if (closedA && !closedB) return 1;

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    });
  }, [
    signals,
    search,
    riskFilter,
    statusFilter,
    typeFilter,
  ]);

  /* =========================================================
     SELECTION
  ========================================================= */

  const selectedCount = selectedSignals.size;

  const allSelected =
    filteredSignals.length > 0 &&
    filteredSignals.every((signal: any) =>
      selectedSignals.has(signal.id)
    );

  const toggleSelectSignal = (id: string) => {
    setSelectedSignals((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedSignals(new Set());
      return;
    }

    setSelectedSignals(
      new Set(
        filteredSignals.map(
          (signal: any) => signal.id
        )
      )
    );
  };

  /* =========================================================
     REFRESH
  ========================================================= */

  const refreshSignals = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin-signals"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["signals"],
    });
  };

  /* =========================================================
     TP / SL HIT
  ========================================================= */

  const toggleHit = async (
    id: string,
    field: string,
    currentValue: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({
          [field]: !currentValue,
        })
        .eq("id", id);

      if (error) throw error;

      await refreshSignals();

      toast.success(
        !currentValue
          ? `${field
              .replace("_hit", "")
              .toUpperCase()} marked HIT`
          : `${field
              .replace("_hit", "")
              .toUpperCase()} marked active`
      );
    } catch (error: any) {
      toast.error(
        error?.message || "Update failed"
      );
    }
  };

  /* =========================================================
     INDIVIDUAL PUBLISH
  ========================================================= */

  const togglePublished = async (
    id: string,
    currentValue: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({
          published: !currentValue,
        })
        .eq("id", id);

      if (error) throw error;

      await refreshSignals();

      toast.success(
        currentValue
          ? "Signal unpublished"
          : "Signal published"
      );
    } catch (error: any) {
      toast.error(
        error?.message || "Update failed"
      );
    }
  };

  /* =========================================================
     PREMIUM
  ========================================================= */

  const togglePremium = async (
    id: string,
    currentValue: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({
          is_premium: !currentValue,
        })
        .eq("id", id);

      if (error) throw error;

      await refreshSignals();

      toast.success(
        currentValue
          ? "Premium lock removed"
          : "Premium lock enabled"
      );
    } catch (error: any) {
      toast.error(
        error?.message || "Update failed"
      );
    }
  };

  /* =========================================================
     STATUS
  ========================================================= */

  const updateSignalStatus = async (
    id: string,
    newStatus: string
  ) => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({
          signal_status: newStatus,
          status: newStatus,
        })
        .eq("id", id);

      if (error) throw error;

      await refreshSignals();

      toast.success(`Status: ${newStatus}`);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "Failed to update status"
      );
    }
  };

  /* =========================================================
     INDIVIDUAL DELETE
  ========================================================= */

  const deleteSignal = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this signal?"
      )
    ) {
      return;
    }

    try {
      setProcessing(true);

      const { error } = await supabase
        .from("signals")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSelectedSignals((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });

      await refreshSignals();

      toast.success("Signal deleted");
    } catch (error: any) {
      toast.error(
        error?.message || "Delete failed"
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     BULK PUBLISH
  ========================================================= */

  const bulkPublish = async (
    published: boolean
  ) => {
    if (selectedCount === 0) {
      toast.error("Select at least one signal");
      return;
    }

    try {
      setProcessing(true);

      const ids = Array.from(selectedSignals);

      const { error } = await supabase
        .from("signals")
        .update({
          published,
        })
        .in("id", ids);

      if (error) throw error;

      await refreshSignals();

      setSelectedSignals(new Set());

      toast.success(
        published
          ? `${ids.length} signals published`
          : `${ids.length} signals unpublished`
      );
    } catch (error: any) {
      toast.error(
        error?.message ||
          "Bulk publish update failed"
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     BULK DELETE
  ========================================================= */

  const bulkDelete = async () => {
    if (selectedCount === 0) {
      toast.error("Select at least one signal");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to DELETE ${selectedCount} selected signal${
        selectedCount > 1 ? "s" : ""
      }?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);

      const ids = Array.from(selectedSignals);

      const { error } = await supabase
        .from("signals")
        .delete()
        .in("id", ids);

      if (error) throw error;

      setSelectedSignals(new Set());

      await refreshSignals();

      toast.success(
        `${ids.length} signals deleted`
      );
    } catch (error: any) {
      toast.error(
        error?.message ||
          "Bulk delete failed"
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     BULK OTHER ACTIONS
  ========================================================= */

  const applyBulkAction = async () => {
    if (selectedCount === 0) {
      toast.error("Select at least one signal");
      return;
    }

    if (!bulkAction) {
      toast.error("Select an action");
      return;
    }

    if (bulkAction === "publish") {
      await bulkPublish(true);
      setBulkAction("");
      setBulkValue("");
      return;
    }

    if (bulkAction === "unpublish") {
      await bulkPublish(false);
      setBulkAction("");
      setBulkValue("");
      return;
    }

    if (bulkAction === "delete") {
      await bulkDelete();
      setBulkAction("");
      setBulkValue("");
      return;
    }

    if (!bulkValue) {
      toast.error("Select a value");
      return;
    }

    try {
      setProcessing(true);

      const updates: any = {};

      if (bulkAction === "risk_level") {
        updates.risk_level = bulkValue;
      }

      if (bulkAction === "signal_status") {
        updates.signal_status = bulkValue;
        updates.status = bulkValue;
      }

      if (bulkAction === "signal_type") {
        updates.signal_type = bulkValue;
      }

      const { error } = await supabase
        .from("signals")
        .update(updates)
        .in(
          "id",
          Array.from(selectedSignals)
        );

      if (error) throw error;

      await refreshSignals();

      toast.success(
        `${selectedCount} signals updated`
      );

      setSelectedSignals(new Set());
      setBulkAction("");
      setBulkValue("");
    } catch (error: any) {
      toast.error(
        error?.message ||
          "Bulk update failed"
      );
    } finally {
      setProcessing(false);
    }
  };

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  const clearFilters = () => {
    setRiskFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setSearch("");
  };

  const filtersActive =
    riskFilter !== "all" ||
    statusFilter !== "all" ||
    typeFilter !== "all";

  /* =========================================================
     LOADING
  ========================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[150px] items-center justify-center text-sm text-muted-foreground">
        Loading signals...
      </div>
    );
  }

  /* =========================================================
     EDIT
  ========================================================= */

  if (editingSignal) {
    return (
      <div className="space-y-3">

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setEditingSignal(null)
          }
          className="rounded-xl"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel Edit
        </Button>

        <Card>
          <CardContent className="p-3 sm:p-5">
            <SignalForm
              editSignal={editingSignal}
              onSuccess={() => {
                setEditingSignal(null);
                refreshSignals();
              }}
            />
          </CardContent>
        </Card>

      </div>
    );
  }

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <div className="space-y-2">

      {/* =====================================================
          SEARCH + SELECT ALL
      ===================================================== */}

      <div className="sticky top-[64px] z-30 rounded-xl border bg-white p-2 shadow-sm">

        <div className="flex gap-2">

          <div className="relative min-w-0 flex-1">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search pair... XAU/USD, BTC/USD"
              className="h-10 w-full rounded-lg border bg-slate-50 pl-9 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}

          </div>

          <Button
            variant="outline"
            onClick={() =>
              setShowFilters(!showFilters)
            }
            className={`h-10 shrink-0 rounded-lg px-3 ${
              filtersActive
                ? "border-primary text-primary"
                : ""
            }`}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">
              Filter
            </span>
          </Button>

          {/* SELECT ALL */}
          <Button
            variant={allSelected ? "default" : "outline"}
            onClick={toggleSelectAll}
            disabled={
              filteredSignals.length === 0
            }
            className="h-10 shrink-0 rounded-lg px-3"
          >
            {allSelected ? (
              <CheckSquare className="mr-1.5 h-4 w-4" />
            ) : (
              <Square className="mr-1.5 h-4 w-4" />
            )}

            <span className="text-xs sm:text-sm">
              {allSelected
                ? "Deselect All"
                : "Select All"}
            </span>
          </Button>

        </div>

        <div className="mt-1 flex items-center justify-between px-1">

          <span className="text-[11px] text-muted-foreground">
            {filteredSignals.length} signal
            {filteredSignals.length !== 1
              ? "s"
              : ""}
            {search
              ? ` for "${search}"`
              : ""}
          </span>

          {filtersActive && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-medium text-primary"
            >
              Clear filters
            </button>
          )}

        </div>

      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      {showFilters && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-3">

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

              <Select
                value={riskFilter}
                onValueChange={setRiskFilter}
              >
                <SelectTrigger className="h-10 bg-background text-sm">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All Risk Levels
                  </SelectItem>

                  <SelectItem value="Low">
                    Low Risk
                  </SelectItem>

                  <SelectItem value="Medium">
                    Medium Risk
                  </SelectItem>

                  <SelectItem value="High">
                    High Risk
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="h-10 bg-background text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All Statuses
                  </SelectItem>

                  <SelectItem value="pending">
                    🟡 Pending
                  </SelectItem>

                  <SelectItem value="open">
                    🟢 Open
                  </SelectItem>

                  <SelectItem value="close">
                    🔴 Close
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="h-10 bg-background text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All Types
                  </SelectItem>

                  <SelectItem value="Scalping">
                    Scalping
                  </SelectItem>

                  <SelectItem value="Intraday">
                    Intraday
                  </SelectItem>

                  <SelectItem value="Swing">
                    Swing
                  </SelectItem>

                  <SelectItem value="Long Term">
                    Long Term
                  </SelectItem>
                </SelectContent>
              </Select>

            </div>

          </CardContent>
        </Card>
      )}

      {/* =====================================================
          BULK ACTION BAR
      ===================================================== */}

      {selectedCount > 0 && (
        <Card className="border-primary/30 bg-primary/5 shadow-sm">

          <CardContent className="p-3">

            <div className="flex flex-wrap items-center justify-between gap-2">

              <div className="flex items-center gap-2">

                <CheckSquare className="h-5 w-5 text-primary" />

                <span className="text-sm font-bold">
                  {selectedCount} Selected
                </span>

              </div>

              <div className="flex gap-1.5">

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedSignals(
                      new Set()
                    )
                  }
                  disabled={processing}
                  className="h-8 rounded-lg text-xs"
                >
                  Clear
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkPublish(true)
                  }
                  disabled={processing}
                  className="h-8 rounded-lg text-xs text-emerald-600"
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Publish
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    bulkPublish(false)
                  }
                  disabled={processing}
                  className="h-8 rounded-lg text-xs text-orange-600"
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Unpublish
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={bulkDelete}
                  disabled={processing}
                  className="h-8 rounded-lg text-xs"
                >
                  <Trash className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>

              </div>

            </div>

            {/* OTHER BULK ACTIONS */}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">

              <Select
                value={bulkAction}
                onValueChange={(value) => {
                  setBulkAction(value);
                  setBulkValue("");
                }}
              >
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue placeholder="More bulk actions" />
                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="risk_level">
                    Change Risk
                  </SelectItem>

                  <SelectItem value="signal_status">
                    Change Status
                  </SelectItem>

                  <SelectItem value="signal_type">
                    Change Type
                  </SelectItem>

                  <SelectItem value="publish">
                    Publish Selected
                  </SelectItem>

                  <SelectItem value="unpublish">
                    Unpublish Selected
                  </SelectItem>

                  <SelectItem value="delete">
                    Delete Selected
                  </SelectItem>

                </SelectContent>
              </Select>

              <Select
                value={bulkValue}
                onValueChange={setBulkValue}
                disabled={
                  !bulkAction ||
                  bulkAction === "publish" ||
                  bulkAction === "unpublish" ||
                  bulkAction === "delete"
                }
              >
                <SelectTrigger className="h-9 bg-background text-xs">
                  <SelectValue placeholder="Value" />
                </SelectTrigger>

                <SelectContent>

                  {bulkAction === "risk_level" && (
                    <>
                      <SelectItem value="Low">
                        Low
                      </SelectItem>

                      <SelectItem value="Medium">
                        Medium
                      </SelectItem>

                      <SelectItem value="High">
                        High
                      </SelectItem>
                    </>
                  )}

                  {bulkAction === "signal_status" && (
                    <>
                      <SelectItem value="pending">
                        🟡 Pending
                      </SelectItem>

                      <SelectItem value="open">
                        🟢 Open
                      </SelectItem>

                      <SelectItem value="close">
                        🔴 Close
                      </SelectItem>
                    </>
                  )}

                  {bulkAction === "signal_type" && (
                    <>
                      <SelectItem value="Scalping">
                        Scalping
                      </SelectItem>

                      <SelectItem value="Intraday">
                        Intraday
                      </SelectItem>

                      <SelectItem value="Swing">
                        Swing
                      </SelectItem>

                      <SelectItem value="Long Term">
                        Long Term
                      </SelectItem>
                    </>
                  )}

                </SelectContent>
              </Select>

              <Button
                onClick={applyBulkAction}
                disabled={
                  processing ||
                  !bulkAction ||
                  (
                    !bulkValue &&
                    bulkAction !== "publish" &&
                    bulkAction !== "unpublish" &&
                    bulkAction !== "delete"
                  )
                }
                className="h-9"
              >
                {processing
                  ? "Processing..."
                  : "Apply Bulk Action"}
              </Button>

            </div>

          </CardContent>
        </Card>
      )}

      {/* =====================================================
          NO SIGNALS
      ===================================================== */}

      {filteredSignals.length === 0 && (
        <Card className="border-dashed">

          <CardContent className="flex min-h-[180px] flex-col items-center justify-center p-6 text-center">

            <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />

            <p className="font-semibold">
              No signals found
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Try another pair or clear the filters.
            </p>

            {(search || filtersActive) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Search
              </Button>
            )}

          </CardContent>
        </Card>
      )}

      {/* =====================================================
          SIGNAL CARDS
      ===================================================== */}

      {filteredSignals.map((signal: any) => {

        const isBuy =
          String(signal.type || "")
            .toLowerCase() === "buy";

        const status =
          signal.signal_status ||
          signal.status ||
          "open";

        return (
          <Card
            key={signal.id}
            className={`overflow-hidden border-slate-200 shadow-sm transition ${
              selectedSignals.has(signal.id)
                ? "border-primary ring-1 ring-primary/20"
                : ""
            }`}
          >

            <CardContent className="p-3">

              <div className="flex items-start gap-2">

                {/* CHECKBOX */}

                <Checkbox
                  checked={selectedSignals.has(
                    signal.id
                  )}
                  onCheckedChange={() =>
                    toggleSelectSignal(
                      signal.id
                    )
                  }
                  className="mt-1 shrink-0"
                />

                <div className="min-w-0 flex-1">

                  {/* PAIR + ACTIONS */}

                  <div className="flex items-center justify-between gap-2">

                    <div className="flex min-w-0 items-center gap-2">

                      <h3 className="truncate text-sm font-bold sm:text-base">
                        {signal.pair}
                      </h3>

                      <Badge
                        className={`shrink-0 px-2 py-0.5 text-[10px] ${
                          isBuy
                            ? "bg-emerald-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {signal.type}
                      </Badge>

                    </div>

                    <div className="flex shrink-0 items-center gap-1">

                      {/* EDIT */}

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setEditingSignal(
                            signal
                          )
                        }
                        className="h-8 w-8 rounded-lg"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>

                      {/* PUBLISH */}

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          togglePublished(
                            signal.id,
                            !!signal.published
                          )
                        }
                        className="h-8 w-8 rounded-lg"
                        title={
                          signal.published
                            ? "Unpublish"
                            : "Publish"
                        }
                      >
                        {signal.published ? (
                          <Eye className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </Button>

                      {/* DELETE */}

                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() =>
                          deleteSignal(
                            signal.id
                          )
                        }
                        disabled={processing}
                        className="h-8 w-8 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>

                    </div>

                  </div>

                  {/* BADGES */}

                  <div className="mt-1.5 flex flex-wrap gap-1">

                    {signal.main_category && (
                      <Badge
                        variant="outline"
                        className="px-2 py-0.5 text-[9px]"
                      >
                        {signal.main_category}
                      </Badge>
                    )}

                    {signal.risk_level && (
                      <Badge
                        variant="secondary"
                        className="px-2 py-0.5 text-[9px]"
                      >
                        {signal.risk_level} Risk
                      </Badge>
                    )}

                    {signal.signal_type && (
                      <Badge
                        variant="outline"
                        className="px-2 py-0.5 text-[9px]"
                      >
                        {signal.signal_type}
                      </Badge>
                    )}

                    {signal.is_premium && (
                      <Badge
                        className="border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[9px] text-yellow-600"
                      >
                        <Crown className="mr-1 h-2.5 w-2.5" />
                        Premium
                      </Badge>
                    )}

                  </div>

                  {/* STATUS + PREMIUM */}

                  <div className="mt-2 flex items-center justify-between gap-2">

                    <Select
                      value={status}
                      onValueChange={(value) =>
                        updateSignalStatus(
                          signal.id,
                          value
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-[105px] rounded-lg bg-slate-50 px-2 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>

                        <SelectItem value="pending">
                          🟡 Pending
                        </SelectItem>

                        <SelectItem value="open">
                          🟢 Open
                        </SelectItem>

                        <SelectItem value="close">
                          🔴 Close
                        </SelectItem>

                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-1.5">

                      <Crown className="h-3.5 w-3.5 text-yellow-500" />

                      <span className="hidden text-[10px] text-muted-foreground sm:block">
                        Premium
                      </span>

                      <Switch
                        checked={
                          !!signal.is_premium
                        }
                        onCheckedChange={() =>
                          togglePremium(
                            signal.id,
                            !!signal.is_premium
                          )
                        }
                        className="scale-75"
                      />

                    </div>

                  </div>

                  {/* PRICE */}

                  <div className="mt-2 grid grid-cols-4 gap-1.5">

                    <div className="rounded-lg bg-slate-50 p-2">
                      <span className="block text-[9px] text-muted-foreground">
                        Entry
                      </span>

                      <span className="text-xs font-bold">
                        {signal.entry ?? "-"}
                      </span>
                    </div>

                    <div className="rounded-lg bg-emerald-50 p-2">
                      <span className="block text-[9px] text-emerald-700">
                        TP1
                      </span>

                      <span className="text-xs font-bold text-emerald-700">
                        {signal.tp1 ?? "-"}
                      </span>
                    </div>

                    <div className="rounded-lg bg-blue-50 p-2">
                      <span className="block text-[9px] text-blue-700">
                        TP2
                      </span>

                      <span className="text-xs font-bold text-blue-700">
                        {signal.tp2 ?? "-"}
                      </span>
                    </div>

                    <div className="rounded-lg bg-red-50 p-2">
                      <span className="block text-[9px] text-red-700">
                        SL
                      </span>

                      <span className="text-xs font-bold text-red-700">
                        {signal.sl ?? "-"}
                      </span>
                    </div>

                  </div>

                  {/* QUICK RESULT */}

                  <div className="mt-2">

                    <div className="mb-1 text-[10px] font-semibold text-muted-foreground">
                      Quick Result
                    </div>

                    <div className="flex flex-wrap gap-1.5">

                      {/* TP1 */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleHit(
                            signal.id,
                            "tp1_hit",
                            !!signal.tp1_hit
                          )
                        }
                        className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold transition ${
                          signal.tp1_hit
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {signal.tp1_hit && (
                          <Check className="h-3 w-3" />
                        )}
                        TP1
                      </button>

                      {/* TP2 */}

                      {signal.tp2 && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleHit(
                              signal.id,
                              "tp2_hit",
                              !!signal.tp2_hit
                            )
                          }
                          className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold transition ${
                            signal.tp2_hit
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          }`}
                        >
                          {signal.tp2_hit && (
                            <Check className="h-3 w-3" />
                          )}
                          TP2
                        </button>
                      )}

                      {/* TP3 */}

                      {signal.tp3 && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleHit(
                              signal.id,
                              "tp3_hit",
                              !!signal.tp3_hit
                            )
                          }
                          className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold transition ${
                            signal.tp3_hit
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                          }`}
                        >
                          {signal.tp3_hit && (
                            <Check className="h-3 w-3" />
                          )}
                          TP3
                        </button>
                      )}

                      {/* TP4 */}

                      {signal.tp4 && (
                        <button
                          type="button"
                          onClick={() =>
                            toggleHit(
                              signal.id,
                              "tp4_hit",
                              !!signal.tp4_hit
                            )
                          }
                          className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold transition ${
                            signal.tp4_hit
                              ? "border-purple-500 bg-purple-500 text-white"
                              : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                          }`}
                        >
                          {signal.tp4_hit && (
                            <Check className="h-3 w-3" />
                          )}
                          TP4
                        </button>
                      )}

                      {/* SL */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleHit(
                            signal.id,
                            "sl_hit",
                            !!signal.sl_hit
                          )
                        }
                        className={`flex h-8 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-semibold transition ${
                          signal.sl_hit
                            ? "border-red-600 bg-red-600 text-white"
                            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        }`}
                      >
                        {signal.sl_hit && (
                          <Check className="h-3 w-3" />
                        )}
                        SL
                      </button>

                    </div>

                  </div>

                  {/* DATE */}

                  <div className="mt-2 flex items-center justify-between">

                    <span className="text-[9px] text-muted-foreground">
                      {signal.created_at
                        ? format(
                            new Date(
                              signal.created_at
                            ),
                            "MMM dd, HH:mm"
                          )
                        : ""}
                    </span>

                    <span
                      className={`text-[9px] font-medium ${
                        signal.published
                          ? "text-emerald-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {signal.published
                        ? "● Published"
                        : "○ Hidden"}
                    </span>

                  </div>

                  {/* PROFIT NOTE */}

                  {signal.profit_note && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                      <p className="text-[10px] italic text-amber-700">
                        {signal.profit_note}
                      </p>
                    </div>
                  )}

                  {/* NOTE */}

                  {signal.note && (
                    <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2">
                      <p className="text-[10px] text-slate-600">
                        {signal.note}
                      </p>
                    </div>
                  )}

                </div>

              </div>

            </CardContent>

          </Card>
        );
      })}

      {/* =====================================================
          MOBILE SELECT ALL
      ===================================================== */}

      {filteredSignals.length > 0 && (
        <div className="flex justify-center py-2 sm:hidden">

          <Button
            variant={allSelected ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectAll}
            className="h-9 rounded-lg text-xs"
          >
            {allSelected ? (
              <>
                <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="mr-1.5 h-3.5 w-3.5" />
                Select All
              </>
            )}
          </Button>

        </div>
      )}

    </div>
  );
};

export default SignalsList;
