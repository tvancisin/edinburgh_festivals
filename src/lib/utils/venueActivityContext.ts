import type { HexBinVenue } from "./hexBinPopup";
import type { VenueActivityData, VenueActivityRecord } from "./venueActivity";

/** Match a popup selection through its literal source venue codes. The venue
 * chart never splits an exact-code group: every source code, including the
 * blank-code group, belongs to exactly one chart column. Use that same stable
 * identity across data reloads rather than object references, display names,
 * or event IDs. One popup name can represent several codes/groups; retain all
 * matches in chart order without modifying events, raw rows, or grouping.
 */
export function findVenueActivityContext(
  data: VenueActivityData | undefined,
  selectedVenue: HexBinVenue | null,
): VenueActivityRecord[] {
  if (!data || !selectedVenue) return [];
  const selectedCodes = new Set(selectedVenue.events.map((event) => event.venue.code));
  return data.venues.filter((venue) => venue.venueCodes.some((code) => selectedCodes.has(code)));
}

/** Describe the selection and explicitly disclose groups hidden by the current
 * year filters. Selection does not override those filters or infer new marks.
 */
export function describeVenueActivityContext(
  selectedVenue: HexBinVenue | null,
  matchingVenues: VenueActivityRecord[],
  visibleData: VenueActivityData | undefined,
): string {
  if (!selectedVenue) return "";
  const label = `Selected venue: ${selectedVenue.venueName ?? "Unnamed venue"}.`;
  if (!matchingVenues.length) return `${label} No matching venue group is available.`;
  const visibleKeys = new Set(visibleData?.venues.map((venue) => venue.venueKey));
  const visibleMatches = matchingVenues.filter((venue) => visibleKeys.has(venue.venueKey));
  if (!visibleMatches.length) return `${label} Hidden by the current year filters.`;
  const highlight = "Matching circles and connecting lines are highlighted.";
  return visibleMatches.length === matchingVenues.length
    ? `${label} ${highlight}`
    : `${label} ${highlight} Some matching venue groups are hidden by the current year filters.`;
}
