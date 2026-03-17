import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Users, MapPin, MessageCircle, HelpCircle } from "lucide-react";

const SAFETY_SHOWN_KEY = "cradl-village-safety-shown";

export function VillageScreen() {
  const [safetyAccepted, setSafetyAccepted] = useState(false);
  const [showSafetySheet, setShowSafetySheet] = useState(false);

  useEffect(() => {
    try {
      setSafetyAccepted(localStorage.getItem(SAFETY_SHOWN_KEY) === "true");
    } catch {
      setSafetyAccepted(false);
    }
  }, []);

  useEffect(() => {
    if (!safetyAccepted && !showSafetySheet) setShowSafetySheet(true);
  }, [safetyAccepted, showSafetySheet]);

  const acceptSafety = () => {
    try {
      localStorage.setItem(SAFETY_SHOWN_KEY, "true");
    } catch {}
    setSafetyAccepted(true);
    setShowSafetySheet(false);
  };

  const cards = [
    {
      id: "who-else",
      title: "Who else is up?",
      description: "See how many parents nearby logged a feed in the last hour (22:00–06:00). Anonymous, no interaction.",
      to: null as string | null,
      icon: Users,
      nightOnly: true,
    },
    {
      id: "places",
      title: "Places",
      description: "Find and review baby-friendly venues — changing facilities, highchairs, breastfeeding-friendly.",
      to: "/village/places",
      icon: MapPin,
      nightOnly: false,
    },
    {
      id: "groups",
      title: "Groups",
      description: "Create or join private groups. Invite-only via link. Chat and events.",
      to: "/village/groups",
      icon: MessageCircle,
      nightOnly: false,
    },
    {
      id: "qa",
      title: "Ask other parents",
      description: "Anonymous age-matched Q&A. No names, no DMs — just questions and answers.",
      to: "/village/qa",
      icon: HelpCircle,
      nightOnly: false,
    },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)" }}>
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-1" style={{ color: "var(--tx)", fontFamily: "Georgia, serif" }}>
          The Village
        </h1>
        <p className="text-[14px] mb-4" style={{ color: "var(--mu)" }}>
          Community features — who else is up, places, groups, and anonymous Q&A.
        </p>

        <div className="space-y-3">
          {cards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div
                className="rounded-2xl border p-4 flex items-start gap-3"
                style={{ borderColor: "var(--bd)", background: "var(--card)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--pe)" }}>
                  <Icon className="w-5 h-5" style={{ color: "var(--pink)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-medium" style={{ color: "var(--tx)" }}>{card.title}</h2>
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--mu)" }}>{card.description}</p>
                </div>
              </div>
            );
            if (card.to) {
              return <Link key={card.id} to={card.to}>{content}</Link>;
            }
            return (
              <div key={card.id} className="opacity-90">
                {content}
                <p className="text-[12px] mt-1 px-4" style={{ color: "var(--mu)" }}>Available at night in the 3am companion card.</p>
              </div>
            );
          })}
        </div>
      </div>

      {showSafetySheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div
            className="w-full max-w-lg max-h-[85vh] rounded-2xl border overflow-y-auto flex flex-col"
            style={{ background: "var(--card)", borderColor: "var(--bd)" }}
          >
            <div className="p-4 border-b" style={{ borderColor: "var(--bd)" }}>
              <h2 className="text-lg font-semibold" style={{ color: "var(--tx)" }}>Safety &amp; Privacy</h2>
            </div>
            <div className="p-4 flex-1 overflow-y-auto text-[14px] space-y-3" style={{ color: "var(--tx)" }}>
              <p>The Village is designed to keep you in control:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Location is never shown precisely — only approximate distance or &ldquo;nearby&rdquo;.</li>
                <li>Display names are what you choose — not linked to your account in the Village.</li>
                <li>Baby names are only shown if you choose the &ldquo;Mum of [name]&rdquo; option.</li>
                <li>You can delete your Village data anytime in Settings → Danger Zone.</li>
              </ul>
              <p className="pt-2" style={{ color: "var(--mu)" }}>Scroll to the bottom to continue.</p>
            </div>
            <div className="p-4 border-t flex justify-end" style={{ borderColor: "var(--bd)" }}>
              <button
                type="button"
                onClick={acceptSafety}
                className="py-2.5 px-4 rounded-xl font-medium text-white min-h-[44px]"
                style={{ background: "var(--pink)" }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
