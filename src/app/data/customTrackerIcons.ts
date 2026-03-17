/**
 * Icon set for custom trackers (emoji + label for picker).
 */

import type { CustomTrackerIcon } from "../types/customTracker";

export const CUSTOM_TRACKER_ICONS: { id: CustomTrackerIcon; label: string; emoji: string }[] = [
  { id: "star", label: "Star", emoji: "⭐" },
  { id: "heart", label: "Heart", emoji: "❤️" },
  { id: "drop", label: "Drop", emoji: "💧" },
  { id: "pill", label: "Pill", emoji: "💊" },
  { id: "apple", label: "Apple", emoji: "🍎" },
  { id: "sun", label: "Sun", emoji: "☀️" },
  { id: "moon", label: "Moon", emoji: "🌙" },
  { id: "flower", label: "Flower", emoji: "🌸" },
  { id: "book", label: "Book", emoji: "📖" },
  { id: "coffee", label: "Coffee", emoji: "☕" },
];

export function getIconEmoji(icon: CustomTrackerIcon): string {
  return CUSTOM_TRACKER_ICONS.find((i) => i.id === icon)?.emoji ?? "•";
}
