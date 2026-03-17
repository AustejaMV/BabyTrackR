import { Link } from "react-router";
import { useBaby } from "../contexts/BabyContext";
import { ReturnToWorkPlanner } from "../components/ReturnToWorkPlanner";
import { saveData } from "../utils/dataSync";
import { useAuth } from "../contexts/AuthContext";
import { ArrowLeft } from "lucide-react";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ReturnToWorkScreen() {
  const { activeBaby } = useBaby();
  const { session } = useAuth();
  const feedingHistory = loadJson("feedingHistory", []);
  const sleepHistory = loadJson("sleepHistory", []);
  const babyProfile = activeBaby
    ? { birthDate: activeBaby.birthDate, name: activeBaby.name }
    : null;

  const handleSaveToServer = (plan: import("../types/returnToWork").ReturnToWorkPlan) => {
    if (session?.access_token) {
      saveData("returnToWorkPlan", plan, session.access_token);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/more"
            className="p-2 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center border"
            style={{ borderColor: "var(--bd)", background: "var(--card)", color: "var(--tx)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold" style={{ color: "var(--tx)" }}>Return to work</h1>
        </div>
        <ReturnToWorkPlanner
          feedingHistory={feedingHistory}
          sleepHistory={sleepHistory}
          babyProfile={babyProfile}
          onSaveToServer={handleSaveToServer}
        />
      </div>
    </div>
  );
}
