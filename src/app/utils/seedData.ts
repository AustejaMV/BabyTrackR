/**
 * Generates realistic fake data and writes it to localStorage so the app
 * looks fully populated.  Call `seedAllData()` then reload.
 *
 * Uses the multi-baby storage system (babytrackr-babies + per-baby keys)
 * so data actually loads through BabyContext on next mount.
 */

const ID = () => crypto.randomUUID();
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;

function rng(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[rng(0, arr.length - 1)];
}
function jitter(base: number, spread: number) {
  return base + (Math.random() - 0.5) * 2 * spread;
}
function dateStr(ts: number) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function isoDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const SEED_BABY_ID = "seed_elsie_001";

const PER_BABY_KEYS = [
  "sleepHistory", "feedingHistory", "diaperHistory", "tummyTimeHistory",
  "bottleHistory", "pumpHistory", "currentSleep", "currentTummyTime",
  "feedingInterval", "feedingActiveSession", "painkillerHistory", "notes",
  "shoppingList", "milestones", "temperatureHistory", "symptomHistory",
  "medicationHistory", "solidFoodHistory", "growthMeasurements", "activityHistory",
  "toothHistory",
];

function writeForBaby(key: string, data: unknown) {
  const json = JSON.stringify(data);
  localStorage.setItem(key, json);
  localStorage.setItem(`baby_${SEED_BABY_ID}_${key}`, json);
}

export function seedAllData() {
  const now = Date.now();
  const babyBirth = now - 84 * DAY; // 12 weeks old
  const seedStart = now - 21 * DAY; // 3 weeks of data

  // ── Baby in multi-baby system ──
  const baby = {
    id: SEED_BABY_ID,
    name: "Elsie",
    birthDate: babyBirth,
    parentName: "Sarah",
    sex: "girl",
    weight: 5.2,
    height: 58,
    headCircumference: 39,
  };
  localStorage.setItem("babytrackr-babies", JSON.stringify([baby]));
  localStorage.setItem("babytrackr-activeBabyId", SEED_BABY_ID);
  localStorage.setItem("babyProfile", JSON.stringify({
    birthDate: babyBirth, name: "Elsie", parentName: "Sarah",
    sex: "girl", weight: 5.2, height: 58, headCircumference: 39,
  }));

  // ── Feeding history (breast feeds, ~8/day) ──
  const feedingHistory: any[] = [];
  for (let d = 0; d < 21; d++) {
    const dayStart = seedStart + d * DAY;
    const feedCount = rng(7, 10);
    for (let f = 0; f < feedCount; f++) {
      const feedTime = dayStart + jitter((f * DAY) / feedCount, 30 * MIN);
      const side = pick(["Left breast", "Right breast"]);
      const durMs = rng(8, 25) * MIN;
      feedingHistory.push({
        id: ID(),
        type: side,
        timestamp: feedTime,
        startTime: feedTime,
        endTime: feedTime + durMs,
        durationMs: durMs,
        segments: [{
          type: side,
          startTime: feedTime,
          endTime: feedTime + durMs,
          durationMs: durMs,
        }],
      });
    }
  }
  writeForBaby("feedingHistory", feedingHistory);

  // ── Sleep history (~5 naps + 1 long night sleep per day) ──
  const sleepHistory: any[] = [];
  for (let d = 0; d < 21; d++) {
    const dayStart = seedStart + d * DAY;
    const nightStart = dayStart - 2 * HOUR;
    const nightDur = rng(5, 8) * HOUR;
    sleepHistory.push({
      id: ID(),
      position: "back",
      startTime: nightStart,
      endTime: nightStart + nightDur,
      sleepLocation: pick(["cot", "moses"]),
      whiteNoise: Math.random() > 0.5,
      lightLevel: "dark",
    });
    const napCount = rng(3, 5);
    for (let n = 0; n < napCount; n++) {
      const napStart = dayStart + 8 * HOUR + jitter((n * 10 * HOUR) / napCount, HOUR);
      const napDur = rng(20, 90) * MIN;
      sleepHistory.push({
        id: ID(),
        position: "back",
        startTime: napStart,
        endTime: napStart + napDur,
        sleepLocation: pick(["cot", "pram", "carrier"]),
        fallAsleepMethod: pick(["rocking", "nurse", "self", "dummy"]),
        wakeUpMood: pick(["happy", "fussy", "crying"]),
      });
    }
  }
  writeForBaby("sleepHistory", sleepHistory);

  // ── Diaper history (~8/day) ──
  const diaperHistory: any[] = [];
  for (let d = 0; d < 21; d++) {
    const dayStart = seedStart + d * DAY;
    const count = rng(6, 10);
    for (let i = 0; i < count; i++) {
      diaperHistory.push({
        id: ID(),
        type: pick(["pee", "pee", "pee", "poop", "both"]),
        timestamp: dayStart + jitter((i * DAY) / count, 20 * MIN),
      });
    }
  }
  writeForBaby("diaperHistory", diaperHistory);

  // ── Tummy time (~3/day) ──
  const tummyTimeHistory: any[] = [];
  for (let d = 0; d < 21; d++) {
    const dayStart = seedStart + d * DAY;
    for (let t = 0; t < rng(2, 4); t++) {
      const start = dayStart + 9 * HOUR + jitter(t * 3 * HOUR, HOUR);
      const dur = rng(3, 15) * MIN;
      tummyTimeHistory.push({ id: ID(), startTime: start, endTime: start + dur });
    }
  }
  writeForBaby("tummyTimeHistory", tummyTimeHistory);

  // ── Bottle feeds (~2/day for last week) ──
  const bottleHistory: any[] = [];
  for (let d = 14; d < 21; d++) {
    const dayStart = seedStart + d * DAY;
    for (let b = 0; b < rng(1, 3); b++) {
      bottleHistory.push({
        id: ID(),
        timestamp: dayStart + 10 * HOUR + b * 4 * HOUR + jitter(0, HOUR),
        volumeMl: rng(60, 150),
        feedType: pick(["expressed", "formula"]),
      });
    }
  }
  writeForBaby("bottleHistory", bottleHistory);

  // ── Pump sessions ──
  const pumpHistory: any[] = [];
  for (let d = 14; d < 21; d++) {
    const dayStart = seedStart + d * DAY;
    if (Math.random() > 0.4) {
      const start = dayStart + rng(6, 9) * HOUR;
      pumpHistory.push({
        id: ID(),
        timestamp: start,
        side: pick(["left", "right", "both"]),
        volumeLeftMl: rng(30, 80),
        volumeRightMl: rng(30, 80),
        durationMs: rng(10, 20) * MIN,
      });
    }
  }
  writeForBaby("pumpHistory", pumpHistory);

  // ── Temperature / symptoms / medication ──
  const temperatureHistory: any[] = [];
  const symptomHistory: any[] = [];
  const medicationHistory: any[] = [];
  for (let i = 0; i < 8; i++) {
    const ts = now - rng(0, 14) * DAY - rng(0, 12) * HOUR;
    temperatureHistory.push({
      id: ID(),
      timestamp: new Date(ts).toISOString(),
      tempC: +(36.2 + Math.random() * 1.6).toFixed(1),
      method: pick(["armpit", "ear", "forehead"]),
      note: null,
    });
  }
  writeForBaby("temperatureHistory", temperatureHistory);

  symptomHistory.push({
    id: ID(),
    timestamp: new Date(now - 3 * DAY).toISOString(),
    symptoms: ["runny nose", "cough"],
    severity: "mild",
    note: null,
  });
  symptomHistory.push({
    id: ID(),
    timestamp: new Date(now - 1 * DAY).toISOString(),
    symptoms: ["mild rash"],
    severity: "mild",
    note: "On right cheek",
  });
  writeForBaby("symptomHistory", symptomHistory);

  medicationHistory.push({
    id: ID(),
    timestamp: new Date(now - 2 * DAY).toISOString(),
    medication: "Calpol",
    doseML: 2.5,
    note: null,
  });
  medicationHistory.push({
    id: ID(),
    timestamp: new Date(now - 1 * DAY).toISOString(),
    medication: "Vitamin D drops",
    doseML: null,
    note: "Daily dose",
  });
  writeForBaby("medicationHistory", medicationHistory);

  // ── Solid food history (last 5 days) ──
  const solidFoodHistory: any[] = [];
  const foods = ["banana", "avocado", "sweet potato", "carrot", "porridge", "pear", "broccoli"];
  for (let d = 16; d < 21; d++) {
    const dayStart = seedStart + d * DAY;
    solidFoodHistory.push({
      id: ID(),
      timestamp: new Date(dayStart + 12 * HOUR).toISOString(),
      food: pick(foods),
      isFirstTime: Math.random() > 0.6,
      reaction: pick(["none", "none", "liked", "disliked"]),
      note: null,
      allergenFlags: [],
    });
  }
  writeForBaby("solidFoodHistory", solidFoodHistory);

  // ── Growth measurements ──
  const growthMeasurements: any[] = [];
  const birthWeight = 3.4;
  for (let w = 0; w <= 12; w += 2) {
    const date = babyBirth + w * 7 * DAY;
    growthMeasurements.push({
      id: ID(),
      date,
      weightKg: +(birthWeight + w * 0.18).toFixed(2),
      heightCm: +(50 + w * 0.7).toFixed(1),
      headCircumferenceCm: +(34 + w * 0.4).toFixed(1),
    });
  }
  writeForBaby("growthMeasurements", growthMeasurements);

  // ── Pain relief ──
  writeForBaby("painkillerHistory", [
    { id: ID(), timestamp: now - 6 * HOUR },
    { id: ID(), timestamp: now - 1 * DAY - 4 * HOUR },
  ]);

  // ── Shopping list ──
  writeForBaby("shoppingList", [
    { id: ID(), name: "Size 2 nappies", checked: false },
    { id: ID(), name: "Sudocrem", checked: true },
    { id: ID(), name: "Muslin cloths", checked: false },
    { id: ID(), name: "Baby wipes (fragrance free)", checked: false },
  ]);

  // ── Activity log ──
  const activityHistory: any[] = [];
  for (let d = 0; d < 7; d++) {
    activityHistory.push({
      id: ID(),
      timestamp: now - d * DAY - rng(2, 6) * HOUR,
      type: pick(["playmat", "bath", "walk", "sensory", "reading"]),
      durationMin: rng(5, 30),
      note: "",
    });
  }
  writeForBaby("activityHistory", activityHistory);

  // ── Feeding interval preference ──
  writeForBaby("feedingInterval", 3);

  // ── Spit-up history ──
  const spitUpHistory: any[] = [];
  for (let d = 0; d < 7; d++) {
    if (Math.random() > 0.4) {
      spitUpHistory.push({
        id: ID(),
        timestamp: now - d * DAY - rng(1, 8) * HOUR,
        amount: pick(["small", "small", "medium", "large"]),
        afterFeed: true,
      });
    }
  }
  localStorage.setItem("spitUpHistory", JSON.stringify(spitUpHistory));

  // ── Mood log ──
  const moodLog: any[] = [];
  const moodOpts = ["good", "good", "okay", "okay", "struggling", "overwhelmed"];
  for (let d = 0; d < 14; d++) {
    moodLog.push({
      date: isoDate(now - d * DAY),
      mood: pick(moodOpts),
    });
  }
  localStorage.setItem("cradl-mood-log", JSON.stringify(moodLog));

  // ── Notes ──
  localStorage.setItem("cradl-notes", JSON.stringify([
    { id: ID(), text: "Ask HV about tongue tie at next visit", createdAt: now - 5 * DAY, done: false },
    { id: ID(), text: "Try dream feed at 10:30pm", createdAt: now - 3 * DAY, done: true },
    { id: ID(), text: "Elsie smiled at the dog today!", createdAt: now - 1 * DAY, done: false },
  ]));

  // ── Appointments ──
  localStorage.setItem("babytrackr-appointments", JSON.stringify([
    { id: ID(), name: "8-week jabs", date: dateStr(now - 4 * 7 * DAY), time: "10:30", type: "GP", notes: "6-in-1 + rotavirus", questions: "" },
    { id: ID(), name: "Health visitor check", date: dateStr(now + 3 * DAY), time: "14:00", type: "Health visitor", notes: "", questions: "Ask about sleep regression" },
    { id: ID(), name: "12-week vaccinations", date: dateStr(now + 10 * DAY), time: "09:15", type: "GP", notes: "Second round", questions: "" },
  ]));

  // ── Custom trackers ──
  localStorage.setItem("customTrackers", JSON.stringify([
    { id: "ct-vitamins", name: "Vitamin D", icon: "pill", unit: "", createdAt: now - 14 * DAY },
  ]));
  const customTrackerLogs: any[] = [];
  for (let d = 0; d < 14; d++) {
    customTrackerLogs.push({
      id: ID(),
      trackerId: "ct-vitamins",
      timestamp: now - d * DAY - 8 * HOUR,
      value: "1 drop",
    });
  }
  localStorage.setItem("customTrackerLogs", JSON.stringify(customTrackerLogs));

  // ── Colic episodes (2 weeks of data) ──
  const colicEpisodes: any[] = [];
  for (let d = 0; d < 14; d++) {
    const dayStart = seedStart + (7 + d) * DAY;
    const epCount = rng(0, 3);
    for (let e = 0; e < epCount; e++) {
      const hour = pick([17, 18, 19, 20, 21, 22, 10, 14]);
      const start = dayStart + hour * HOUR + rng(0, 30) * MIN;
      const dur = rng(15, 60) * MIN;
      colicEpisodes.push({
        id: ID(),
        startTime: start,
        endTime: start + dur,
        intensity: pick([2, 3, 3, 4, 4, 5]),
        soothing: [pick(["Shushing", "Swaddling", "Rocking", "White noise"]), pick(["Sucking", "Swinging", "Carrying"])],
        postFeed: Math.random() > 0.6,
        inNapWindow: Math.random() > 0.7,
      });
    }
  }
  localStorage.setItem("cradl-colic-episodes", JSON.stringify(colicEpisodes));

  // ── Last feed side ──
  localStorage.setItem("cradl-last-feed-side", pick(["left", "right"]));

  // ── Onboarding: mark complete, clear step ──
  localStorage.setItem("cradl-onboarding-complete", "true");
  localStorage.setItem("cradl-onboarding-done", "true");
  localStorage.removeItem("cradl-onboarding-step");
}

export function clearSeedData() {
  const mainKeys = [
    "babyProfile", "feedingHistory", "sleepHistory", "diaperHistory",
    "tummyTimeHistory", "bottleHistory", "pumpHistory", "temperatureHistory",
    "symptomHistory", "medicationHistory", "solidFoodHistory", "growthMeasurements",
    "cradl-mood-log", "cradl-notes", "babytrackr-appointments", "painkillerHistory",
    "shoppingList", "spitUpHistory", "activityHistory", "customTrackers",
    "customTrackerLogs", "cradl-last-feed-side", "feedingInterval",
    "cradl-colic-episodes",
  ];
  mainKeys.forEach((k) => localStorage.removeItem(k));

  for (const key of PER_BABY_KEYS) {
    localStorage.removeItem(`baby_${SEED_BABY_ID}_${key}`);
  }
  localStorage.removeItem("babytrackr-babies");
  localStorage.removeItem("babytrackr-activeBabyId");
  localStorage.removeItem("cradl-onboarding-complete");
  localStorage.removeItem("cradl-onboarding-done");
}
