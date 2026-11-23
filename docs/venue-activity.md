# Venue records, 2012–2026

Updated November 23, 2026. The view loads all 15 local files from
public/data/2012.csv through public/data/2026.csv using the cached Promise.all
loader in festivalData.ts. Original download URLs, download dates, and export
versions were not supplied. Filenames, raw rows, and parsed records are retained.
Failed loads can retry. The main festival map continues to use 2025.

## Grouping method: combine existing columns

The starting point is the original exact venue-code grouping, including its
single missing-code group. groupEventsByVenueSite in venueSites.ts can combine
these groups but never split one. The grouped chart therefore cannot have
more columns than code-only grouping of the same files. sourceVenueCodeCount
retains the baseline for comparison. The visible grouping note has been removed
at the user's request; grouping evidence remains in titles and the text table.

This corrects the earlier implementation, which split groups when names,
festival labels, addresses, or exact coordinates changed. Those differences
now remain as source aliases within the original group.

assessVenueCodeGroup evaluates each entire code group before any combination:

1. One consistent reviewed site or complete numbered address and postcode can
   support joining different codes with that same match key.
2. Conflicting known locations, malformed/contradictory nonblank postcodes,
   mixed virtual/physical descriptions, or explicit multi-site descriptions
   block further merging. A reused code cannot bridge unrelated locations.
3. Missing location fields provide no match evidence. Partial locations must
   agree with a supported description in the same group. No source fields are
   filled in. Coordinate changes never create columns or veto an otherwise
   consistent complete address. Coordinates remain available for inspection.
4. Insufficient evidence leaves the original code group unchanged. Blank codes
   also stay in their original single group and never join other codes. There
   are no name-only, coordinate-only, broad-street, or postcode-only joins.

Keeping original groups intact is the user's requested analytical constraint.
A retained code can still refer to different locations or venue types. Such
columns, including the missing-code column, are not confirmed physical sites.
Detected conflicts add a location-uncertain qualifier to the label and are
explained in column titles and the screen-reader table. The chart compares
venue groups; it is not a census of buildings.

## Location evidence and provenance

Comparison helpers normalize Unicode/case, apostrophes, dashes, whitespace,
address commas/periods, trailing locality labels, and road abbreviations at
address ends. Street numbers and building/room prefixes remain. Postcodes
match without spaces. An embedded literal postcode may support a blank field;
malformed or contradictory evidence cannot support a cross-code match.

reviewedVenueSites records explicit analytical IDs, accepted addresses,
postcodes, names, and evidence for Scottish Storytelling Centre, Edinburgh
Futures Institute, Royal Scots Club, Assembly Roxy, the Studio at 22 Potterrow,
Dovecot Studios, Traverse Theatre, Dance Base, Whistlebinkies, and Summerhall.
These rules were reviewed against local 2021–2026 venue fields on November 23,
2026. They apply to the expanded files subject to whole-code consistency.
Both normalized address and postcode must match. No external building registry
was consulted, and familiar names alone are insufficient.

Explicit virtual/platform labels cannot support physical matching. Traverse 3
at 180 High Street is a reviewed virtual entry, and that administrative address
is excluded from automatic matching. Mixed online/physical code groups remain
intact and block further merging. Explicit multi-site entries also stay in
their original groups, including the three-bar La Belle Angele/Sneaky Pete's/
Bannerman's entry and Storytelling Centre entries also naming a museum. Events
are not allocated among their buildings. Nightingale Way's Spiegeltent does
not join EFI on coincident coordinates.

IDs use the reviewed site, normalized address/postcode, or literal original
code, never input row order. New historical evidence can prevent a previous
cross-code match without splitting any original code group. VenueSite and
VenueSiteAlias retain every contributing event and raw row, original venue
fields, festival context, and grouping explanation. No event is dropped,
deduplicated, or placed in multiple columns. Source event order within each
column remains intact. Compact labels use reviewed names or the shortest
nonblank source name, with an alphabetical tie-break. Original names and codes
remain available in titles and the screen-reader table.

## Years, sorting, and interpretation

All 15 year files are required. Missing files produce an error; successfully
loading all files with no records produces an empty state. Year cells use the
parsed source Year, never a year inferred from the filename. Unknown or other
years remain in retained events/raw rows, receive no cell, and are reported.

A tiny filled circle means at least one event record for the group and year.
A blank means no matching record in the supplied data, not that a venue did
not operate. A combined column does not mean every alias occurred in each
marked year. Columns sort by distinct years recorded, highest first, then
English natural A–Z order ignoring case, accents, and punctuation. Event
counts within a year do not affect this ordering.

## Display and verification

### Recorded-year filter

The slider selects venue groups recorded in **at least** 1–14 eligible years.
Its value counts recorded years, not links between years or event records.
2020 is excluded from these calculations at the user's request. All 15 year
rows remain visible, including the original 2020 records for matching groups.
A group recorded only in 2020 therefore does not match even the minimum of 1.

By default, gaps are allowed: the threshold uses the total number of distinct
recorded years excluding 2020. With Continuous years only checked, it uses the
longest consecutive run in the eligible-year sequence. 2019 and 2021 are
treated as consecutive, regardless of whether that group has a 2020 record.
Any other missing year breaks a run. A run of N recorded years counts as N,
including its endpoints. No missing records are filled in, and this is not
evidence of continuous venue operation.

The named helpers in venueActivityFilters.ts select eligible years, summarize
each group's counts/runs, and filter complete columns without changing group
membership, event order, original year cells, or the underlying data. Matching
columns retain their existing relative sort order and expand to fit the chart;
filtering does not recalculate the original all-year sort. The original data
and all raw rows remain accessible. Setting the minimum to 1 restores groups
with at least one eligible year. No files are reloaded when controls change.

The labeled native range input and checkbox support keyboard and touch use,
remain inside the dialog's focus trap, and show the minimum. The explanatory
2020 note is visually hidden at the user's request; it remains associated with
the controls for screen readers and documented in the chart description.
A visually hidden live status reports matching groups to screen readers; an empty result keeps the controls
available. Chart descriptions and the filtered screen-reader table use the
same selection and explain the active filter. Circles and their thin connecting
lines share the same dark gray.

### Chart layout

Year labels use a compact 40-pixel gutter to leave more width for venue columns.
The visible title, matching-group count, Year heading, vertical axis domain line,
and tick marks are omitted; individual year labels remain. The dialog retains
an accessible name, and count feedback remains available to screen readers.
Filters and the back button share the top toolbar on wide screens; they wrap
on narrow screens. The toolbar has compact vertical padding. No empty title,
count, or explanatory-note rows reserve space above the chart. The full-screen
container assigns all remaining height to the chart, independently of the SVG's
intrinsic size.
All columns fit the measured width without scrolling, with the requested very
small vertical names above them. Their label area is capped at 96 pixels and
20% of the chart height, with label fonts sized to fit. The grid starts eight pixels below the name
baseline. A tiny circle sits at each recorded year-band center, with radius
at most 1.5 pixels and scaled down to fit narrow venue columns. The circles
remain small as the chart grows vertically. Thin vertical lines connect
consecutive recorded years within each venue group, stopping at circle edges.
createVenueYearConnections in venueActivityFilters.ts derives those links and
retains their endpoint records and raw rows. Other missing years break lines;
if 2020 has no record, 2019 connects directly to 2021 under the agreed continuity
rule, without inventing a 2020 circle. Actual 2020 records still have circles
and ordinary adjacent-year links, while remaining excluded from filter counts.
Allowing gaps in the filter can show separated runs; it does not draw links
across other missing years. Lines encode record adjacency, not continuous venue
operation. An unrecorded year has no circle. Rows run from 2012 at the top to
2026 at the bottom. The chart fills the available height below the header,
with no chart-height or year-band cap, leaving eight pixels below the final
year band. It still fits all rows without scrolling. Rendering remains
declarative Svelte SVG using bound container dimensions and no viewBox.

Circle presence and connecting lines provide the encoding independently of color. SVG text,
column titles, and the screen-reader table provide original names/codes,
grouping evidence, and year presence. Loading, empty, retry, keyboard focus,
Escape, and focus restoration remain supported. The removed introductory
explanatory paragraph remains removed. Resizing adds no animation.

Tests cover all 15 years, responsive fitting, missing/unknown years, raw-row
preservation, safe merges, reused-code bridges, and virtual/multi-site
exclusions. Integration tests load all local CSVs, reconcile every event and
raw row, assert that every original code appears in exactly one column, and
verify fewer columns than the same-files code-only baseline.
