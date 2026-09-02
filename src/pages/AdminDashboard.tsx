import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Coins,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Signal,
  Ticket,
  TrendingUp,
  Users,
  X,
  Zap,
  Loader2,
} from "lucide-react";

import { toast } from "sonner";

/* =========================================================
   LAZY COMPONENTS
========================================================= */

const SignalForm = lazy(() => import("@/components/admin/SignalForm"));
const SignalsList = lazy(() => import("@/components/admin/SignalsList"));
const ChartAnalysisForm = lazy(
  () => import("@/components/admin/ChartAnalysisForm")
);
const ChartAnalysisList = lazy(
  () => import("@/components/admin/ChartAnalysisList")
);
const UserManagement = lazy(
  () => import("@/components/admin/UserManagement")
);
const ActivityLog = lazy(() => import("@/components/admin/ActivityLog"));
const CouponManagement = lazy(
  () => import("@/components/admin/CouponManagement")
);
const SpecialOfferManagement = lazy(
  () => import("@/components/admin/SpecialOfferManagement")
);
const UserActivityDashboard = lazy(
  () => import("@/components/admin/UserActivityDashboard")
);
const AccountApplications = lazy(
  () => import("@/components/admin/AccountApplications")
);
const PerformanceManagement = lazy(
  () => import("@/components/admin/PerformanceManagement")
);
const HeadlinesManagement = lazy(
  () => import("@/components/admin/HeadlinesManagement")
);
const MT5CopierManagement = lazy(
  () => import("@/components/admin/MT5CopierManagement")
);

/* =========================================================
   LOADER
========================================================= */

const TabLoader = () => (
  <div className="flex min-h-[180px] items-center justify-center">
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
  </div>
);

/* =========================================================
   MENU
========================================================= */

const menuItems = [
  {
    id: "signals",
    label: "Signals",
    icon: Signal,
    color: "text-emerald-600",
  },
  {
    id: "ideas",
    label: "Ideas",
    icon: TrendingUp,
    color: "text-blue-600",
  },
  {
    id: "headlines",
    label: "News",
    icon: Bell,
    color: "text-orange-600",
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    color: "text-violet-600",
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: BriefcaseBusiness,
    color: "text-cyan-600",
  },
  {
    id: "copier",
    label: "Copier",
    icon: Zap,
    color: "text-yellow-600",
  },
  {
    id: "performance",
    label: "Performance",
    icon: BarChart3,
    color: "text-indigo-600",
  },
  {
    id: "coupons",
    label: "Coupons",
    icon: Ticket,
    color: "text-pink-600",
  },
  {
    id: "offers",
    label: "Offers",
    icon: Coins,
    color: "text-amber-600",
  },
  {
    id: "user-activity",
    label: "Analytics",
    icon: Activity,
    color: "text-teal-600",
  },
  {
    id: "activity",
    label: "Activity",
    icon: Clock3,
    color: "text-slate-600",
  },
];

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("signals");

  const [showSignalForm, setShowSignalForm] = useState(false);
  const [showChartForm, setShowChartForm] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) navigate("/admin/login");
          return;
        }

        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!roles) {
          toast.error("Access denied. Admin privileges required.");

          await supabase.auth.signOut();

          if (mounted) navigate("/admin/login");

          return;
        }

        if (mounted) {
          setUser(session.user);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/admin/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
  };

  /* =======================================================
     SEARCH
  ======================================================= */

  const normalizedSearch = pairSearch.trim().toLowerCase();

  const searchSuggestions = useMemo(() => {
    const pairs = [
      "XAU/USD (Gold)",
      "XAG/USD (Silver)",
      "EUR/USD",
      "GBP/USD",
      "USD/JPY",
      "AUD/USD",
      "USD/CAD",
      "USD/CHF",
      "GBP/JPY",
      "BTC/USD",
      "ETH/USD",
      "SOL/USD",
      "BOOM 1000",
      "BOOM 500",
      "CRASH 1000",
      "VOL 75",
    ];

    if (!normalizedSearch) return [];

    return pairs
      .filter((pair) => pair.toLowerCase().includes(normalizedSearch))
      .slice(0, 6);
  }, [normalizedSearch]);

  const selectPair = (pair: string) => {
    setPairSearch(pair);
    setSearchOpen(true);
    setActiveTab("signals");

    /*
      The search value is kept ready for SignalsList.
      SignalsList can use the same value when its search support
      is connected.
    */

    toast.success(`${pair} selected`);
  };

  /* =======================================================
     OPEN TAB
  ======================================================= */

  const openTab = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);

    if (id !== "signals") {
      setShowSignalForm(false);
    }

    if (id !== "ideas") {
      setShowChartForm(false);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const activeMenu =
    menuItems.find((item) => item.id === activeTab) || menuItems[0];

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* =====================================================
          MOBILE / DESKTOP TOP BAR
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-5">

          {/* BRAND */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">
                Admin Panel
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                Forex 7 StarZ Management
              </p>
            </div>
          </div>

          {/* DESKTOP ACTIONS */}
          <div className="hidden items-center gap-2 sm:flex">

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Search Pair
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* MOBILE ACTIONS */}
          <div className="flex items-center gap-1 sm:hidden">

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="rounded-xl"
            >
              <Search className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* ===================================================
            MOBILE MENU
        =================================================== */}

        {mobileMenuOpen && (
          <div className="border-t bg-white p-2 shadow-lg sm:hidden">
            <div className="grid grid-cols-3 gap-1">

              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => openTab(item.id)}
                    className={`flex min-h-[62px] flex-col items-center justify-center rounded-xl px-2 text-xs font-medium transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="mb-1 h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}

              <button
                onClick={handleLogout}
                className="flex min-h-[62px] flex-col items-center justify-center rounded-xl px-2 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="mb-1 h-4 w-4" />
                Logout
              </button>

            </div>
          </div>
        )}
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-7xl px-3 pb-24 pt-3 sm:px-5 sm:pb-10 sm:pt-6">

        {/* ===================================================
            MOBILE HORIZONTAL CATEGORY MENU
        =================================================== */}

        <div className="-mx-3 mb-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <div className="flex w-max gap-2">

            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => openTab(item.id)}
                  className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}

          </div>
        </div>

        {/* ===================================================
            PAGE TITLE
        =================================================== */}

        <div className="mb-4 flex items-center justify-between">

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <activeMenu.icon className="h-5 w-5 text-slate-500" />

              <h2 className="truncate text-xl font-bold sm:text-2xl">
                {activeMenu.label}
              </h2>
            </div>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Manage your {activeMenu.label.toLowerCase()} quickly
            </p>
          </div>

        </div>

        <Suspense fallback={<TabLoader />}>

          {/* =================================================
              SIGNALS
          ================================================= */}

          {activeTab === "signals" && (
            <div className="space-y-3">

              {/* QUICK ACTION BAR */}

              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="p-3">

                  <div className="flex gap-2">

                    {/* SEARCH */}

                    <button
                      onClick={() => setSearchOpen(true)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-slate-50 px-3 py-3 text-left"
                    >
                      <Search className="h-5 w-5 shrink-0 text-slate-400" />

                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-700">
                          Search pair
                        </div>

                        <div className="truncate text-xs text-slate-400">
                          XAU/USD, EUR/USD, BTC/USD...
                        </div>
                      </div>
                    </button>

                    {/* ADD */}

                    <Button
                      onClick={() => setShowSignalForm(true)}
                      className="h-auto min-h-[54px] shrink-0 rounded-xl px-4"
                    >
                      <Plus className="mr-1.5 h-5 w-5" />
                      Add
                    </Button>

                  </div>

                  {/* QUICK SEARCH RESULT */}

                  {pairSearch && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">

                      <div className="flex min-w-0 items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 shrink-0 text-emerald-600" />

                        <span className="truncate text-sm font-semibold">
                          {pairSearch}
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => {
                          setPairSearch("");
                          setSearchOpen(false);
                        }}
                      >
                        Clear
                      </Button>

                    </div>
                  )}

                </CardContent>
              </Card>

              {/* ADD SIGNAL */}

              {showSignalForm && (
                <Card className="border-emerald-200 shadow-md">

                  <CardContent className="p-3 sm:p-5">

                    <div className="mb-3 flex items-center justify-between">

                      <div>
                        <h3 className="font-bold">
                          Add New Signal
                        </h3>

                        <p className="text-xs text-slate-500">
                          Create signal without leaving this page
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSignalForm(false)}
                        className="rounded-xl"
                      >
                        <X className="h-5 w-5" />
                      </Button>

                    </div>

                    <SignalForm
                      onSuccess={() => {
                        setShowSignalForm(false);
                        toast.success("Signal added");
                      }}
                    />

                  </CardContent>

                </Card>
              )}

              {/* SIGNAL LIST */}

              <Card className="border-slate-200 shadow-sm">

                <CardContent className="p-2 sm:p-4">

                  <div className="mb-2 flex items-center justify-between px-1">

                    <div>
                      <h3 className="text-base font-bold">
                        Live Signals
                      </h3>

                      <p className="text-xs text-slate-500">
                        Quick manage
                      </p>
                    </div>

                    <button
                      onClick={() => setSearchOpen(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border bg-white"
                    >
                      <Search className="h-4 w-4" />
                    </button>

                  </div>

                  <SignalsList />

                </CardContent>

              </Card>

            </div>
          )}

          {/* =================================================
              IDEAS
          ================================================= */}

          {activeTab === "ideas" && (
            <div className="space-y-3">

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-3">

                  <div className="flex items-center justify-between gap-3">

                    <div>
                      <h3 className="font-bold">
                        Chart Ideas
                      </h3>

                      <p className="text-xs text-slate-500">
                        Manage market analysis
                      </p>
                    </div>

                    <Button
                      onClick={() => setShowChartForm(!showChartForm)}
                      size="sm"
                      className="rounded-xl"
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add
                    </Button>

                  </div>

                </CardContent>
              </Card>

              {showChartForm && (
                <Card className="border-blue-200 shadow-md">
                  <CardContent className="p-3 sm:p-5">

                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-bold">
                        Add Chart Analysis
                      </h3>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowChartForm(false)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    <ChartAnalysisForm
                      onSuccess={() => {
                        setShowChartForm(false);
                        toast.success("Chart idea added");
                      }}
                    />

                  </CardContent>
                </Card>
              )}

              <ChartAnalysisList />

            </div>
          )}

          {/* =================================================
              OTHER MODULES
          ================================================= */}

          {activeTab === "headlines" && (
            <HeadlinesManagement />
          )}

          {activeTab === "users" && (
            <UserManagement />
          )}

          {activeTab === "accounts" && (
            <AccountApplications />
          )}

          {activeTab === "copier" && (
            <MT5CopierManagement />
          )}

          {activeTab === "performance" && (
            <PerformanceManagement />
          )}

          {activeTab === "coupons" && (
            <CouponManagement />
          )}

          {activeTab === "offers" && (
            <SpecialOfferManagement />
          )}

          {activeTab === "user-activity" && (
            <UserActivityDashboard />
          )}

          {activeTab === "activity" && (
            <ActivityLog />
          )}

        </Suspense>
      </main>

      {/* =====================================================
          MOBILE BOTTOM QUICK BAR
      ===================================================== */}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 px-2 py-2 backdrop-blur sm:hidden">

        <div className="mx-auto flex max-w-md items-center justify-around">

          <button
            onClick={() => openTab("signals")}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium ${
              activeTab === "signals"
                ? "text-slate-900"
                : "text-slate-400"
            }`}
          >
            <Signal className="h-5 w-5" />
            Signals
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center gap-0.5 rounded-full bg-slate-900 px-5 py-2 text-[10px] font-medium text-white shadow-lg"
          >
            <Search className="h-5 w-5" />
            Search
          </button>

          <button
            onClick={() => {
              setActiveTab("signals");
              setShowSignalForm(true);
            }}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium text-emerald-600"
          >
            <Plus className="h-5 w-5" />
            Add
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium text-slate-400"
          >
            <LayoutDashboard className="h-5 w-5" />
            Menu
          </button>

        </div>

      </div>

      {/* =====================================================
          SEARCH MODAL
      ===================================================== */}

      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-3 pt-16 sm:pt-24">

          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* SEARCH HEADER */}

            <div className="flex items-center gap-2 border-b p-3">

              <Search className="h-5 w-5 text-slate-400" />

              <Input
                autoFocus
                value={pairSearch}
                onChange={(e) => setPairSearch(e.target.value)}
                placeholder="Search XAU/USD, EUR/USD..."
                className="border-0 shadow-none focus-visible:ring-0"
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearchOpen(false);
                  setPairSearch("");
                }}
              >
                <X className="h-5 w-5" />
              </Button>

            </div>

            {/* RESULTS */}

            <div className="max-h-[60vh] overflow-y-auto p-2">

              {!pairSearch && (
                <div className="p-8 text-center">

                  <Search className="mx-auto mb-3 h-9 w-9 text-slate-300" />

                  <p className="font-medium text-slate-700">
                    Search a trading pair
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Quickly find the signal you want to manage
                  </p>

                </div>
              )}

              {pairSearch && searchSuggestions.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No pair found
                </div>
              )}

              {searchSuggestions.map((pair) => (
                <button
                  key={pair}
                  onClick={() => selectPair(pair)}
                  className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-slate-50"
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <CircleDollarSign className="h-5 w-5 text-emerald-600" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        {pair}
                      </p>

                      <p className="text-xs text-slate-400">
                        Open signal
                      </p>
                    </div>

                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400" />

                </button>
              ))}

            </div>

            {/* FOOTER */}

            <div className="border-t bg-slate-50 p-3">

              <Button
                className="w-full rounded-xl"
                onClick={() => {
                  setSearchOpen(false);
                  setActiveTab("signals");
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Open Signals
              </Button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
