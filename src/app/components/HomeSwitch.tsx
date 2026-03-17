import { useRole } from "../contexts/RoleContext";
import { Dashboard } from "../pages/Dashboard";
import { PartnerHomeScreen } from "../pages/PartnerHomeScreen";

/**
 * Renders Dashboard (full view) or PartnerHomeScreen (caregiver view) based on family role.
 */
export function HomeSwitch() {
  const { isPartnerView } = useRole();
  return isPartnerView ? <PartnerHomeScreen /> : <Dashboard />;
}
