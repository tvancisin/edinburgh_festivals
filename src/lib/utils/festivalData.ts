import * as d3 from "d3";

export type RawFestivalData = {
  ID: string;
  Festival: string;
  Year: string;
  Website: string;
  Code: string;
  Title: string;
  Subtitle: string;
  Teaser: string;
  Description: string;
  Genre: string;
  "Genre tags": string;
  Warnings: string;
  Artist: string;
  "Artist type": string;
  "Age category": string;
  Country: string;
  "Performers #": string;
  "Last updated": string;
  Venue: string;
  "Venue code": string;
  "Venue address": string;
  "Venue postcode": string;
  "Venue website": string;
  "Venue description": string;
  "Venue accessibility": string;
  Latitude: string;
  Longitude: string;
  "Performances #": string;
  "Lowest full price": string;
  "Lowest concession price": string;
  "First performance date": string;
  "Last performance date": string;
};

export type FestivalData = {
  id: string;
  festival: string;
  year: number | null;
  website: string;
  code: string;
  title: string;
  subtitle: string;
  teaser: string;
  description: string;
  genre: string;
  genreTags: string[];
  warnings: string;
  artist: string;
  artistType: string;
  ageCategory: string;
  country: string;
  performerCount: number | null;
  lastUpdated: Date | null;
  venue: {
    name: string;
    code: string;
    address: string;
    postcode: string;
    website: string;
    description: string;
    accessibility: string;
    latitude: number | null;
    longitude: number | null;
  };
  performanceCount: number | null;
  lowestFullPrice: number | null;
  lowestConcessionPrice: number | null;
  firstPerformanceDate: Date | null;
  lastPerformanceDate: Date | null;
  raw: RawFestivalData;
};

export type FestivalDataGroup = {
  festival: string;
  events: FestivalData[];
};

export type FestivalDataByFestival = Record<string, FestivalDataGroup>;

const festivalDataCsvPath = `${import.meta.env.BASE_URL}data/festivals_2025.csv`;
const parseDate = d3.timeParse("%Y-%m-%d");
const parseTimestamp = d3.timeParse("%Y-%m-%d %H:%M:%S");

let rawFestivalDataPromise: Promise<RawFestivalData[]> | undefined;
let festivalDataPromise: Promise<FestivalData[]> | undefined;
let festivalDataByFestivalPromise: Promise<FestivalDataByFestival> | undefined;

export function loadRawFestivalData() {
  if (!rawFestivalDataPromise) {
    rawFestivalDataPromise = d3
      .csv<RawFestivalData>(festivalDataCsvPath, parseRawFestivalData)
      .catch((error) => {
        rawFestivalDataPromise = undefined;
        throw error;
      });
  }

  return rawFestivalDataPromise;
}

export function loadFestivalData() {
  if (!festivalDataPromise) {
    festivalDataPromise = loadRawFestivalData()
      .then((rows) => rows.map(toFestivalData))
      .catch((error) => {
        festivalDataPromise = undefined;
        throw error;
      });
  }

  return festivalDataPromise;
}

export function loadFestivalDataByFestival() {
  if (!festivalDataByFestivalPromise) {
    festivalDataByFestivalPromise = loadFestivalData()
      .then(groupFestivalData)
      .catch((error) => {
        festivalDataByFestivalPromise = undefined;
        throw error;
      });
  }

  return festivalDataByFestivalPromise;
}

export function groupFestivalData(
  festivalData: FestivalData[],
): FestivalDataByFestival {
  return Object.fromEntries(
    Array.from(d3.group(festivalData, (event) => event.festival)).map(
      ([festival, events]) => [festival, { festival, events }],
    ),
  );
}

export function toFestivalData(raw: RawFestivalData): FestivalData {
  return {
    id: raw.ID,
    festival: raw.Festival,
    year: parseOptionalNumber(raw.Year),
    website: raw.Website,
    code: raw.Code,
    title: raw.Title,
    subtitle: raw.Subtitle,
    teaser: raw.Teaser,
    description: raw.Description,
    genre: raw.Genre,
    genreTags: splitList(raw["Genre tags"]),
    warnings: raw.Warnings,
    artist: raw.Artist,
    artistType: raw["Artist type"],
    ageCategory: raw["Age category"],
    country: raw.Country,
    performerCount: parseOptionalNumber(raw["Performers #"]),
    lastUpdated: parseOptionalTimestamp(raw["Last updated"]),
    venue: {
      name: raw.Venue,
      code: raw["Venue code"],
      address: raw["Venue address"],
      postcode: raw["Venue postcode"],
      website: raw["Venue website"],
      description: raw["Venue description"],
      accessibility: raw["Venue accessibility"],
      latitude: parseOptionalNumber(raw.Latitude),
      longitude: parseOptionalNumber(raw.Longitude),
    },
    performanceCount: parseOptionalNumber(raw["Performances #"]),
    lowestFullPrice: parseOptionalNumber(raw["Lowest full price"]),
    lowestConcessionPrice: parseOptionalNumber(raw["Lowest concession price"]),
    firstPerformanceDate: parseOptionalDate(raw["First performance date"]),
    lastPerformanceDate: parseOptionalDate(raw["Last performance date"]),
    raw,
  };
}

function parseRawFestivalData(
  row: d3.DSVRowString<string>,
): RawFestivalData {
  return {
    ID: row.ID ?? "",
    Festival: row.Festival ?? "",
    Year: row.Year ?? "",
    Website: row.Website ?? "",
    Code: row.Code ?? "",
    Title: row.Title ?? "",
    Subtitle: row.Subtitle ?? "",
    Teaser: row.Teaser ?? "",
    Description: row.Description ?? "",
    Genre: row.Genre ?? "",
    "Genre tags": row["Genre tags"] ?? "",
    Warnings: row.Warnings ?? "",
    Artist: row.Artist ?? "",
    "Artist type": row["Artist type"] ?? "",
    "Age category": row["Age category"] ?? "",
    Country: row.Country ?? "",
    "Performers #": row["Performers #"] ?? "",
    "Last updated": row["Last updated"] ?? "",
    Venue: row.Venue ?? "",
    "Venue code": row["Venue code"] ?? "",
    "Venue address": row["Venue address"] ?? "",
    "Venue postcode": row["Venue postcode"] ?? "",
    "Venue website": row["Venue website"] ?? "",
    "Venue description": row["Venue description"] ?? "",
    "Venue accessibility": row["Venue accessibility"] ?? "",
    Latitude: row.Latitude ?? "",
    Longitude: row.Longitude ?? "",
    "Performances #": row["Performances #"] ?? "",
    "Lowest full price": row["Lowest full price"] ?? "",
    "Lowest concession price": row["Lowest concession price"] ?? "",
    "First performance date": row["First performance date"] ?? "",
    "Last performance date": row["Last performance date"] ?? "",
  };
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseOptionalDate(value: string) {
  return value ? parseDate(value) : null;
}

function parseOptionalTimestamp(value: string) {
  return value ? parseTimestamp(value) : null;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
