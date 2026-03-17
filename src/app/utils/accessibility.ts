/**
 * Accessibility helpers: props for labels, hints, roles, charts, and live regions.
 */

export interface A11yProps {
  "aria-label": string;
  "aria-roledescription"?: string;
  role?: string;
  "aria-describedby"?: string;
}

/**
 * Returns props for an element that needs a label and optional hint/role.
 */
export function a11y(
  label: string,
  options?: { hint?: string; role?: string }
): A11yProps & Record<string, unknown> {
  const out: A11yProps & Record<string, unknown> = {
    "aria-label": label,
  };
  if (options?.role) out.role = options.role;
  if (options?.hint) out["aria-describedby"] = options.hint;
  return out;
}

/**
 * Returns props for a chart container: aria-label from title, description as accessible summary.
 */
export function a11yChart(title: string, description: string): A11yProps & Record<string, unknown> {
  return {
    "aria-label": title,
    "aria-roledescription": "chart",
    role: "img",
    "aria-describedby": description ? undefined : undefined,
    ...(description ? { "data-chart-description": description } : {}),
  };
}

/**
 * Returns props for a live region (e.g. timer, status updates).
 */
export function a11yLiveRegion(message: string): Record<string, unknown> {
  return {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": true,
    "aria-label": message,
  };
}
