# Festival country representation

The source is the existing `public/data/festivals_2025.csv`, containing 5,544
source event rows for 2025. Its original CSV download URL, download date, and
export version were not supplied. Event IDs in the file include Edinburgh
Festival City API URLs; these identify records, not a verified download URL
for this particular CSV. This method was implemented on November 3, 2026.
The CSV is loaded by the existing cached `festivalData.ts` loader without
editing it. `FestivalData.country` retains the Country string and each derived
event retains its complete raw source row. Hexagon provenance and schematic
edits are documented in [world-hex-map.md](world-hex-map.md).

`src/lib/utils/festivalCountries.ts` implements the following explicit method:

- Use every source row in the active festival selection, including rows with
  missing venue coordinates or repeated event IDs. Count event records, not
  performers, scheduled performances, or unique productions. No source rows
  are deduplicated or imputed.
- Normalize country names for comparisons by trimming, normalizing case and
  diacritics, removing parentheses/full stops, and collapsing whitespace. Raw
  values remain unchanged. Split lists at commas, slashes, and semicolons;
  protect `KOREA, REPUBLIC OF` as one country before splitting. Count each
  resolved country or UK nation once per source row. A row naming several
  countries contributes one full count to each; country totals can therefore
  exceed the number of source rows.
- Match names against the loaded hex catalog and the explicit
  `festivalCountryAliases` map. Aliases cover US/UK spelling, South Korea,
  Taiwan, Czech Republic/Czechia, North Macedonia/Macedonia, and Bolivarian
  Republic of Venezuela/Venezuela. Country assignments join by ISO numeric
  ID. All cells for a country get that country's count, including Alaska and
  Hawaii receiving the US total. Their counts do not assert a connection to
  those specific states.
- UK nation labels, including `UNITED KINGDOM - SCOTLAND` and `Scotland`,
  join to separate UK nation keys. The same applies to England, Wales, and
  Northern Ireland. Generic `UK` or `United Kingdom` entries appear as
  `United Kingdom (nation unspecified)` in the table and are not assigned to
  any nation hexagon, following the user's explicit preference. Country ID
  826 is retained on the underlying UK hexagons.
- Blank and explicitly undeclared Country values contribute no assignment
  and are reported as missing. Unmatched values are reported with source-row
  counts, without being assigned to a modern country or another territory.
  Every relation retains its event and raw row; aggregates retain the source
  event rows for each count. Positive country totals are sorted by decreasing
  count, then name, for the table. Zero totals remain in the full aggregate
  and in each hexagon's accessible name and popup.

For the complete current CSV, the method yields 1,677 England records, 1,283
Scotland records, 42 Wales records, 21 Northern Ireland records, and 78 UK
records without a specified nation. There are 1,101 rows with no declared
country. `Soviet Union` and `GIBRALTAR` each occur in one row and are unmatched:
the former has no current matching country label, and the supplied hex data
contains no Gibraltar hexagon. These rows remain in the source data and in
the reports. Counts describe the Country associations supplied by the data;
they are not claims about nationality, residence, event location, or causation.

For each selection, a zero count has fill opacity 0.1. England and Scotland
use opacity 1 whenever they have a positive count. These two UK nations each
have one schematic cell and are excluded from the four remaining fixed count
ranges. Every other positive count is assigned to one of the ranges in the
directly adjustable `countryOpacity` constant in
`src/lib/utils/festivalCountries.ts`.

The four ranges are 1-19 records at 0.35 opacity, 20-111 at 0.55, 112-300
at 0.75, and 301 or more at 0.95. Canada (69 records) is therefore 0.55
opaque, Australia (204) is 0.75, and the United States (556) is 0.95. The
same fixed ranges apply to every festival selection, so an equal shade means
the same count range. All cells for a given country/nation get the same value,
regardless of its area or number of hexagons. With no mapped associations,
all cells have opacity 0.1. Missing/unavailable data has null cell counts and
an explicit loading or error message, rather than being presented as zero.

The popup and table show the exact count and active festival. The visible key explains the encoding;
the table and screen-reader summary provide alternatives to interpreting
opacity. The table remains available when narrow layouts hide the hex panels.

`Map.svelte` derives one active event collection using `selectFestivalEvents`.
A clicked festival arc takes precedence over hover/focus previews. Before an
arc is selected, previews update both the world map and the central venue
map. The reset button clears selection and preview, restoring all festivals.
Country aggregation uses the full active collection; the existing venue map
separately filters out rows without coordinates. An empty selection shows
zero counts rather than falling back to all festivals. This change introduces
no new data source, dependency, animation, or event-selection control.
