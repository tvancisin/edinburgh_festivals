import * as d3 from "d3";
import type { FestivalData, FestivalDataset, RawFestivalData } from "./festivalData";
import { groupEventsByVenueSite, type VenueSite } from "./venueSites";

export const venueActivityYears = d3.range(2012, 2027);
export const venueActivityFiles = venueActivityYears.map((year) => `${year}.csv`);
export const venueActivityYearRangeLabel = `${venueActivityYears[0]}–${venueActivityYears[venueActivityYears.length - 1]}`;

export type VenueYearPresence = {
  year: number;
  isRecorded: boolean;
  events: FestivalData[];
  raw: RawFestivalData[];
};

export type VenueActivityRecord = {
  venueKey: string;
  venueName: string;
  venueNames: string[];
  venueCodes: string[];
  codeLabel: string;
  site: VenueSite;
  presence: VenueYearPresence[];
  recordedYearCount: number;
  accessibleLabel: string;
  events: FestivalData[];
  raw: RawFestivalData[];
};

/** Select only the requested year files, retaining their order and raw rows.
 * A missing file is an error, rather than an apparently empty year. Other
 * loaded files remain available in the loader and are not included here.
 */
export function selectVenueActivityDatasets(datasets: FestivalDataset[]): FestivalDataset[] {
  for (const fileName of venueActivityFiles) {
    if (!datasets.some((dataset) => dataset.fileName === fileName)) {
      throw new Error(`Venue activity requires ${fileName}. Add it to festivalDataFiles.`);
    }
  }
  return datasets.filter((dataset) => venueActivityFiles.includes(dataset.fileName));
}

/** Build year presence by the merge-only assignments in venueSites.ts.
 * Existing code groups can combine using reviewed sites or consistent addresses;
 * no original code group is split. Conflicting or incomplete groups stay intact.
 * All original names,
 * codes, match evidence, event objects, and raw rows are retained. Columns sort
 * by recorded-year count, then display name. No event rows are deduplicated.
 *
 * A year is recorded if at least one grouped event has that parsed Year value.
 * Missing or other years are retained on the venue and in raw data and counted
 * separately; no year is inferred from its filename. Each year record retains
 * all contributing event objects and original rows. Blank cells mean no source
 * event records for that year, rather than a claim about a venue's operation.
 */
export function createVenueActivityData(datasets: FestivalDataset[]): VenueActivityData {
  const sources = selectVenueActivityDatasets(datasets);
  const events = sources.flatMap((dataset) => dataset.events);
  const years = [...venueActivityYears];
  const sourceVenueCodeCount = d3.groups(events, (event) => event.venue.code).length;
  const venues = groupEventsByVenueSite(events).map((site) => {
    const venueEvents = site.events;
    const venueNames = d3.groups(venueEvents, (event) => event.venue.name).map(([name]) => name);
    const venueCodes = d3.groups(venueEvents, (event) => event.venue.code).map(([code]) => code);
    const venueName = site.siteName;
    const codeLabel = `${venueCodes.length > 1 ? "Codes" : "Code"} ${venueCodes.map((code) => code || "not provided").join(", ")}`;
    const presence = years.map((year) => {
      const matchingEvents = venueEvents.filter((event) => event.year === year);
      return {
        year,
        isRecorded: matchingEvents.length > 0,
        events: matchingEvents,
        raw: matchingEvents.map((event) => event.raw),
      };
    });
    const recordedYearCount = presence.filter((record) => record.isRecorded).length;
    return {
      venueKey: site.siteId,
      venueName,
      venueNames,
      venueCodes,
      codeLabel,
      site,
      presence,
      recordedYearCount,
      accessibleLabel: `${venueName}, ${codeLabel}. ${site.matchExplanation} Source names: ${venueNames.map((name) => name || "Unnamed venue").join("; ")}. Recorded in ${recordedYearCount} of ${years.length} years. ${presence.map((record) =>
        `${record.year}: ${record.isRecorded ? "recorded" : "not recorded"}`,
      ).join("; ")}.`,
      events: venueEvents,
      raw: venueEvents.map((event) => event.raw),
    };
  });
  return {
    years,
    venues: sortVenuesByRecordedYears(venues),
    sourceFiles: sources.map((dataset) => dataset.fileName),
    sourceVenueCodeCount,
    unassignedYearRecordCount: events.filter((event) => event.year === null || !years.includes(event.year)).length,
    raw: sources.flatMap((dataset) => dataset.raw),
  };
}

/** Sort a copy by the number of distinct displayed years with records,
 * highest first. Multiple event records within a year count as one year.
 * Break ties A–Z by the full display name using English natural ordering
 * that ignores case, accents, and punctuation. Equal counts and names keep
 * first-seen order. Group membership, event order, source names, raw rows,
 * and the unsorted input array are preserved.
 */
export function sortVenuesByRecordedYears(venues: VenueActivityRecord[]): VenueActivityRecord[] {
  const compareNames = new Intl.Collator("en-US", {
    sensitivity: "base", numeric: true, ignorePunctuation: true,
  });
  return [...venues].sort((first, second) =>
    second.recordedYearCount - first.recordedYearCount
    || compareNames.compare(first.venueName, second.venueName),
  );
}

export type VenueActivityData = {
  years: number[];
  venues: VenueActivityRecord[];
  sourceFiles: string[];
  sourceVenueCodeCount: number;
  unassignedYearRecordCount: number;
  raw: RawFestivalData[];
};
