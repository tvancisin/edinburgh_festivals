# Visualization guide

Updated November 24, 2026. The guide introduces four areas in order: the
Edinburgh venue map, the fixed festival calendar and arcs, the left Event Origins
strip and its lines, and the right Visitor Origins strip and its lines. Only the
current area is shown above a white overlay with 0.7 opacity. Finishing the
guide removes the overlay and restores the visualization controls.

Both strip headings stay on one line and extend inward from the page edges.
Their SVG text can extend past the narrow strip container without clipping;
the country rectangles, continent groups, and line positions keep their layout.
"Origins" refers to the countries recorded in the respective source datasets.

Each step has a short description beside its subject. The map description
moves below the circle when side space is limited; the timeline description
uses the dimmed map interior. Country descriptions sit inward from their
respective strips and lines. Positions respond to the measured container
and description height; compact layouts keep descriptions within the
container, with scrolling for text when needed. Descriptions and step
changes are available to screen readers, and the advance button supports
keyboard and touch input.

The descriptions follow the existing counting methods:

- Map hexagons group source event records at venue coordinates. Darker
  hexagons indicate more event records in an area, rather than a count of
  distinct venues. The opacity scale is defined in `hexBins.ts`.
- Each festival arc marks its configured month/day range on a fixed calendar.
  Calendar geometry is independent of the event-year filter. Arc selections
  filter the current event-year selection by festival; All years is the default.
- Each dark country segment identifies one country represented in the
  corresponding dataset. Segments are grouped by continent. The Events
  strip describes supplied country associations, without inferring
  nationality or residence. Black line lengths show related event-record
  counts.
- The Visitor Origins strip covers only Tattoo visitors. It appears in the
  default view and the Tattoo selection; other festival selections keep the
  heading and neutral strip visible without visitor data or connecting lines.
  Visitor line lengths count one visitor per ticket-export row, following the
  source definition confirmed by the user on November 23, 2026. Ticket
  quantities are not counted. Events and Visitors use separate line-length scales.

Source provenance and the country counting methods remain documented in
[festival-country-representation.md](festival-country-representation.md),
[ticket-data.md](ticket-data.md), and [world-hex-map.md](world-hex-map.md).
The guide does not change the data or counting methods.
