# World hex map panels

The source is the user-supplied `public/data/hex-world-110cols.json`, added
to this project on November 3, 2026. Its upstream URL, download date, polygon
dataset version, and generation method were not supplied. The file describes
a 1,000 × 520-unit Natural Earth projection, a pointy-top grid, and a hex
radius of 5.249 units. The filename identifies a 110-column grid; this
implementation does not regenerate country polygons. On November 3, 2026,
at the user's request, three New Zealand records were edited directly in
the JSON for a more compact schematic arrangement, as documented below.
On the same date, the user requested that the 25 previously hidden island,
territory, and projection-seam cells be removed directly from the JSON.
The original file had 1,726 cells; the removal left 1,701 cells. Its schema,
grid metadata, and remaining records were unchanged by this removal. A
subsequent user-requested Hawaii addition on the same date brings the current
file to 1,703 cells, including the requested second Hawaii hexagon. Adding a
Northern Ireland cell for the requested UK nation representation on the same
date brings the current total to 1,704 cells.

The public asset is fetched from
`${import.meta.env.BASE_URL}data/hex-world-110cols.json`. The full file
remains accessible as `data.raw`. The left panel selects every
`group === "americas"` cell (566 cells); the right panel selects every
`group === "rest"` cell (1,138 cells). No runtime island or territory exclusions
remain. Each loaded cell is rendered when the panels have enough space.

The removed records comprise nine detached Pacific cells on the left,
five western outliers on the right, six cells east of Australia, and the five
additional territories requested by the user. Only the three wrapped Russia
cells and the one remote France cell listed in the removal record were
deleted; those countries' other cells remain. Both Iceland cells and all four
New Zealand cells remain, as do Alaska, Greenland, the Caribbean, Australia,
and Papua New Guinea. The separate `Indian Ocean Ter.` record and Georgia
also remain. The removed records are documented below for provenance.

Every displayed cell retains its raw source record. IDs are normalized to
strings for country grouping; missing or blank IDs use the supplied name.
Coordinates come directly from the JSON with no country-specific runtime
position overrides. The center bounding box is expanded by
the full hex radius in each direction, then uniformly scaled and positioned
within the available panels on either side of the existing circle. One
shared fitted scale is the smallest width/height fit across both groups, then
multiplied by `worldHexMapSize` (currently 0.8). Both
panels therefore have exactly the same hex radius and source aspect ratio.
Each group remains vertically centered in its panel. Both maps use the same
horizontal clearance from the circle: the smaller of their originally centered
insets is applied to each panel's circle-facing edge. This moves the narrower
Americas map toward the circle while keeping the right-hand map's position
and the shared scale. Source gaps, including Hudson Bay, are preserved to the
resolution of the supplied grid, with the schematic exceptions below.

Hawaii was absent from the supplied data and is represented by two schematic
hexagons added directly to the JSON. The original addition is column 8, row 24,
at x=77.27 and y=194.2, in the Americas group. Its pointy-top grid center was
chosen near an illustrative Hawaii location (156.3 degrees west, 20.8 degrees
north) using D3's Natural Earth projection fitted to the file's 1,000 by
520-unit extent, then snapped to the existing grid spacing. This is a manual
minimum-size representation, not a new polygon-derived cell or an area measure.
At the user's request, a second adjacent cell was added northwest of it at
column 7, row 23, x=72.73 and y=186.33, making a short northwest-to-southeast
chain with the usual thin gap. Both names are `Hawaii (United States)` for
the popup and their country ID is 840, matching the other US cells.
No other record or file metadata changed in these additions;
Hawaii uses the common hex radius and does not change existing cell
positions or the shared scale.

At the user's request, the UK is represented schematically by one cell for
each of Scotland, England, Wales, and Northern Ireland. The three existing
UK cells retain their coordinates and have their names changed directly in
the JSON from `United Kingdom` to the corresponding name below. A fourth
cell for Northern Ireland was added at the neighboring grid position
northwest of the existing Ireland cell. Each uses country ID 826 and group
`rest`, so country-level joins still identify the UK. The Ireland cell keeps
its original ID 372, name, and coordinates. No other records or metadata were
changed by this edit; cell size and existing cell positions are preserved.
These assignments are schematic and do not derive from UK nation boundaries
or encode relative area.

| Popup name | Column | Row | x | y | Change |
| --- | ---: | ---: | ---: | ---: | --- |
| Scotland (United Kingdom) | 54 | 10 | 495.45 | 83.98 | Existing UK cell renamed |
| England (United Kingdom) | 54 | 11 | 500 | 91.85 | Existing UK cell renamed |
| Wales (United Kingdom) | 53 | 11 | 490.91 | 91.85 | Existing UK cell renamed |
| Northern Ireland (United Kingdom) | 52 | 10 | 477.27 | 83.98 | New cell |

New Zealand's schematic positions are stored directly in the JSON. The
original and current coordinates are recorded here for provenance. On
November 5, 2026, all four cells were moved two original grid-column
spacings west, leaving two unoccupied hexagon positions between the group and
Australia while preserving its existing compact arrangement.

| Cell (column/row) | Original x | Original y | Current x | Current y |
| --- | ---: | ---: | ---: | ---: |
| North Island 104/47 | 954.55 | 375.28 | 918.1869306221419 | 375.28 |
| North Island 105/48 | 959.09 | 383.15 | 922.726930622142 | 383.15 |
| South Island 102/50 | 931.82 | 398.9 | 913.64 | 398.9 |
| South Island 100/51 | 918.18 | 406.77 | 909.4578940430927 | 406.14362 |

The North Island pair is four original grid-column spacings west of its
source positions. The lower South Island cell remains immediately southwest
of the upper one.
Their stored center separation is `sqrt(3) × hexRadius × 0.92`, so their
rendered polygons share an edge with the current 8% radius inset. Changing
`worldHexGap` changes this contact. Existing border strokes are retained.
All four country assignments and original column/row identifiers are retained;
those identifiers refer to the original grid cells, while x/y are the edited
schematic positions. No other retained coordinates or file metadata were edited. This is
an intentional schematic placement, not the original Natural Earth geometry.
Both panels refit to the edited coordinates using their shared scale.

Hex vertices follow the requested angles `60k - 30` degrees. Their
rendered radius is `hexRadius × scale × (1 - worldHexGap)`, where the
default gap is 0.08. Country labels are not drawn on either panel. Each
hexagon retains its country ID and name, with an accessible button label.
Hovering or focusing a hexagon displays its supplied country or territory name
and the related event-record count for the current festival selection in a
popup. Tapping or clicking keeps it open until another hexagon is chosen,
the same hexagon is activated again, the user taps outside, or Escape is pressed.
Hover popups remain open while the pointer is over the popup. Each panel has
one Tab stop; arrow keys move to the nearest hexagon in that direction, and
Home/End move to the first/last cell in source order. Popups are constrained to
the container and dismissed when the layout or festival selection changes.
The number and size of hexagons remain fixed; black fill opacity encodes related
event-record counts from the CSV's Country column. UK nations use separate
counts and unspecified UK entries are listed separately. The expandable
country-count table supplies a text equivalent, including missing and unmatched
values. See [the country methodology](festival-country-representation.md) for
the counting, country-name matching, and opacity scale.

The panel configuration is `worldHexPanelBox` in
`src/lib/utils/worldHexMap.ts`: edge padding, clearance from the
circle, height as a fraction of the container, and minimum usable width.
The directly adjustable `worldHexMapSize` constant in the same file controls
the relative size of the whole hex map, including both hexagons and their
spacing. Use a value from 0 to 1; the current 0.8 displays the maps at 80% of
their fitted size.
The existing circle, timeline, month labels, and event arcs are unchanged.
Both panels remain hidden when either side is narrower than the minimum
usable width. The wider source bounds of the right group may reduce the
shared scale compared with displaying the Americas alone.

The 25 records removed from the JSON on November 3, 2026 are recorded here.
Names, country IDs, groups, grid identifiers, and centers are the original
values. The removal changed file membership only; retained records stayed in
their original order with their existing values.

| Name | ID | Group | Column | Row | x | y |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Russia | 643 | rest | 14 | 4 | 131.82 | 36.74 |
| Russia | 643 | rest | 12 | 6 | 113.64 | 52.49 |
| Russia | 643 | rest | 13 | 6 | 122.73 | 52.49 |
| France | 250 | rest | 38 | 31 | 354.55 | 249.31 |
| Fr. Polynesia | 258 | americas | 12 | 36 | 113.64 | 288.68 |
| Vanuatu | 548 | rest | 105 | 39 | 963.64 | 312.29 |
| Marshall Is. | 584 | rest | 106 | 29 | 972.73 | 233.56 |
| American Samoa | 016 | americas | 3 | 38 | 31.82 | 304.42 |
| S. Geo. and the Is. | 239 | americas | 45 | 54 | 413.64 | 430.39 |
| Br. Indian Ocean Ter. | 086 | rest | 76 | 35 | 700 | 280.8 |
| Pitcairn Is. | 612 | americas | 16 | 42 | 150 | 335.91 |
| Tonga | 776 | americas | 2 | 41 | 27.27 | 328.04 |
| Solomon Is. | 090 | rest | 103 | 36 | 940.91 | 288.68 |
| Samoa | 882 | americas | 2 | 38 | 22.73 | 304.42 |
| Niue | 570 | americas | 3 | 40 | 31.82 | 320.17 |
| Cook Is. | 184 | americas | 6 | 41 | 63.64 | 328.04 |
| Nauru | 520 | rest | 105 | 33 | 963.64 | 265.06 |
| Kiribati | 296 | americas | 3 | 32 | 31.82 | 257.18 |
| Wallis and Futuna Is. | 876 | americas | 1 | 38 | 13.64 | 304.42 |
| New Caledonia | 540 | rest | 104 | 41 | 954.55 | 328.04 |
| Fr. S. Antarctic Lands | 260 | rest | 73 | 52 | 668.18 | 414.64 |
| Fiji | 242 | rest | 108 | 39 | 990.91 | 312.29 |
| Cabo Verde | 132 | rest | 47 | 26 | 431.82 | 209.95 |
| Heard I. and McDonald Is. | 334 | rest | 74 | 54 | 677.27 | 430.39 |
| Norfolk Island | 574 | rest | 104 | 44 | 950 | 351.66 |
