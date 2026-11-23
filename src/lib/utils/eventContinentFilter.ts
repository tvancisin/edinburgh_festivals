import type { Continent } from "./countryStripData";
import type { FestivalData } from "./festivalData";
import type { CountryRepresentation } from "./festivalCountries";

/** Select event records associated with countries displayed in a continent of
 * the Events strip. Use the existing resolved country keys and raw catalog
 * continent assignments, including separate UK-nation keys. Keep the supplied
 * festival selection, source order, repeated rows, event objects, and raw rows.
 * A multi-country record appears once if any resolved country belongs to this
 * continent. Missing/unmatched countries and generic UK entries without a
 * displayed cell are not assigned a continent by inference. No match is an
 * empty selection; unavailable representation remains undefined. Venue
 * coordinate filtering and hexagon grouping happen separately afterward.
 */
export function filterEventRecordsByContinent(
  representation: CountryRepresentation | undefined,
  continent: Continent,
): FestivalData[] | undefined {
  if (!representation) return undefined;
  const countryKeys = new Set<string>();
  for (const country of representation.countries) {
    if (country.raw.some((row) => row.continent === continent)) {
      countryKeys.add(country.key);
    }
  }
  return representation.relations
    .filter((relation) => relation.countryKeys.some((key) => countryKeys.has(key)))
    .map((relation) => relation.event);
}
