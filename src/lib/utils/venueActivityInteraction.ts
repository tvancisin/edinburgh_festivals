import type { VenueActivityData, VenueActivityRecord } from "./venueActivity";
import type { VenueActivityColumn } from "./venueActivityLayout";

/** Binary-search the existing left-to-right label slots while preview marks
 * grow. Do not sort the input; return the existing venue with all raw rows.
 */
export function findVenueActivityLabelAtX(columns: VenueActivityColumn[], x: number): VenueActivityRecord | null {
  if (!Number.isFinite(x)) return null;
  let left = 0;
  let right = columns.length;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    const column = columns[middle];
    if (column.targetX + column.width / 2 < x) left = middle + 1;
    else right = middle;
  }
  const column = columns[left];
  return column && x >= column.targetX - column.width / 2 ? column.venue : null;
}

/** Find the current preview column by stable key without a fallback selection. */
export function findVenueActivityPreview(columns: VenueActivityColumn[], key: string | null): VenueActivityColumn | null {
  return columns.find((column) => column.venue.venueKey === key) ?? null;
}

/** Arrow keys move one existing column, Home/End jump to the ends. Clamp at
 * the boundaries, preserve chart order, and leave unrelated keys unhandled.
 */
export function moveVenueActivityLabel(data: VenueActivityData, currentKey: string | null, key: string): VenueActivityRecord | null {
  if (!data.venues.length) return null;
  const currentIndex = Math.max(0, data.venues.findIndex((venue) => venue.venueKey === currentKey));
  let index: number;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown": index = Math.min(data.venues.length - 1, currentIndex + 1); break;
    case "ArrowLeft":
    case "ArrowUp": index = Math.max(0, currentIndex - 1); break;
    case "Home": index = 0; break;
    case "End": index = data.venues.length - 1; break;
    default: return null;
  }
  return data.venues[index];
}
