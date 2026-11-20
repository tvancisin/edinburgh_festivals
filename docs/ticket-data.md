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

## Ticket-country strip method

The right-hand Ticket strip uses `strip-countries.json` as its curated display
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

Each matched country counts its CSV rows once. `ORDER_QUANTITY` is retained in
the raw source row but is not used in the Ticket strip, so the representation
shows ticket-data entries by country rather than ticket quantities, orders, or
net sales. Every country aggregate retains the derived ticket rows and their
raw source rows.

Countries are kept in the catalog's fixed continent order and sorted by
descending ticket-data entry count within each continent. Positive counts use
a square-root opacity scale from 0.35 to 1, with the largest country at 1.
Countries without entries use 0.1. The screen-reader summary reports the
total, leader, unmatched rows, and method; opacity does not supply the only
available information.

Each country with one or more ticket-data entries has one black horizontal line
from the left-edge midpoint of its Ticket rectangle toward the center of the
map. Line length is proportional to the country entry count, using a scale
separate from the Events strip; the largest reaches the midpoint between the
Ticket strip and the circle's right edge. Paths use the same opacity and country
order as the strip, and their width matches the responsive rectangle height.
The full connection list and exact entry counts are available to screen readers.
