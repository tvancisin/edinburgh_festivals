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

export type FestivalDataWithCoordinates = FestivalData & {
  venue: FestivalData["venue"] & {
    latitude: number;
    longitude: number;
  };
};

export type FestivalDataGroup = {
  festival: string;
  events: FestivalData[];
};

export type FestivalVenueGroup = [venueCode: string, events: FestivalData[]];

export type FestivalDataset = {
  fileName: string;
  events: FestivalData[];
  raw: RawFestivalData[];
};

export type FestivalDataByFestival = Record<string, FestivalDataGroup>;

// Add CSV filenames here to include them in the parallel load and venue logs.
// Files live in public/data; original download URLs, dates, and versions were not supplied.
export const festivalDataFiles = [
  "2012.csv", "2013.csv", "2014.csv", "2015.csv", "2016.csv",
  "2017.csv", "2018.csv", "2019.csv", "2020.csv", "2021.csv",
  "2022.csv", "2023.csv", "2024.csv", "2025.csv", "2026.csv",
];
export const defaultFestivalDataFile = "2025.csv";
const parseDate = d3.timeParse("%Y-%m-%d");
const parseTimestamp = d3.timeParse("%Y-%m-%d %H:%M:%S");

const rawFestivalDataPromises = new Map<string, Promise<RawFestivalData[]>>();
let festivalDatasetsPromise: Promise<FestivalDataset[]> | undefined;
let festivalDataByFestivalPromise: Promise<FestivalDataByFestival> | undefined;

/** Cache each CSV separately so a failed file can retry without reloading successful files. */
export function loadRawFestivalData(fileName = defaultFestivalDataFile): Promise<RawFestivalData[]> {
  let promise = rawFestivalDataPromises.get(fileName);
  if (!promise) {
    promise = d3
      .csv<RawFestivalData>(`${import.meta.env.BASE_URL}data/${fileName}`, parseRawFestivalData)
      .catch((error) => {
        rawFestivalDataPromises.delete(fileName);
        throw error;
      });
    rawFestivalDataPromises.set(fileName, promise);
  }

  return promise;
}

/** Load all configured files concurrently, keeping their rows separate by filename.
 * Log venue-code groups per file and across all files once every load succeeds.
 */
export function loadFestivalDatasets(): Promise<FestivalDataset[]> {
  if (!festivalDatasetsPromise) {
    festivalDatasetsPromise = Promise.all(
      festivalDataFiles.map(async (fileName) =>
        createFestivalDataset(fileName, await loadRawFestivalData(fileName)),
      ),
    )
      .then((datasets) => {
        for (const dataset of datasets) {
          const uniqueVenues = groupFestivalDataByVenue(dataset.events);
          console.log(`Unique venues (${dataset.fileName}), grouped by venue code:`, uniqueVenues);
        }
        const uniqueVenues = groupFestivalDataByVenue(combineFestivalDatasets(datasets));
        console.log("Unique venues (all files), grouped by venue code:", uniqueVenues);
        return datasets;
      })
      .catch((error) => {
        festivalDatasetsPromise = undefined;
        throw error;
      });
  }

  return festivalDatasetsPromise;
}

/** Existing callers keep the 2025 map data; another configured file can be requested explicitly. */
export function loadFestivalData(fileName = defaultFestivalDataFile): Promise<FestivalData[]> {
  return loadFestivalDatasets().then((datasets) => selectFestivalDataset(datasets, fileName).events);
}

/** Parse each row while retaining the source filename and unmodified raw rows. */
export function createFestivalDataset(fileName: string, raw: RawFestivalData[]): FestivalDataset {
  return { fileName, events: raw.map(toFestivalData), raw };
}

/** Select one configured dataset explicitly, rather than mixing years in existing views. */
export function selectFestivalDataset(datasets: FestivalDataset[], fileName: string): FestivalDataset {
  const dataset = datasets.find((item) => item.fileName === fileName);
  if (!dataset) throw new Error(`Add ${fileName} to festivalDataFiles before loading it.`);
  return dataset;
}

/** Combine events in file-list and source-row order for venue exploration only.
 * No rows are deduplicated; the per-file datasets and every event's raw row remain available.
 */
export function combineFestivalDatasets(datasets: FestivalDataset[]): FestivalData[] {
  return datasets.flatMap((dataset) => dataset.events);
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

/** One group per venue code, retaining all events and raw rows. Blank codes share a group. */
export function groupFestivalDataByVenue(events: FestivalData[]): FestivalVenueGroup[] {
  return d3.groups(events, (event) => event.venue.code);
}

/**
 * Flattens festival groups without changing their group or event order.
 */
export function flattenFestivalDataByFestival(
  festivalDataByFestival: FestivalDataByFestival,
): FestivalData[] {
  return Object.values(festivalDataByFestival).flatMap(
    (festivalGroup) => festivalGroup.events,
  );
}

/**
 * Returns the supplied events with valid venue coordinates. Events without a
 * latitude or longitude remain available in the original data collection.
 */
export function filterFestivalDataWithCoordinates(
  festivalData: FestivalData[],
): FestivalDataWithCoordinates[] {
  return festivalData.filter(
    (event): event is FestivalDataWithCoordinates =>
      event.venue.latitude !== null && event.venue.longitude !== null,
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
