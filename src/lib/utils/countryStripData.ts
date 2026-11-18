import * as d3 from "d3";

export type Continent = "Africa" | "Asia" | "Europe" | "North America" | "Oceania" | "South America";
export const continentOrder: Continent[] = ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"];
export const countryStripGap = 1;
export const continentStripGap = 2;

/** One source record retained for each country drawn in either country strip. */
export type RawCountryStripRow = {
  id: string | null;
  name: string;
  continent: Continent;
};

export type RawCountryStripFile = {
  countries: RawCountryStripRow[];
};

export type CountryStripData = {
  countries: RawCountryStripRow[];
  raw: RawCountryStripFile;
};

export type CountryStripCell = {
  countryKey: string;
  countryName: string;
  continent: Continent;
  x: number;
  width: number;
  raw: RawCountryStripRow;
};

export type ContinentStripCell = {
  continent: Continent;
  x: number;
  width: number;
  countries: CountryStripCell[];
};

/** Use a larger separator only when consecutive cells cross continents. */
export function getCountryStripGap(
  previous: Pick<CountryStripCell, "continent"> | undefined,
  current: Pick<CountryStripCell, "continent">,
): number {
  return previous?.continent === current.continent
    ? countryStripGap
    : continentStripGap;
}

let countryStripDataPromise: Promise<CountryStripData> | undefined;

/** Load the compact strip-only country list; failed requests can retry. */
export function loadCountryStripData(): Promise<CountryStripData> {
  if (!countryStripDataPromise) {
    countryStripDataPromise = fetch(
      `${import.meta.env.BASE_URL}data/strip-countries.json`,
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load country-strip data (${response.status}).`);
        }
        return validateCountryStripFile(await response.json());
      })
      .then((raw) => ({ countries: raw.countries, raw }))
      .catch((error: unknown) => {
        countryStripDataPromise = undefined;
        throw error;
      });
  }
  return countryStripDataPromise;
}

/** Validate the minimal schema used by the country-strip visualisations. */
export function validateCountryStripFile(value: unknown): RawCountryStripFile {
  if (!value || typeof value !== "object" || !Array.isArray((value as RawCountryStripFile).countries)) {
    throw new Error("Country-strip data must contain a countries array.");
  }
  const countries = (value as RawCountryStripFile).countries;
  if (!countries.every((country) =>
    country &&
    (typeof country.id === "string" || country.id === null) &&
    typeof country.name === "string" &&
    continentOrder.includes(country.continent),
  )) {
    throw new Error("Country-strip data contains an invalid country record.");
  }
  return { countries };
}

/** Lay out the curated country records in their continent display order. */
export function createCountryStrip(
  data: CountryStripData | undefined,
  width: number,
): CountryStripCell[] {
  if (!data || width <= 0) return [];
  const countries = [...data.countries].sort((first, second) =>
    continentOrder.indexOf(first.continent) - continentOrder.indexOf(second.continent),
  );
  const gaps = countries.map((country, index) =>
    index === 0 ? 0 : getCountryStripGap(countries[index - 1], country),
  );
  const availableWidth = Math.max(0, width - d3.sum(gaps));
  const position = d3.scaleLinear()
    .domain([0, countries.length])
    .range([0, availableWidth]);

  let gapOffset = 0;
  return countries.map((country, index) => {
    gapOffset += gaps[index];
    return {
      countryKey: country.id ?? country.name,
      countryName: country.name,
      continent: country.continent,
      x: position(index) + gapOffset,
      width: Math.max(0, position(index + 1) - position(index)),
      raw: country,
    };
  });
}

/** Group the ordered country cells into their contiguous continent spans. */
export function createContinentStrip(
  countries: CountryStripCell[],
): ContinentStripCell[] {
  const spans = new Map<Continent, CountryStripCell[]>();
  for (const country of countries) {
    const members = spans.get(country.continent) ?? [];
    members.push(country);
    spans.set(country.continent, members);
  }
  return continentOrder.flatMap((continent) => {
    const members = spans.get(continent);
    if (!members?.length) return [];
    const first = members[0];
    const last = members[members.length - 1];
    return [{
      continent,
      x: first.x,
      width: last.x + last.width - first.x,
      countries: members,
    }];
  });
}
