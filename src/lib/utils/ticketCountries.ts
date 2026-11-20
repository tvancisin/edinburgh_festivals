import * as d3 from "d3";
import {
  continentOrder,
  createCountryStrip,
  getCountryStripGap,
  type Continent,
  type CountryStripCell,
  type CountryStripData,
  type RawCountryStripRow,
} from "./countryStripData";
import type { RawTicketData, TicketData } from "./ticketData";

/** The display catalog adds generic UK records without assigning them to a nation. */
const ticketUnitedKingdomCountry: RawCountryStripRow = {
  id: "ticket:united-kingdom",
  name: "United Kingdom",
  continent: "Europe",
};

/** Explicit source-label aliases only; unmatched values remain unmatched. */
const ticketCountryAliasNames: Record<string, string> = {
  "BRUNEI DARUSSALAM": "Brunei",
  "CZECH REPUBLIC": "Czechia",
  "DOMINICAN REPUBLIC": "Dominican Rep.",
  "HOLY SEE": "Vatican",
  "REPUBLIC OF KOREA": "South Korea",
  "RUSSIAN FEDERATION": "Russia",
  "SAINT KITTS AND NEVIS": "St. Kitts and Nevis",
  SWAZILAND: "eSwatini",
  TURKIYE: "Turkey",
  "UNITED KINGDOM": "United Kingdom",
  "UNITED STATES": "United States of America",
};

export const ticketCountryOpacity = {
  noKnownPositiveTickets: 0.1,
  minimumPositiveTickets: 0.35,
  maximumTickets: 1,
};

/** Shared geometry keeps the Tickets rectangles and their connections aligned. */
export const ticketCountryStripLayout = {
  rightInset: 2,
  continentWidth: 30,
  countryWidth: 20,
  contentOffset: 10,
  titleHeight: 28,
  titleWidth: 60,
  verticalPadding: 2,
};

export type TicketCountryStripData = {
  countries: RawCountryStripRow[];
  raw: CountryStripData["raw"];
};

export type TicketCountryTarget = {
  key: string;
  name: string;
  continent: Continent;
  catalogRaw: RawCountryStripRow;
};

export type TicketCountryCatalog = {
  targets: Map<string, TicketCountryTarget>;
  aliases: Map<string, string>;
  raw: CountryStripData;
};

export type TicketCountryCount = TicketCountryTarget & {
  purchaseRecordCount: number;
  ticketRows: TicketData[];
  raw: RawTicketData[];
  fillOpacity: number;
};

export type TicketCountryRepresentation = {
  countries: TicketCountryCount[];
  byKey: Map<string, TicketCountryCount>;
  purchaseRecordCount: number;
  missingCountryRecordCount: number;
  unmatchedCountryRecordCount: number;
  maximumPurchaseRecordCount: number;
  unmatchedValues: {
    value: string;
    purchaseRecordCount: number;
    raw: RawTicketData[];
  }[];
  raw: RawTicketData[];
};

export type RepresentedTicketCountryStripCell = CountryStripCell & {
  purchaseRecordCount: number;
  fillOpacity: number;
};

/** Add a generic UK cell for ticket data without altering strip-countries.json. */
export function createTicketCountryStripData(
  data: CountryStripData | undefined,
): TicketCountryStripData | undefined {
  if (!data) return undefined;
  return {
    countries: [...data.countries, ticketUnitedKingdomCountry],
    raw: data.raw,
  };
}

/** Build a country/continent catalog from the curated strip list and its UK addition. */
export function createTicketCountryCatalog(
  data: CountryStripData,
): TicketCountryCatalog {
  const stripData = createTicketCountryStripData(data)!;
  const targets = new Map<string, TicketCountryTarget>();
  const aliases = new Map<string, string>();

  for (const country of stripData.countries) {
    const key = country.id ?? country.name;
    const target = {
      key,
      name: country.name,
      continent: country.continent,
      catalogRaw: country,
    };
    targets.set(key, target);
    aliases.set(normalizeTicketCountryName(country.name), key);
  }

  for (const [alias, targetName] of Object.entries(ticketCountryAliasNames)) {
    const targetKey = aliases.get(normalizeTicketCountryName(targetName));
    if (targetKey) aliases.set(alias, targetKey);
  }

  return { targets, aliases, raw: data };
}

/** Normalize values for catalog matching only; raw COUNTRY values remain unchanged. */
export function normalizeTicketCountryName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase()
    .replace(/[().]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Count each ticket CSV record once at its matched country. ORDER_QUANTITY is
 * retained only on raw rows and does not affect country representation.
 */
export function aggregateTicketCountryRepresentation(
  tickets: TicketData[],
  catalog: TicketCountryCatalog,
): TicketCountryRepresentation {
  const rowsByKey = new Map<string, TicketData[]>();
  const unmatched = new Map<string, TicketData[]>();
  let missingCountryRecordCount = 0;

  for (const ticket of tickets) {
    const country = ticket.country.trim();
    if (!country) {
      missingCountryRecordCount += 1;
      continue;
    }

    const key = catalog.aliases.get(normalizeTicketCountryName(country));
    if (!key) {
      const rows = unmatched.get(country) ?? [];
      rows.push(ticket);
      unmatched.set(country, rows);
      continue;
    }

    const rows = rowsByKey.get(key) ?? [];
    rows.push(ticket);
    rowsByKey.set(key, rows);
  }

  const countries = [...catalog.targets.values()].map((target) => {
    const ticketRows = rowsByKey.get(target.key) ?? [];
    return {
      ...target,
      purchaseRecordCount: ticketRows.length,
      ticketRows,
      raw: ticketRows.map((ticket) => ticket.raw),
      fillOpacity: ticketCountryOpacity.noKnownPositiveTickets,
    } satisfies TicketCountryCount;
  });
  const maximumPurchaseRecordCount =
    d3.max(countries, (country) => country.purchaseRecordCount) ?? 0;
  const representedCountries = countries.map((country) => ({
    ...country,
    fillOpacity: getTicketCountryFillOpacity(
      country.purchaseRecordCount,
      maximumPurchaseRecordCount,
    ),
  }));
  const unmatchedValues = [...unmatched].map(([value, ticketRows]) =>
    createUnmatchedTicketCountryValue(value, ticketRows),
  );
  return {
    countries: representedCountries,
    byKey: new Map(representedCountries.map((country) => [country.key, country])),
    purchaseRecordCount: tickets.length,
    missingCountryRecordCount,
    unmatchedCountryRecordCount: d3.sum(
      unmatchedValues,
      (value) => value.purchaseRecordCount,
    ),
    maximumPurchaseRecordCount,
    unmatchedValues,
    raw: tickets.map((ticket) => ticket.raw),
  };
}

/** Use a square-root scale so lower-frequency countries remain visible. */
export function getTicketCountryFillOpacity(
  purchaseRecordCount: number,
  maximumPurchaseRecordCount: number,
): number {
  if (
    purchaseRecordCount <= 0 ||
    maximumPurchaseRecordCount <= 0
  ) {
    return ticketCountryOpacity.noKnownPositiveTickets;
  }

  return (
    ticketCountryOpacity.minimumPositiveTickets +
    Math.sqrt(purchaseRecordCount / maximumPurchaseRecordCount) *
      (ticketCountryOpacity.maximumTickets -
        ticketCountryOpacity.minimumPositiveTickets)
  );
}

/** Retain count-based styling and sort countries within their fixed continent groups. */
export function addTicketCountryRepresentationToStrip(
  countries: CountryStripCell[],
  representation: TicketCountryRepresentation | undefined,
): RepresentedTicketCountryStripCell[] {
  const representedCountries = countries.map((country) => {
    const matched = representation?.byKey.get(country.countryKey);
    return {
      ...country,
      purchaseRecordCount: matched?.purchaseRecordCount ?? 0,
      fillOpacity:
        matched?.fillOpacity ?? ticketCountryOpacity.noKnownPositiveTickets,
    };
  });
  const countriesByContinent = new Map<Continent, RepresentedTicketCountryStripCell[]>();
  for (const country of representedCountries) {
    const members = countriesByContinent.get(country.continent) ?? [];
    members.push(country);
    countriesByContinent.set(country.continent, members);
  }
  const orderedCountries = continentOrder.flatMap((continent) => {
    const members = countriesByContinent.get(continent) ?? [];
    return members.sort((first, second) => {
      return second.purchaseRecordCount - first.purchaseRecordCount;
    });
  });
  const gaps = orderedCountries.map((country, index) =>
    index === 0 ? 0 : getCountryStripGap(orderedCountries[index - 1], country),
  );
  const availableWidth = Math.max(0, heightForCountries(countries) - d3.sum(gaps));
  const position = d3
    .scaleLinear()
    .domain([0, orderedCountries.length])
    .range([0, availableWidth]);
  let gapOffset = 0;

  return orderedCountries.map((country, index) => {
    gapOffset += gaps[index];
    return {
      ...country,
      x: position(index) + gapOffset,
      width: Math.max(0, position(index + 1) - position(index)),
    };
  });
}

/** Create the ticket strip's responsive cells from its augmented country catalog. */
export function createTicketCountryStrip(
  data: CountryStripData | undefined,
  representation: TicketCountryRepresentation | undefined,
  height: number,
): RepresentedTicketCountryStripCell[] {
  const { titleHeight, verticalPadding } = ticketCountryStripLayout;
  return addTicketCountryRepresentationToStrip(
    createCountryStrip(
      createTicketCountryStripData(data),
      Math.max(0, height - titleHeight - verticalPadding * 2),
    ),
    representation,
  ).map((country) => ({
    ...country,
    x: country.x + titleHeight + verticalPadding,
  }));
}

/** Describe the non-visual equivalent of the opacity encoding. */
export function describeTicketCountryRepresentation(
  representation: TicketCountryRepresentation,
): string {
  const representedCountries = representation.countries
    .filter((country) => country.purchaseRecordCount > 0)
    .sort(
      (first, second) =>
        second.purchaseRecordCount - first.purchaseRecordCount,
    );
  const leader = representedCountries[0];
  return (
    `${representation.purchaseRecordCount.toLocaleString("en-GB")} ticket-data entries; ` +
    `${representedCountries.length} represented countries have one or more entries. ` +
    (leader
      ? `Largest: ${leader.name}, ${formatTicketCountryRecordCount(leader.purchaseRecordCount)}. `
      : "No represented country has any entries. ") +
    `${representation.unmatchedCountryRecordCount.toLocaleString("en-GB")} entries have an unmatched country.`
  );
}

function createUnmatchedTicketCountryValue(value: string, ticketRows: TicketData[]) {
  return {
    value,
    purchaseRecordCount: ticketRows.length,
    raw: ticketRows.map((ticket) => ticket.raw),
  };
}

export function formatTicketCountryRecordCount(value: number): string {
  return `${value.toLocaleString("en-GB")} ticket-data ${value === 1 ? "entry" : "entries"}`;
}

function heightForCountries(countries: CountryStripCell[]): number {
  return d3.max(countries, (country) => country.x + country.width) ?? 0;
}
