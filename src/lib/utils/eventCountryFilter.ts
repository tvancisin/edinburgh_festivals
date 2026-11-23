import type { RawCountryStripRow } from "./countryStripData";
import type { FestivalData } from "./festivalData";
import type { CountryRepresentation } from "./festivalCountries";

/** Preview one Events-strip country within the supplied festival selection.
 * Resolve its key through the existing aggregate's retained catalog rows,
 * matching ID, name, and continent exactly. This reuses the strip's country
 * assignments, including separate UK-nation keys, without inferring a nation
 * from generic UK records. Select each related source record once, retaining
 * repeated rows, order, event objects, and raw rows. An empty match remains
 * empty; unavailable representation remains undefined. Venue coordinates and
 * hexagon grouping are handled separately by the existing map pipeline.
 */
export function filterEventRecordsByCountry(
  representation: CountryRepresentation | undefined,
  country: RawCountryStripRow,
): FestivalData[] | undefined {
  if (!representation) return undefined;
  const countryKeys = new Set<string>();
  for (const target of representation.countries) {
    if (target.raw.some((row) =>
      row.id === country.id && row.name === country.name && row.continent === country.continent,
    )) {
      countryKeys.add(target.key);
    }
  }
  return representation.relations
    .filter((relation) => relation.countryKeys.some((key) => countryKeys.has(key)))
    .map((relation) => relation.event);
}
