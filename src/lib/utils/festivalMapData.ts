import * as d3 from "d3";
import type {
  FestivalData,
  FestivalDataByFestival,
  FestivalDataset,
  FestivalDataWithCoordinates,
} from "./festivalData";

export type FestivalYearSelection = "all" | number;

// Explicit source-name variants found in the 2012–2026 CSVs. See the mapping
// rationale and per-year coverage in docs/festival-map-audit.md.
const festivalMapNameAliases = new Map<string, string>([
  ["Fringe", "Edinburgh Festival Fringe"],
  ["Edinburgh Science Festival", "Edinburgh International Science Festival"],
  ["Bank of Scotland Imaginate Festival", "Edinburgh International Children's Festival"],
  ["Imaginate Festival", "Edinburgh International Children's Festival"],
  ["Edinburgh Jazz Festival", "Edinburgh Jazz and Blues Festival"],
  ["Edinburgh Jazz & Blues Festival", "Edinburgh Jazz and Blues Festival"],
  ["Edinburgh Military Tattoo", "Royal Edinburgh Military Tattoo"],
  ["The Royal Edinburgh Military Tattoo", "Royal Edinburgh Military Tattoo"],
  ["Edinburgh Arts Festival", "Edinburgh Art Festival"],
]);

/** Combine all formatted events in file-list and source-row order.
 * Keep repeated records, unknown years, and each event's original raw row.
 * The base datasets and their arrays are never changed.
 */
export function combineFestivalMapDatasets(datasets: FestivalDataset[]): FestivalData[] {
  return datasets.flatMap((dataset) => dataset.events);
}

/** List distinct known source years in ascending order for the year control.
 * Only the option list is deduplicated and sorted; event records are unchanged.
 * No years are inferred from filenames, dates, or the current calendar year.
 */
export function listFestivalMapYears(events: FestivalData[]): number[] {
  return Array.from(new Set(events.flatMap((event) =>
    event.year === null ? [] : [event.year],
  ))).sort(d3.ascending);
}

/** Select an exact source year, or retain every event for All years.
 * Unknown-year records remain in All years and the base collection.
 */
export function selectFestivalMapYear(
  events: FestivalData[],
  selectedYear: FestivalYearSelection,
): FestivalData[] {
  return selectedYear === "all" ? events : events.filter((event) => event.year === selectedYear);
}

/** Resolve explicitly listed historical source names to timeline selection
 * keys. Unlisted names retain exact-name matching, without fuzzy matching.
 * This changes only the grouping key, never the event or its raw source row.
 */
export function resolveFestivalMapName(sourceFestivalName: string): string {
  return festivalMapNameAliases.get(sourceFestivalName) ?? sourceFestivalName;
}

/** Group the selected year's events by the resolved timeline selection key.
 * Keep every record, its original festival name and raw row, and its relative
 * order within its group, including when historical and current names coexist.
 */
export function groupFestivalMapEvents(events: FestivalData[]): FestivalDataByFestival {
  return Object.fromEntries(Array.from(d3.group(events, (event) => resolveFestivalMapName(event.festival)),
    ([festival, records]) => [festival, { festival, events: records }],
  ));
}

/** Resolve a festival against the current year's groups on every selection.
 * An absent festival produces an empty selection, never stale events from a
 * previous year. All festivals retains the combined source-row order.
 */
export function selectFestivalMapEvents(
  events: FestivalData[] | undefined,
  groups: FestivalDataByFestival | undefined,
  festivalName: string | null,
): FestivalData[] | undefined {
  if (!events) return undefined;
  return festivalName === null ? events : groups?.[festivalName]?.events ?? [];
}

/** Label event summaries with the active festival and year scope. */
export function describeFestivalMapScope(
  festivalName: string | null,
  selectedYear: FestivalYearSelection,
): string {
  return `${festivalName ?? "All festivals"}, ${selectedYear === "all" ? "all years" : selectedYear}`;
}

/** Select events with both venue coordinates; retain all others in the base data. */
export function filterFestivalDataWithCoordinates(
  events: FestivalData[],
): FestivalDataWithCoordinates[] {
  return events.filter((event): event is FestivalDataWithCoordinates =>
    event.venue.latitude !== null && event.venue.longitude !== null,
  );
}
