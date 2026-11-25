# Festival country representation

## All-year map data and year selection

Updated November 25, 2026. The map receives the complete formatted base
collection from `2012.csv` through `2026.csv`, documented in
[festival-data.md](festival-data.md). All years is the default. The Event year
filter selects the formatted source Year before festival selection, country
aggregation, and country/continent previews. Unknown-year records remain in
All years; none are assigned to a year using a filename or date. Repeated
source rows are retained and counted individually. Country summaries and text
alternatives include the active event-year scope. Existing country-matching
rules, counting rules, and fixed opacity bands remain in use. The separate
Tattoo visitor dataset retains its 2025 scope.

Festival selection explicitly includes the historical source-name variants
listed in [festival-map-audit.md](festival-map-audit.md) under their corresponding
arcs. These historical rows contribute
to the selected year's map and country summaries using the existing counting
methods. Original festival names and raw rows remain unchanged; see
[festival-data.md](festival-data.md) for the grouping method.

## Continent map previews

Added November 23, 2026. Hovering or focusing a continent in the Events strip
temporarily filters the central Edinburgh venue map to associated event records.
Tapping pins the same preview while the continent summary remains open; a
second tap, Escape, or an outside click dismisses it. Moving away from an
unpinned summary restores the current festival selection. Moving to a country
rectangle switches to that country's preview, as described below.
The Visitors strip does not filter the map.

`filterEventRecordsByContinent` in `eventContinentFilter.ts` uses the existing
festival selection's resolved event-country relations. A country key belongs
to the preview when one of its retained raw catalog rows has that continent.
Separate UK-nation keys use their catalog assignments. Generic UK records
without a displayed cell, unmatched country values, and missing country values
receive no inferred continent. A multi-country event record appears once in a
preview if any of its resolved countries belongs to the continent. It may appear
in more than one continent's preview. Repeated source records and their order,
object references, and raw rows are preserved; no deduplication is performed.

The map then applies its existing coordinate filter and hexagon grouping.
Hexagon opacity is recalculated for the preview's record counts with the
existing scale. Records without coordinates remain in the source collection
and country totals. A continent with no matching mapped locations clears the
hexagons. The screen-reader summary includes the previewed continent, current
festival scope, and empty or unavailable states. No filter label is displayed
inside the map circle. Strip country counts, ordering, connection lengths, and the selected
festival are unchanged by this temporary map filter.

## Country map previews

Added November 23, 2026. Country rectangles in the Events strip now preview
their associated event records on the central map through hover, keyboard
focus, or tap. Country and continent previews share one active selection per
strip. Leaving an unpinned summary or dismissing it restores the current
festival selection. Tapping again, Escape, or an outside click dismisses a
pinned preview. The Visitors strip continues to show tooltips without filtering
the map. No visible filter label is added inside the map circle.

`filterEventRecordsByCountry` in `eventCountryFilter.ts` finds the displayed
country's existing aggregate key by matching its retained catalog row's ID,
name, and continent. It selects the existing festival selection's event-country
relations containing that key. UK-nation assignments stay distinct; generic UK
records are not assigned to Scotland or another nation. Multi-country records
are included once per matching source record, while repeated source records,
order, event objects, and raw rows are retained. A known country with no
matching event records yields an empty map selection. Unavailable country data
remains unavailable. The same coordinate filter, hexagon grouping, and opacity
scale used for continent previews apply. Country totals and strip order remain
based on the festival selection.

## Continent summaries

Added November 23, 2026. Hovering, focusing, or tapping a continent rectangle
in the Events strip opens a summary of displayed countries with one or more
event records and displayed countries with exactly zero records. The counts
follow the active festival selection. The active continent has a dark outline
and becomes 10% wider, without animation; its country cells and values stay
the same. Tapping again, pressing Escape, or clicking elsewhere dismisses the
summary. Pointer users can move into the summary to read it.

`continentSummary.ts` groups the existing strip cells by continent in their
current order and counts each displayed cell once. Positive event counts
contribute to countries with records; zero contributes to countries without
records. Missing matches, unloaded data, or invalid numeric counts contribute
only to a separately labeled unavailable count. The total is limited to the
curated countries shown in that strip; it is not a total for every country in
the world. The summary retains the grouped cells and their raw catalog rows
and does not alter source data, event-country matching, or country order.
Each continent control exposes the same counts in its accessible name.

## Country tooltips

Added November 23, 2026. Hovering, focusing, or tapping a country rectangle
shows its name and exact related event-record count for the active festival
selection. These are event records, not unique productions or performances.
`countrySummary.ts` retains every displayed country and raw catalog row and
adds the existing count without further aggregation or deduplication. Missing
or invalid counts remain unavailable; a known zero is displayed as zero.
The shared `CountryStripDetails.svelte` component shows one country or continent
tooltip at a time per strip. Escape, an outside click, or a second tap dismisses
it. Keyboard users can Tab into the country list and move through its displayed
order with Up/Down Arrow or Home/End, without hundreds of additional Tab stops.

## Events strip connections

Added November 19, 2026: `EventCountryConnections.svelte` renders one black
cubic Bézier path for each highlighted country rectangle in the Events strip.
Both components use `createEventCountryStrip` to share the same country layout,
title clearance, continent grouping, and active festival representation.
The compact `public/data/strip-countries.json` is the country source for these
strips; its derivation is documented in [world-hex-map.md](world-hex-map.md).
No new event rows or country assignments are introduced by the connections.

`addCountryRepresentationToStrip` sorts countries within each continent by
the active selection's event-record count, highest first. Continent order
stays fixed. Equal counts retain their source order; unavailable or unmatched
counts remain `null` and follow known counts, including zero. The input records
and raw rows are retained without mutation. Both the Events strip and its
connections use this shared ordering: each path starts at its country's new
rectangle position, and endpoints follow the same continent and country order.
Selecting or resetting a festival recalculates both layouts together.

`createEventCountryConnections` explicitly selects cells with `hasEventData`
and a positive rendered height. Each horizontal line starts at the right-edge
midpoint of its country rectangle and keeps that y position. Its length is
proportional to the selection's related event-record count; the largest reaches
the midpoint between the Events strip and the central circle's left edge.
The Events and Tickets strips each calculate their own length scale. Every
connection retains its raw country record. Each line's stroke width
matches its country rectangle's rendered height and updates with the shared
responsive layout. Line width does not represent event counts or geographic
journeys. Selecting/resetting a festival updates the highlighted
countries and their connections together. Resizing updates their geometry,
without animation. The layer does not intercept map or festival controls.
A screen-reader summary lists the connected countries and reports an empty
selection or unavailable data.

Rectangle fill opacity and connection stroke opacity now use the same matched
country aggregate's `fillOpacity` rather than a binary presence encoding.
The existing fixed scale is reused: zero records have 0.1 opacity; positive
counts of 1–19 have 0.35, 20–111 have 0.55, 112–300 have 0.75, and 301 or more
have 0.95. The existing England/Scotland positive-count override remains 1.
Unavailable or unmatched counts remain `null` and use the faint fallback;
no connection is drawn without a positive count. Exact event-record counts
are included in the connections' text alternative. Opacity updates with the
festival selection; resizing changes geometry, not the count bands. No event
rows, counting rules, country assignments, or rectangle sizes change. Country
ordering follows the within-continent count sort described above.

## Earlier world-map method

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
Hovering or focusing a festival arc only highlights that arc. Clicking an arc
updates both the world map and the central venue map; the reset button clears
that selection and restores all festivals.
Country aggregation uses the full active collection; the existing venue map
separately filters out rows without coordinates. An empty selection shows
zero counts rather than falling back to all festivals. This change introduces
no new data source, dependency, animation, or event-selection control.
