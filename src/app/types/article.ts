/**
 * Contextual knowledge base: article metadata and content.
 */

export type ArticleTriggerCondition =
  | "sleep_regression_detected"
  | "no_poop_alert"
  | "first_solid_logged"
  | "feed_duration_dropping"
  | "nap_window_passed_by_30min"
  | "diaper_colour_green_logged"
  | "feeds_per_day_high"
  | "breast_pain_logged"
  | "first_bottle_logged_while_breastfeeding"
  | "first_app_open"
  | "breast_pain_severity_high"
  | "feeds_very_low"
  | "return_to_work_date_approaching"
  | "overwhelmed_mood_logged";

export interface ArticleMeta {
  id: string;
  title: string;
  triggerConditions: ArticleTriggerCondition[];
  ageRangeWeeks?: [number, number];
  tags: string[];
  lastReviewed: string;
  /** First sentence or short excerpt for cards */
  excerpt: string;
}

export interface ArticleContent extends ArticleMeta {
  body: string;
}
