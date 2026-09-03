import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { FreeTrialModal } from "@/components/FreeTrialModal";
import { useLocation } from "react-router-dom";

// In routes par Pop-up open nahi hoga
const allowedRoutes = ["/login", "/signup", "/premium", "/onboarding"];

export const SubscriptionGuard = ({ children }: { children: React.ReactNode }) => {
  const { trialExpired, hasAccess } = useSubscriptionAccess();
  const location = useLocation();

  // Check karein ke user Allowed Route par hai ya nahi
  const isAllowedRoute = allowedRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  // Agar trial expire hai AUR user allowed route par NAHI hai, tabhi pop-up dikhao
  const showModal = !isAllowedRoute && (trialExpired || !hasAccess);

  return (
    <>
      <FreeTrialModal open={showModal} onOpenChange={() => {}} />
      {children}
    </>
  );
};
