import { useRole } from "../contexts/RoleContext";
import { useBaby } from "../contexts/BabyContext";
import { Dashboard } from "../pages/Dashboard";
import { PartnerHomeScreen } from "../pages/PartnerHomeScreen";
import { PregnancyDashboard } from "../pages/PregnancyDashboard";
import { isPregnancyMode } from "../utils/pregnancyUtils";

/**
 * Renders PregnancyDashboard (due date in future), Dashboard (full view),
 * or PartnerHomeScreen (caregiver view) based on baby state and family role.
 */
export function HomeSwitch() {
  const { isPartnerView } = useRole();
  const { activeBaby } = useBaby();

  if (activeBaby && isPregnancyMode(activeBaby.birthDate)) {
    return <PregnancyDashboard />;
  }

  return isPartnerView ? <PartnerHomeScreen /> : <Dashboard />;
}
