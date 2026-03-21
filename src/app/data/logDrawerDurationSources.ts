/**
 * Public sources cited for duration / session-length context in LogDrawer timer sections.
 * (Threshold numbers in code are approximate summaries, not quoted from a single table.)
 */

export type LogDrawerTimerKind = "feed" | "sleep" | "tummy" | "pump";

export interface DurationSourceLink {
  labelKey: string;
  url: string;
}

export const LOG_DRAWER_DURATION_SOURCES: Record<LogDrawerTimerKind, DurationSourceLink[]> = {
  feed: [
    {
      labelKey: "logDrawer.durationSources.feed.nhsBreastfeeding",
      url: "https://www.nhs.uk/conditions/baby/breastfeeding-and-bottle-feeding/breastfeeding-your-baby/",
    },
    {
      labelKey: "logDrawer.durationSources.feed.whoIycf",
      url: "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding",
    },
  ],
  sleep: [
    {
      labelKey: "logDrawer.durationSources.sleep.nhsBabySleep",
      url: "https://www.nhs.uk/baby/caring-for-a-newborn/helping-your-baby-to-sleep/",
    },
    {
      labelKey: "logDrawer.durationSources.sleep.whoIycf",
      url: "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding",
    },
  ],
  tummy: [
    {
      labelKey: "logDrawer.durationSources.tummy.nhsTummyTime",
      url: "https://www.nhs.uk/baby/babys-development/play-and-learning/keep-baby-or-toddler-active/",
    },
    {
      labelKey: "logDrawer.durationSources.tummy.nhsActivityUnder5",
      url: "https://www.nhs.uk/live-well/exercise/physical-activity-guidelines-children-under-five-years/",
    },
  ],
  pump: [
    {
      labelKey: "logDrawer.durationSources.pump.nhsExpressing",
      url: "https://www.nhs.uk/conditions/baby/breastfeeding-and-bottle-feeding/expressing-breast-milk/",
    },
    {
      labelKey: "logDrawer.durationSources.pump.whoIycf",
      url: "https://www.who.int/news-room/fact-sheets/detail/infant-and-young-child-feeding",
    },
  ],
};
