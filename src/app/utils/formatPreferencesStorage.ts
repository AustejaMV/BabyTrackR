/**
 * User preferences for date and time display format.
 * Stored in localStorage so they survive sessions.
 *
 * IMPORTANT: These affect **display only**. All persisted timestamps
 * remain epoch-ms or ISO-8601 strings (yyyy-MM-dd / HH:mm).
 */

const DATE_KEY = "cradl-date-format";
const TIME_KEY = "cradl-time-format";

export type DateFormatPref = "DD/MM/YYYY" | "MM/DD/YYYY";
export type TimeFormatPref = "24h" | "12h";

export function getDateFormatPref(): DateFormatPref {
  try {
    const v = localStorage.getItem(DATE_KEY);
    if (v === "DD/MM/YYYY" || v === "MM/DD/YYYY") return v;
  } catch {}
  return "DD/MM/YYYY";
}

/** Bumped when date/time display prefs change so the UI can re-read localStorage. */
function notifyFormatPrefsChanged(): void {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cradl-format-prefs"));
    }
  } catch {}
}

export function setDateFormatPref(pref: DateFormatPref): void {
  try {
    localStorage.setItem(DATE_KEY, pref);
  } catch {}
  notifyFormatPrefsChanged();
}

export function getTimeFormatPref(): TimeFormatPref {
  try {
    const v = localStorage.getItem(TIME_KEY);
    if (v === "24h" || v === "12h") return v;
  } catch {}
  return "24h";
}

export function setTimeFormatPref(pref: TimeFormatPref): void {
  try {
    localStorage.setItem(TIME_KEY, pref);
  } catch {}
}

/**
 * Return the date-fns pattern for the user's chosen date format.
 * "DD/MM/YYYY" → "dd/MM/yyyy"
 * "MM/DD/YYYY" → "MM/dd/yyyy"
 */
export function userDatePattern(): string {
  return getDateFormatPref() === "MM/DD/YYYY" ? "MM/dd/yyyy" : "dd/MM/yyyy";
}

/**
 * Return the date-fns pattern for the user's chosen time format.
 * "24h" → "HH:mm"
 * "12h" → "h:mm a"
 */
export function userTimePattern(): string {
  return getTimeFormatPref() === "12h" ? "h:mm a" : "HH:mm";
}

/**
 * Short date with user's chosen date order, e.g. "15/03" or "03/15".
 */
export function userShortDatePattern(): string {
  return getDateFormatPref() === "MM/DD/YYYY" ? "MM/dd" : "dd/MM";
}

/**
 * Combined date-time: "dd/MM/yyyy HH:mm" or "MM/dd/yyyy h:mm a" etc.
 */
export function userDateTimePattern(): string {
  return `${userDatePattern()} ${userTimePattern()}`;
}

/**
 * Long display with named month — order follows date preference
 * (e.g. "8 March 2025" vs "March 8, 2025").
 */
export function userLongDatePattern(): string {
  return getDateFormatPref() === "MM/DD/YYYY" ? "MMMM d, yyyy" : "d MMMM yyyy";
}

/** Short day + month, no year: "8 Mar" vs "Mar 8" */
export function userDayMonthShortPattern(): string {
  return getDateFormatPref() === "MM/DD/YYYY" ? "MMM d" : "d MMM";
}

/** Medium: "8 Mar 2025" vs "Mar 8, 2025" */
export function userMediumDatePattern(): string {
  return getDateFormatPref() === "MM/DD/YYYY" ? "MMM d, yyyy" : "d MMM yyyy";
}

/** Weekday + medium date for headings */
export function userWeekdayMediumDatePattern(): string {
  return getDateFormatPref() === "MM/DD/YYYY" ? "EEEE, MMM d, yyyy" : "EEEE, d MMM yyyy";
}

/** Weekday + long month name */
export function userWeekdayLongDatePattern(): string {
  return getDateFormatPref() === "MM/DD/YYYY" ? "EEEE, MMMM d, yyyy" : "EEEE, d MMMM yyyy";
}

/**
 * Short date-time: respects day/month order and 12h/24h.
 */
export function userShortDateTimePattern(): string {
  return `${userDayMonthShortPattern()} ${userTimePattern()}`;
}

/**
 * Weekday + short date + time — respects all display prefs.
 */
export function userDayDateTimePattern(): string {
  const dayPart =
    getDateFormatPref() === "MM/DD/YYYY" ? "EEE, MMM d" : "EEE d MMM";
  return `${dayPart} · ${userTimePattern()}`;
}
