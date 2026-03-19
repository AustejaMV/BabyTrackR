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

export function setDateFormatPref(pref: DateFormatPref): void {
  try {
    localStorage.setItem(DATE_KEY, pref);
  } catch {}
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
 * Long display pattern with named month: "d MMMM yyyy" stays the same
 * regardless of preference (day-first vs month-first doesn't affect
 * named-month patterns since the month name makes order unambiguous).
 */
export function userLongDatePattern(): string {
  return "d MMMM yyyy";
}

/**
 * "d MMM HH:mm" → respects time preference
 */
export function userShortDateTimePattern(): string {
  return `d MMM ${userTimePattern()}`;
}

/**
 * "EEE d MMM · HH:mm" → respects time preference
 */
export function userDayDateTimePattern(): string {
  return `EEE d MMM · ${userTimePattern()}`;
}
