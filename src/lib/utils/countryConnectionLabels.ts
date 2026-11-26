import type { Continent } from "./countryStripData";
import type { CountryRecordSummary } from "./countrySummary";

type ConnectionEndpoint = {
  countryKey: string;
  targetX: number;
  targetY: number;
};

export type CountryConnectionLabel = CountryRecordSummary & {
  countNumberLabel: string;
  labelX: number;
  labelY: number;
  availableWidth: number;
};

/** Select the largest positive, connected country count in each continent.
 * Ties retain the first country in the existing strip order. Continents without
 * positive connections have no label. Counts and retained raw catalog rows are
 * unchanged; the full country summaries and connections remain available.
 * Place labels six pixels beyond the line endpoints, toward the map, reserving
 * a center gap so the two strips' labels can wrap without overlapping each other.
 */
export function createCountryConnectionLabels(
  countries: CountryRecordSummary[],
  connections: ConnectionEndpoint[],
  side: "left" | "right",
  width: number,
): CountryConnectionLabel[] {
  const endpoints = new Map(connections.map((connection) => [connection.countryKey, connection]));
  const leaders = new Map<Continent, CountryRecordSummary>();
  for (const country of countries) {
    if (country.recordCount === null || country.recordCount <= 0 || !endpoints.has(country.countryKey)) continue;
    const leader = leaders.get(country.continent);
    if (!leader || country.recordCount > leader.recordCount!) {
      leaders.set(country.continent, country);
    }
  }
  return [...leaders.values()].map((country) => {
    const endpoint = endpoints.get(country.countryKey)!;
    const labelX = endpoint.targetX + (side === "left" ? 6 : -6);
    return {
      ...country,
      countNumberLabel: country.recordCount!.toLocaleString("en-US"),
      labelX,
      labelY: endpoint.targetY,
      availableWidth: Math.max(0, side === "left"
        ? width / 2 - labelX - 6
        : labelX - width / 2 - 6),
    };
  });
}
