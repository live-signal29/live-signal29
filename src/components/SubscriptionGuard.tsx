import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { FreeTrialModal } from "@/components/FreeTrialModal";
import { useLocation } from "react-router-dom";

// In saare pages par popup kabhi nahi dikhega
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
  const { trialExpired, loading } = useSubscriptionAccess();
  const location = useLocation();

  const currentPath = location.pathname.toLowerCase();
  const isAllowedRoute = allowedRoutes.some((route) =>
    currentPath === route || currentPath.startsWith(route)
  );

  // LOGIC FIX:
  // 1. Agar request load ho rahi hai -> Pop-up Hide
  // 2. Agar user Allowed Route par hai -> Pop-up Hide
  // 3. Agar Trial Expire NAHI hua (trialExpired === false) -> Pop-up Hide
  // 4. SIRF tabhi Pop-up dikhao jab Data Fetch hone ke baad REAL MEIN trialExpired === true ho!
  const showModal = !loading && !isAllowedRoute && trialExpired === true;

  return (
    <>
      <FreeTrialModal open={showModal} onOpenChange={() => {}} />
      {children}
    </>
  );
};
