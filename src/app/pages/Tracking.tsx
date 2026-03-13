import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, ReferenceArea, Tooltip } from "recharts";
import { format } from "date-fns";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Navigation } from "../components/Navigation";
import { useAuth } from "../contexts/AuthContext";
import { saveData, loadAllDataFromServer, SYNCED_DATA_KEYS, SYNCED_DATA_DEFAULTS } from "../utils/dataSync";
import { getAgeInDays, getTargetsForAge, DEFAULT_MILESTONES } from "../utils/babyUtils";
import { MilestonesTimeline } from "../components/MilestonesTimeline";
import type { BabyProfile, Milestone, FeedingRecord } from "../types";

export function Tracking() {
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [todayCounts, setTodayCounts] = useState({ feeds: 0, sleeps: 0, diapers: 0 });
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const { session } = useAuth();

  const loadLocalData = () => {
    try {
      const bp = localStorage.getItem("babyProfile");
      setBabyProfile(bp ? JSON.parse(bp) : null);
    } catch {
      setBabyProfile(null);
    }
    const todayStart = new Date().setHours(0, 0, 0, 0);
    try {
      const fh: FeedingRecord[] = JSON.parse(localStorage.getItem("feedingHistory") || "[]");
      const sh = JSON.parse(localStorage.getItem("sleepHistory") || "[]");
      const dh = JSON.parse(localStorage.getItem("diaperHistory") || "[]");
      setTodayCounts({
        feeds: fh.filter((f) => (f.endTime ?? f.timestamp) >= todayStart).length,
        sleeps: sh.filter((s) => s.endTime != null && s.endTime >= todayStart).length,
        diapers: dh.filter((d) => d.timestamp >= todayStart).length,
      });
    } catch {
      /* ignore */
    }
    try {
      const raw = localStorage.getItem("milestones");
      const saved: Milestone[] = raw ? JSON.parse(raw) : [];
      const merged = DEFAULT_MILESTONES.map((d) => {
        const s = saved.find((x) => x.id === d.id);
        return { ...d, achievedAt: s?.achievedAt };
      });
      setMilestones(merged);
    } catch {
      setMilestones(DEFAULT_MILESTONES.map((m) => ({ ...m, achievedAt: undefined })));
    }
  };

  useEffect(() => {
    loadLocalData();
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    loadAllDataFromServer(session.access_token).then(({ ok, data }) => {
      if (!ok || !data) return;
      ["babyProfile", "milestones"].forEach((key) => {
        if (key in data) {
          try {
            localStorage.setItem(key, JSON.stringify(data[key] ?? SYNCED_DATA_DEFAULTS[key as keyof typeof SYNCED_DATA_DEFAULTS]));
          } catch {
            /* ignore */
          }
        }
      });
      loadLocalData();
    });
  }, [session?.access_token]);

  if (!babyProfile?.birthDate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl dark:text-white">Tracking</h1>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400">
              Set your baby&apos;s birth date in <Link to="/settings" className="text-blue-600 dark:text-blue-400 underline">Settings</Link> to see age-based targets, normalcy charts, and milestones here.
            </p>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  const ageDays = getAgeInDays(babyProfile.birthDate);
  const t = getTargetsForAge(ageDays);
  const yMax = Math.max(12, t.feedsMax + 2);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    let feeds = 0;
    try {
      const fh: FeedingRecord[] = JSON.parse(localStorage.getItem("feedingHistory") || "[]");
      feeds = fh.filter((f) => {
        const end = f.endTime ?? f.timestamp;
        return end >= dayStart && end < dayEnd;
      }).length;
    } catch {
      /* ignore */
    }
    return { date: format(d, "EEE"), feeds };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl dark:text-white">Tracking</h1>
        </div>

        {/* Today's targets */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm mb-4 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-medium dark:text-white mb-2">
            {babyProfile.name ? `${babyProfile.name}'s targets` : "Today's targets"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Age: {ageDays} days · typical ranges for this age
          </p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-mono text-green-600 dark:text-green-400">{todayCounts.feeds}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">of {t.feedsMin}–{t.feedsMax} feeds</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-2xl font-mono text-blue-600 dark:text-blue-400">{todayCounts.sleeps}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">of {t.sleepsMin}–{t.sleepsMax} sleeps</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <p className="text-2xl font-mono text-amber-600 dark:text-amber-400">{todayCounts.diapers}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">of {t.diapersMin}–{t.diapersMax} diapers</p>
            </div>
          </div>

          {/* Feeds per day (normalcy) — Y domain includes typical range so green band is visible */}
          <div>
            <p className="text-sm font-medium dark:text-white mb-2">Feeds per day (normalcy)</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={last7} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <ReferenceArea y1={t.feedsMin} y2={t.feedsMax} fill="#22c55e" fillOpacity={0.25} ifOverflow="extendDomain" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} domain={[0, yMax]} />
                <Tooltip />
                <Bar dataKey="feeds" fill="#16a34a" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Green band = typical range for age ({t.feedsMin}–{t.feedsMax} feeds/day)
            </p>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            {babyProfile.photoDataUrl && (
              <img src={babyProfile.photoDataUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600 shrink-0" />
            )}
            <h2 className="text-lg font-medium dark:text-white">
              {babyProfile.name ? `${babyProfile.name}'s milestones` : "Milestones"}
            </h2>
          </div>
          <MilestonesTimeline
            birthDateMs={babyProfile.birthDate}
            milestones={milestones.length > 0 ? milestones : DEFAULT_MILESTONES.map((m) => ({ ...m, achievedAt: undefined }))}
            photoDataUrl={babyProfile.photoDataUrl}
            onSave={(next) => {
              setMilestones(next);
              try {
                localStorage.setItem("milestones", JSON.stringify(next));
              } catch {
                /* ignore */
              }
              if (session?.access_token) saveData("milestones", next, session.access_token);
            }}
          />
        </div>
      </div>
      <Navigation />
    </div>
  );
}
