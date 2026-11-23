# Ticket data

`public/data/tickets_data/tattoo_2025_tickets.csv` was supplied for this
project on November 20, 2026. No original download URL, download date, or
source-system export version was supplied with the file.

`src/lib/utils/ticketData.ts` loads the CSV without modifying it and caches a
successful request. It retains every raw row and maps it to a typed derived
record. Dates use the file's day/month/year formats; malformed or blank dates
and numeric values are `null`. Currency fields have their display currency
symbols and thousands separators removed solely to parse a numeric value; the
original field is retained on `raw`.

## Visitor definition

On November 23, 2026, the user confirmed that the source documentation defines
each CSV row as one unique visitor. The right-hand strip is therefore labeled
Visitors, and its row counts are described as visitors. `ORDER_QUANTITY` is
not used. The CSV contains no purchaser or visitor ID: the interpretation
relies on the confirmed source definition, rather than person matching or
deduplication in this application. The country aggregation still counts every
source row exactly once, with no change to numeric values.

## Ticket-country strip method

The right-hand Visitors strip uses `strip-countries.json` as its curated display
catalog and continent source. The ticket-specific catalog adds a separate
`United Kingdom` cell in Europe. This is deliberately distinct from the
catalog's `Scotland (United Kingdom)` cell: generic UK source rows are never
assigned to Scotland, England, Wales, or Northern Ireland.

`ticketCountries.ts` normalizes country names only for matching and retains
the original `COUNTRY` value and complete raw ticket row. It maps a small,
explicit set of label variants to catalog names, including United States,
Czech Republic, Republic of Korea, Russian Federation, TÃ¼rkiye, and Swaziland.
Territories and labels not present in the curated catalog remain unmatched and
are reported in the derived representation rather than assigned by inference.

Each matched country counts its CSV rows once. Under the confirmed visitor
definition, this gives visitors by country. `ORDER_QUANTITY` is retained in
the raw source row and is not used: ticket quantities, orders, and net sales
are not the displayed measure. Every country aggregate retains the derived
ticket rows and their raw source rows.

Countries are kept in the catalog's fixed continent order and sorted by
descending visitor count within each continent. Positive counts use
a square-root opacity scale from 0.35 to 1, with the largest country at 1.
Countries without visitors use 0.1. The screen-reader summary reports the
total, leader, unmatched rows, and method; opacity does not supply the only
available information.

Each country with one or more visitors has one black horizontal line
from the left-edge midpoint of its Visitors rectangle toward the center of the
map. Line length is proportional to the visitor count, using a scale
separate from the Events strip; the largest reaches the midpoint between the
Visitors strip and the circle's right edge. Paths use the same opacity and country
order as the strip, and their width matches the responsive rectangle height.
The full connection list and exact visitor counts are available to screen readers.

## Continent summaries

Added November 23, 2026. Hovering, focusing, or tapping a continent rectangle
in the Visitors strip shows how many displayed countries have one or more
visitors and how many have exactly zero. Counts use the existing
ticket-country aggregates, including the ticket catalog's separate generic
United Kingdom cell. They cover all loaded visitors and do not follow
the Events strip's festival filter. They count displayed countries, rather
than ticket quantities or the number of visitors.

The shared `continentSummary.ts` helper groups the strip's existing cells and
retains their raw country rows. Missing or unloaded country aggregates are
labeled unavailable, rather than using the strip's visual zero fallback.
The active continent gains a dark outline and becomes 10% wider without
animation. The summary is available through hover, keyboard focus, and tap;
Escape, a second tap, or an outside click dismisses it. Its full counts also
appear in the continent control's accessible name. No ticket source rows,
matching rules, or existing aggregation methods change.

## Country tooltips

Added November 23, 2026. Hovering, focusing, or tapping a country rectangle
shows only its name and exact visitor count. `countrySummary.ts` reads the
existing country aggregate; unavailable or unmatched aggregates display
"Count unavailable" instead of zero. Each derived tooltip record retains its
raw catalog row. The shared `CountryStripDetails.svelte` component renders
both country and continent controls and a single tooltip per strip, so moving
between them switches the displayed information. Tooltips support Escape,
outside-click dismissal, and tap toggling. A single Tab stop enters the
countries; Up/Down Arrow and Home/End move focus through the displayed order.
