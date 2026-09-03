import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { FreeTrialModal } from "@/components/FreeTrialModal";
import { useLocation } from "react-router-dom";

// Profile, Settings aur Auth pages par block nahi karna
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
  "/terms"
];

export const SubscriptionGuard = ({ children }: { children: React.ReactNode }) => {
  const { trialExpired, loading } = useSubscriptionAccess();
  const location = useLocation();

  const currentPath = location.pathname.toLowerCase();
  
  // Check if user is on profile/settings/auth page
  const isAllowed = allowedRoutes.some((route) =>
    currentPath === route || currentPath.startsWith(route)
  );

  // Pop-up SIRF TABHI dikhao jab:
  // 1. Data load ho chuka ho (!loading)
  // 2. User main Signals/App pages par ho (!isAllowed)
  // 3. User ka trial BESHAK EXPIRED ho chuka ho (trialExpired === true)
  const showModal = !loading && !isAllowed && trialExpired === true;

  return (
    <>
      <FreeTrialModal open={showModal} onOpenChange={() => {}} />
      {children}
    </>
  );
};
