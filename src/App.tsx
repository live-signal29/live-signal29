import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { OneSignalProvider } from "@/components/OneSignalProvider";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import BottomNavigation from "@/components/BottomNavigation";

// Lazy load all pages for better performance
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const SignalsDashboard = lazyWithRetry(() => import("./pages/SignalsDashboard"));
const XAUUSDSignals = lazyWithRetry(() => import("./pages/XAUUSDSignals"));
const ForexSignals = lazyWithRetry(() => import("./pages/ForexSignals"));
const CommoditiesSignals = lazyWithRetry(() => import("./pages/CommoditiesSignals"));
const CryptoSignals = lazyWithRetry(() => import("./pages/CryptoSignals"));
const DerivSignals = lazyWithRetry(() => import("./pages/DerivSignals"));
const ChartAnalysis = lazyWithRetry(() => import("./pages/ChartAnalysis"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const About = lazyWithRetry(() => import("./pages/About"));
const Login = lazyWithRetry(() => import("./pages/Login"));
const Signup = lazyWithRetry(() => import("./pages/Signup"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const Premium = lazyWithRetry(() => import("./pages/Premium"));
const FreeTrial = lazyWithRetry(() => import("./pages/FreeTrial"));
const Benefits = lazyWithRetry(() => import("./pages/Benefits"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Notifications = lazyWithRetry(() => import("./pages/Notifications"));
const PaymentSuccess = lazyWithRetry(() => import("./pages/PaymentSuccess"));
const CryptoDeposit = lazyWithRetry(() => import("./pages/CryptoDeposit"));
const SharedSignal = lazyWithRetry(() => import("./pages/SharedSignal"));
const AccountManagement = lazyWithRetry(() => import("./pages/AccountManagement"));
const Results = lazyWithRetry(() => import("./pages/Results"));
const EconomicCalendar = lazyWithRetry(() => import("./pages/EconomicCalendar"));
const Calculator = lazyWithRetry(() => import("./pages/Calculator"));
const Referrals = lazyWithRetry(() => import("./pages/Referrals"));
const PriceAlerts = lazyWithRetry(() => import("./pages/PriceAlerts"));
const TradeJournal = lazyWithRetry(() => import("./pages/TradeJournal"));
const AIChat = lazyWithRetry(() => import("./pages/AIChat"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const Academy = lazyWithRetry(() => import("./pages/Academy"));
const MarketBrief = lazyWithRetry(() => import("./pages/MarketBrief"));
const GiftPremium = lazyWithRetry(() => import("./pages/GiftPremium"));
const Portfolio = lazyWithRetry(() => import("./pages/Portfolio"));
const Backtesting = lazyWithRetry(() => import("./pages/Backtesting"));
const CompoundCalculator = lazyWithRetry(() => import("./pages/CompoundCalculator"));

const LoadingSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-primary/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary
