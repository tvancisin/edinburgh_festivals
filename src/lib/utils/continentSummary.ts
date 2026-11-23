import type { Continent, CountryStripCell, RawCountryStripRow } from "./countryStripData";
import type { RepresentedWorldCountryStripCell } from "./festivalCountries";
import type { RepresentedTicketCountryStripCell, TicketCountryRepresentation } from "./ticketCountries";

export type ContinentCountrySummary = {
  continent: Continent;
  x: number;
  width: number;
  totalCountries: number;
  countriesWithRecords: number;
  countriesWithoutRecords: number;
  countriesWithUnavailableCounts: number;
  withRecordsLabel: string;
  withoutRecordsLabel: string;
  unavailableLabel: string;
  totalLabel: string;
  accessibleLabel: string;
  countries: CountryStripCell[];
  raw: RawCountryStripRow[];
};

function formatCountries(count: number): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "country" : "countries"}`;
}

/** Group the displayed catalog cells in their existing order, counting each
 * cell once per continent. Positive record counts mean represented countries;
 * exactly zero means no records. Null, negative, and non-finite counts remain
 * unavailable, never zero. Retain every country cell and its raw catalog row.
 * These are counts of countries in the curated strip, not all world countries
 * or totals of event/ticket records. No source rows are filtered or deduplicated.
 */
export function summarizeContinentCountries<T extends CountryStripCell>(
  countries: T[],
  recordCount: (country: T) => number | null,
  recordType: "event" | "ticket" | "visitor",
): ContinentCountrySummary[] {
  const groups = new Map<Continent, T[]>();
  for (const country of countries) {
    const members = groups.get(country.continent) ?? [];
    members.push(country);
    groups.set(country.continent, members);
  }
  return [...groups].map(([continent, members]) => {
    let countriesWithRecords = 0;
    let countriesWithoutRecords = 0;
    let countriesWithUnavailableCounts = 0;
    for (const country of members) {
      const count = recordCount(country);
      if (count === null || !Number.isFinite(count) || count < 0) {
        countriesWithUnavailableCounts += 1;
      } else if (count > 0) {
        countriesWithRecords += 1;
      } else {
        countriesWithoutRecords += 1;
      }
    }
    const recordLabel = recordType === "visitor" ? "visitors" : `${recordType} records`;
    const withRecordsLabel = `${formatCountries(countriesWithRecords)} with ${recordLabel}`;
    const withoutRecordsLabel = `${formatCountries(countriesWithoutRecords)} without ${recordLabel}`;
    const unavailableLabel = `${formatCountries(countriesWithUnavailableCounts)} with unavailable counts`;
    const totalLabel = `${formatCountries(members.length)} shown in this strip.`;
    const first = members[0];
    const last = members[members.length - 1];
    return {
      continent,
      x: first.x,
      width: last.x + last.width - first.x,
      totalCountries: members.length,
      countriesWithRecords,
      countriesWithoutRecords,
      countriesWithUnavailableCounts,
      withRecordsLabel,
      withoutRecordsLabel,
      unavailableLabel,
      totalLabel,
      accessibleLabel: `${continent}: ${withRecordsLabel}; ${withoutRecordsLabel}${countriesWithUnavailableCounts ? `; ${unavailableLabel}` : ""}. ${totalLabel}`,
      countries: members,
      raw: members.map((country) => country.raw),
    };
  });
}

/** Event cells already distinguish zero counts from unavailable matches. */
export function createEventContinentSummaries(
  countries: RepresentedWorldCountryStripCell[],
): ContinentCountrySummary[] {
  return summarizeContinentCountries(countries, (country) => country.eventCount, "event");
}

/** Read ticket aggregates directly so the strip's visual zero fallback does
 * not turn an unloaded or unmatched aggregate into a known zero count.
 */
export function createTicketContinentSummaries(
  countries: RepresentedTicketCountryStripCell[],
  representation: TicketCountryRepresentation | undefined,
): ContinentCountrySummary[] {
  return summarizeContinentCountries(
    countries,
    (country) => representation?.byKey.get(country.countryKey)?.purchaseRecordCount ?? null,
    "visitor",
  );
}

/** Resolve the active continent again when filtering refreshes the summaries. */
export function selectContinentSummary(
  summaries: ContinentCountrySummary[],
  continent: Continent | null,
): ContinentCountrySummary | null {
  return summaries.find((summary) => summary.continent === continent) ?? null;
}
