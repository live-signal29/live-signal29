import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { FreeTrialModal } from "@/components/FreeTrialModal";
import { useLocation } from "react-router-dom";

// In sabhi routes/pages par POP-UP KABHI NAHI AAYEGA
const allowedRoutes = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/profile",
  "/settings",
  "/premium",
  "/onboarding",
  "/contact",
  "/privacy",
  "/terms",
  "/about",
  "/admin"
];

export const SubscriptionGuard = ({ children }: { children: React.ReactNode }) => {
  const { trialExpired, hasAccess } = useSubscriptionAccess();
  const location = useLocation();

  // Check if current path matches any allowed route
  const currentPath = location.pathname.toLowerCase();
  const isAllowedRoute = allowedRoutes.some((route) =>
    currentPath === route || currentPath.startsWith(route)
  );

  // Pop-up tabhi aayega jab user Protected Content (Live Signals, Charts, etc.) par ho
  const showModal = !isAllowedRoute && (trialExpired || !hasAccess);

  return (
    <>
      <FreeTrialModal open={showModal} onOpenChange={() => {}} />
      {children}
    </>
  );
};
