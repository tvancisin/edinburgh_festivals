import type { CountryStripCell } from "./countryStripData";
import type { ContinentCountrySummary } from "./continentSummary";
import type { RepresentedWorldCountryStripCell } from "./festivalCountries";
import type { RepresentedTicketCountryStripCell, TicketCountryRepresentation } from "./ticketCountries";

export type CountryRecordSummary = CountryStripCell & {
  recordCount: number | null;
  hasRecords: boolean;
  countLabel: string;
  accessibleLabel: string;
};

export type StripDetail =
  | { kind: "country"; summary: CountryRecordSummary }
  | { kind: "continent"; summary: ContinentCountrySummary };

/** Retain every displayed country and raw catalog row, adding the exact count
 * without aggregation, sorting, or deduplication. Missing and invalid values
 * remain unavailable, distinct from zero. Visitor labels use the source
 * definition, confirmed by the user, of one unique visitor per ticket-export row.
 */
export function createCountryRecordSummaries<T extends CountryStripCell>(
  countries: T[],
  getCount: (country: T) => number | null,
  unit: "event records" | "visitors",
): CountryRecordSummary[] {
  return countries.map((country) => {
    const value = getCount(country);
    const recordCount = value !== null && Number.isFinite(value) && value >= 0 ? value : null;
    const countUnit = recordCount === 1
      ? unit === "visitors" ? "visitor" : "event record"
      : unit;
    const countLabel = recordCount === null
      ? "Count unavailable"
      : `${recordCount.toLocaleString("en-US")} ${countUnit}`;
    return {
      ...country,
      recordCount,
      hasRecords: recordCount !== null && recordCount > 0,
      countLabel,
      accessibleLabel: `${country.countryName}: ${countLabel}`,
    };
  });
}

export function createEventCountrySummaries(
  countries: RepresentedWorldCountryStripCell[],
): CountryRecordSummary[] {
  return createCountryRecordSummaries(countries, (country) => country.eventCount, "event records");
}

/** Read aggregates directly to avoid treating unloaded ticket data as zero. */
export function createVisitorCountrySummaries(
  countries: RepresentedTicketCountryStripCell[],
  representation: TicketCountryRepresentation | undefined,
): CountryRecordSummary[] {
  return createCountryRecordSummaries(
    countries,
    (country) => representation?.byKey.get(country.countryKey)?.purchaseRecordCount ?? null,
    "visitors",
  );
}

export function countryDetailKey(key: string): string {
  return `country:${key}`;
}

export function continentDetailKey(continent: string): string {
  return `continent:${continent}`;
}

/** Resolve current values again after filtering or a data load updates them. */
export function selectStripDetail(
  continents: ContinentCountrySummary[],
  countries: CountryRecordSummary[],
  key: string | null,
): StripDetail | null {
  const country = countries.find((item) => countryDetailKey(item.countryKey) === key);
  if (country) return { kind: "country", summary: country };
  const continent = continents.find((item) => continentDetailKey(item.continent) === key);
  return continent ? { kind: "continent", summary: continent } : null;
}

/** One Tab stop enters the country list; arrow keys expose every country in
 * its displayed order without adding hundreds of stops to the page's Tab order.
 */
export function selectTabCountry(
  countries: CountryRecordSummary[],
  key: string | null,
): CountryRecordSummary | null {
  return countries.find((country) => country.countryKey === key) ?? countries[0] ?? null;
}

export function moveCountryFocus(
  countries: CountryRecordSummary[],
  currentKey: string,
  key: string,
): CountryRecordSummary | null {
  const currentIndex = countries.findIndex((country) => country.countryKey === currentKey);
  if (currentIndex < 0) return null;
  if (key === "Home") return countries[0];
  if (key === "End") return countries[countries.length - 1];
  if (key === "ArrowDown") return countries[Math.min(countries.length - 1, currentIndex + 1)];
  if (key === "ArrowUp") return countries[Math.max(0, currentIndex - 1)];
  return null;
}
