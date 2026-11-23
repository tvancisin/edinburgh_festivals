import type { RawFestivalData } from "./festivalData";
import type { VenueActivityData, VenueActivityRecord, VenueYearPresence } from "./venueActivity";

export const venueConnectionExcludedYear = 2020;

export type VenueYearConnection = {
  from: VenueYearPresence;
  to: VenueYearPresence;
  raw: RawFestivalData[];
};

/** Connect neighboring recorded calendar years, without crossing other missing
 * years. A missing 2020 is the sole exception: join 2019 to 2021 to follow the
 * agreed continuity rule. If 2020 has a record, use its actual circle and the
 * ordinary 2019–2020 / 2020–2021 links. This does not change filter counts,
 * invent missing circles, or claim continuous venue operation.
 */
export function createVenueYearConnections(presence: VenueYearPresence[]): VenueYearConnection[] {
  const recorded = presence.filter((year) => year.isRecorded);
  const connections: VenueYearConnection[] = [];
  for (let index = 1; index < recorded.length; index += 1) {
    const from = recorded[index - 1];
    const to = recorded[index];
    if (to.year === from.year + 1
      || (from.year === venueConnectionExcludedYear - 1 && to.year === venueConnectionExcludedYear + 1)) {
      connections.push({ from, to, raw: [...from.raw, ...to.raw] });
    }
  }
  return connections;
}

export type VenueConnectionRecord = {
  venue: VenueActivityRecord;
  eligibleRecordedYearCount: number;
  longestContinuousYearCount: number;
  raw: RawFestivalData[];
};

export type VenueConnectionFilterResult = {
  data: VenueActivityData;
  eligibleYears: number[];
  maximumYears: number;
  sliderValueText: string;
  description: string;
  statusLabel: string;
};

/** Select displayed years in their existing chronological order, excluding
 * 2020 only from connection calculations. No rows or displayed years change.
 */
export function selectVenueConnectionYears(years: number[]): number[] {
  return years.filter((year) => year !== venueConnectionExcludedYear);
}

/** Count distinct recorded eligible years and the longest uninterrupted run
 * in the eligible-year sequence. Skipping 2020 makes 2019 and 2021 adjacent,
 * regardless of whether the venue has a 2020 record. Any other missing year
 * breaks the run. Event counts within a year do not add years. Retain the
 * original venue object and all raw rows, including 2020 and unknown years.
 */
export function summarizeVenueConnections(
  venue: VenueActivityRecord,
  eligibleYears: number[],
): VenueConnectionRecord {
  let eligibleRecordedYearCount = 0;
  let longestContinuousYearCount = 0;
  let runLength = 0;
  for (const year of eligibleYears) {
    if (venue.presence.some((presence) => presence.year === year && presence.isRecorded)) {
      eligibleRecordedYearCount += 1;
      runLength += 1;
      longestContinuousYearCount = Math.max(longestContinuousYearCount, runLength);
    } else {
      runLength = 0;
    }
  }
  return { venue, eligibleRecordedYearCount, longestContinuousYearCount, raw: venue.raw };
}

/** Select whole venue columns meeting a minimum eligible-year count. In
 * continuous mode, require a run of at least that length; otherwise allow gaps.
 * Preserve the original column order, every year cell of matching venues, all
 * source metadata, and access to all raw rows on the original/returned data.
 * No event rows are removed from a matching venue, and no groups are rebuilt.
 */
export function filterVenueActivityByConnections(
  data: VenueActivityData,
  minimumYears: number,
  continuousOnly: boolean,
): VenueConnectionFilterResult {
  const eligibleYears = selectVenueConnectionYears(data.years);
  const maximumYears = eligibleYears.length;
  if (!Number.isInteger(minimumYears) || minimumYears < 1 || minimumYears > maximumYears) {
    throw new RangeError(`Minimum recorded years must be between 1 and ${maximumYears}.`);
  }
  const venues = data.venues.filter((venue) => {
    const summary = summarizeVenueConnections(venue, eligibleYears);
    return (continuousOnly ? summary.longestContinuousYearCount : summary.eligibleRecordedYearCount) >= minimumYears;
  });
  const sliderValueText = `At least ${minimumYears} ${continuousOnly ? "consecutive " : ""}recorded ${minimumYears === 1 ? "year" : "years"}, excluding 2020`;
  return {
    data: { ...data, venues }, eligibleYears, maximumYears, sliderValueText,
    description: `${sliderValueText}. ${continuousOnly ? "2019 and 2021 count as consecutive." : "Gaps are allowed."} The 2020 row remains visible but does not count toward the filter.`,
    statusLabel: `Showing ${venues.length} of ${data.venues.length} venue groups.`,
  };
}
