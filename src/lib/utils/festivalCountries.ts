import * as d3 from "d3";
import type { FestivalData, FestivalDataByFestival, FestivalDataGroup, RawFestivalData } from "./festivalData";
import type { RawWorldHex, WorldHexCell, WorldHexData, WorldHexLayout, WorldHexPanelLayout } from "./worldHexMap";

export type CountryTarget = {
  key: string;
  name: string;
  hasHexagons: boolean;
  raw: RawWorldHex[];
};

export type CountryCatalog = {
  targets: Map<string, CountryTarget>;
  aliases: Map<string, string>;
};

export type EventCountryRelation = {
  event: FestivalData;
  countryKeys: string[];
  unmatchedValues: string[];
  hasDeclaredCountry: boolean;
  raw: RawFestivalData;
};

export type CountryEventCount = CountryTarget & {
  eventCount: number;
  fillOpacity: number;
  eventRows: RawFestivalData[];
};

export type CountryRepresentation = {
  countries: CountryEventCount[];
  byKey: Map<string, CountryEventCount>;
  eventCount: number;
  missingCountryCount: number;
  unmatchedEventCount: number;
  unmatchedValues: { value: string; eventCount: number; raw: RawFestivalData[] }[];
  maximumEventCount: number;
  relations: EventCountryRelation[];
  raw: RawFestivalData[];
};

export type RepresentedWorldHexCell = WorldHexCell & {
  eventCount: number | null;
  fillOpacity: number;
  accessibleLabel: string;
  eventCountLabel: string;
};

export type RepresentedWorldHexLayout = Omit<WorldHexLayout, "panels"> & {
  panels: (Omit<WorldHexPanelLayout, "cells"> & { cells: RepresentedWorldHexCell[] })[];
};

export type CountryOpacityBand = {
  maximumEventCount: number;
  opacity: number;
};

/** Adjust the fixed count ranges used by countries other than England and Scotland. */
export const countryOpacity = {
  noRecords: 0.1,
  englandAndScotland: 1,
  bands: [
    { maximumEventCount: 19, opacity: 0.35 },
    { maximumEventCount: 111, opacity: 0.55 },
    { maximumEventCount: 300, opacity: 0.75 },
    { maximumEventCount: Infinity, opacity: 0.95 },
  ] satisfies CountryOpacityBand[],
  maximum: 1,
};

const maximumOpacityCountryKeys = new Set(["826:england", "826:scotland"]);

const ukNationKeys: Record<string, string> = {
  SCOTLAND: "826:scotland",
  ENGLAND: "826:england",
  WALES: "826:wales",
  "NORTHERN IRELAND": "826:northern-ireland",
};

// Explicit spelling aliases map to ISO numeric IDs, without geographic inference.
export const festivalCountryAliases: Record<string, string> = {
  UK: "826",
  "UNITED KINGDOM": "826",
  "UNITED STATES": "840",
  USA: "840",
  "KOREA, REPUBLIC OF": "410",
  "KOREA REPUBLIC OF": "410",
  "SOUTH KOREA": "410",
  "TAIWAN REPUBLIC OF CHINA": "158",
  "CZECH REPUBLIC": "203",
  "NORTH MACEDONIA": "807",
  "BOLIVARIAN REPUBLIC OF VENEZUELA": "862",
};

/** Normalize comparison keys only; retain source Country strings on raw rows. */
export function normalizeCountryName(value: string): string {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .trim().toUpperCase().replace(/[().]/g, "").replace(/\s+/g, " ");
}

/** UK nation names have separate join keys; all other cells join by country ID.
 * Hawaii shares the US count. Unspecified UK rows never imply a UK nation.
 */
export function getHexCountryKey(cell: Pick<WorldHexCell, "countryId" | "countryName">): string {
  if (cell.countryId === "826") {
    const nation = normalizeCountryName(cell.countryName).replace(/ UNITED KINGDOM$/, "");
    return ukNationKeys[nation] ?? "826";
  }
  return cell.countryId ?? normalizeCountryName(cell.countryName);
}

/** Build a join catalog from the loaded hexes, retaining every contributing cell. */
export function createCountryCatalog(data: WorldHexData): CountryCatalog {
  const targets = new Map<string, CountryTarget>();
  const aliases = new Map<string, string>();
  for (const hex of [...data.americasHexes, ...data.restHexes]) {
    const key = getHexCountryKey(hex);
    const target = targets.get(key);
    if (target) target.raw.push(hex.raw);
    else targets.set(key, { key, name: hex.countryName, hasHexagons: true, raw: [hex.raw] });
    aliases.set(normalizeCountryName(hex.countryName), key);
  }
  targets.set("826", {
    key: "826", name: "United Kingdom (nation unspecified)", hasHexagons: false, raw: [],
  });
  for (const [alias, key] of Object.entries(festivalCountryAliases)) {
    if (targets.has(key)) aliases.set(alias, key);
  }
  for (const [nation, key] of Object.entries(ukNationKeys)) {
    if (!targets.has(key)) continue;
    aliases.set(nation, key);
    aliases.set(`UNITED KINGDOM - ${nation}`, key);
    aliases.set(`UK - ${nation}`, key);
  }
  return { targets, aliases };
}

/** Split multi-country fields on commas, slashes, or semicolons. Protect the
 * official single-country spelling KOREA, REPUBLIC OF before comma splitting.
 * Blank and explicitly undeclared values contribute no country assignment.
 */
export function splitEventCountryValues(value: string): string[] {
  const missing = new Set(["", "COUNTRY NOT DECLARED", "NOT DECLARED", "UNKNOWN", "N/A"]);
  if (missing.has(normalizeCountryName(value))) return [];
  return value.replace(/korea\s*,\s*republic of/gi, "South Korea")
    .replace(/\bN\/A\b/gi, "COUNTRY NOT DECLARED")
    .split(/[,/;]/).map((part) => part.trim())
    .filter((part) => !missing.has(normalizeCountryName(part)));
}

/** Count a source event row at most once per resolved country/nation, retaining
 * every event row, including duplicate IDs. Unknown labels remain reportable.
 */
export function relateEventCountries(event: FestivalData, catalog: CountryCatalog): EventCountryRelation {
  const values = splitEventCountryValues(event.country);
  const keys = new Set<string>();
  const unmatched = new Set<string>();
  for (const value of values) {
    const key = catalog.aliases.get(normalizeCountryName(value));
    if (key) keys.add(key);
    else unmatched.add(value);
  }
  return {
    event, countryKeys: [...keys], unmatchedValues: [...unmatched],
    hasDeclaredCountry: values.length > 0, raw: event.raw,
  };
}

/** Selected arcs take precedence over previews. No venue-coordinate filtering
 * applies to country counts; resetting selection restores every loaded row.
 */
export function selectFestivalEvents(
  groups: FestivalDataByFestival | undefined,
  selected?: FestivalDataGroup,
  preview?: FestivalDataGroup,
): FestivalData[] | undefined {
  if (selected) return selected.events;
  if (preview) return preview.events;
  return groups ? Object.values(groups).flatMap((group) => group.events) : undefined;
}

/** Aggregate one full count per country per row; multi-country totals can exceed
 * row totals. England and Scotland use full opacity; other positive counts use
 * four fixed count ranges. Generic UK rows are listed separately and never
 * shaded as nations.
 */
export function aggregateCountryRepresentation(events: FestivalData[], catalog: CountryCatalog): CountryRepresentation {
  const relations = events.map((event) => relateEventCountries(event, catalog));
  const rowsByKey = new Map<string, RawFestivalData[]>();
  const unmatched = new Map<string, RawFestivalData[]>();
  for (const relation of relations) {
    for (const key of relation.countryKeys) {
      const rows = rowsByKey.get(key) ?? [];
      rows.push(relation.raw);
      rowsByKey.set(key, rows);
    }
    for (const value of relation.unmatchedValues) {
      const rows = unmatched.get(value) ?? [];
      rows.push(relation.raw);
      unmatched.set(value, rows);
    }
  }
  const maximumEventCount = d3.max([...catalog.targets.values()]
    .filter((target) => target.hasHexagons), (target) => rowsByKey.get(target.key)?.length ?? 0) ?? 0;
  const countries = [...catalog.targets.values()].map((target): CountryEventCount => {
    const eventRows = rowsByKey.get(target.key) ?? [];
    return {
      ...target, eventRows, eventCount: eventRows.length,
      fillOpacity: getCountryFillOpacity(target.key, eventRows.length),
    };
  }).sort((a, b) => b.eventCount - a.eventCount || a.name.localeCompare(b.name, "en"));
  return {
    countries, byKey: new Map(countries.map((country) => [country.key, country])),
    eventCount: events.length,
    missingCountryCount: relations.filter((relation) => !relation.hasDeclaredCountry).length,
    unmatchedEventCount: relations.filter((relation) => relation.unmatchedValues.length > 0).length,
    unmatchedValues: [...unmatched].map(([value, raw]) => ({ value, eventCount: raw.length, raw })),
    maximumEventCount, relations, raw: events.map((event) => event.raw),
  };
}

/** Keep the two highest-volume UK nations distinct from the four country bands. */
export function getCountryFillOpacity(
  countryKey: string,
  eventCount: number,
): number {
  if (eventCount <= 0) return countryOpacity.noRecords;
  if (maximumOpacityCountryKeys.has(countryKey)) return countryOpacity.englandAndScotland;
  return countryOpacity.bands.find((band) => eventCount <= band.maximumEventCount)?.opacity ??
    countryOpacity.maximum;
}

export function formatCountryEventCount(count: number): string {
  return `${count.toLocaleString("en-US")} related event ${count === 1 ? "record" : "records"}`;
}

/** Add presentation values without modifying geometry, raw cells, or counts. */
export function addCountryRepresentationToLayout(
  layout: WorldHexLayout | undefined,
  representation: CountryRepresentation | undefined,
  scope: string,
): RepresentedWorldHexLayout | undefined {
  if (!layout) return undefined;
  return {
    ...layout,
    panels: layout.panels.map((panel) => ({
      ...panel,
      cells: panel.cells.map((cell) => {
        const count = representation?.byKey.get(getHexCountryKey(cell))?.eventCount ?? 0;
        const eventCountLabel = representation
          ? `${formatCountryEventCount(count)} · ${scope}`
          : "Country counts are unavailable.";
        return {
          ...cell,
          eventCount: representation ? count : null,
          fillOpacity: representation
            ? representation.byKey.get(getHexCountryKey(cell))?.fillOpacity ?? countryOpacity.noRecords
            : countryOpacity.noRecords,
          eventCountLabel, accessibleLabel: `${cell.countryName}: ${eventCountLabel}`,
        };
      }),
    })),
  };
}

/** Concise written equivalent; detailed counts remain available in the table. */
export function describeCountryRepresentation(data: CountryRepresentation, scope: string): string {
  const represented = data.countries.filter((country) => country.hasHexagons && country.eventCount > 0);
  const leader = represented[0];
  const uk = data.byKey.get("826")?.eventCount ?? 0;
  return `${scope}: ${data.eventCount.toLocaleString("en-US")} event records; ` +
    `${represented.length} countries or UK nations represented on the map. ` +
    (leader ? `Largest count: ${leader.name}, ${formatCountryEventCount(leader.eventCount)}. ` : "No mapped country associations. ") +
    `${data.missingCountryCount.toLocaleString("en-US")} records have no declared country; ` +
    `${data.unmatchedEventCount} have unmatched country values. ` +
    `${uk} UK records do not specify a nation and are listed separately.`;
}

/** Positive rows only for the concise table; zero counts remain in the full
 * aggregate and are exposed by each hexagon's accessible name and popup.
 */
export function listRepresentedCountries(data: CountryRepresentation): CountryEventCount[] {
  return data.countries.filter((country) => country.eventCount > 0);
}
