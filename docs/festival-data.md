# Festival dataset loading and formatting

Updated November 24, 2026.

The festival-data startup step loads all 15 local CSVs from
`public/data/2012.csv` through `public/data/2026.csv` concurrently. After every
file loads, it formats each dataset and logs it to the browser console as
`Formatted festival dataset (2012.csv):`, continuing through 2026 in file-list
order. Each logged object contains `fileName`, `events`, and `raw`.

The source download URLs, download dates, and export versions were not supplied.
The year in each filename identifies the file; event years come from the source
`Year` field and are never inferred from filenames. Source CSVs are unchanged.

Formatting renames fields to lower camel case, nests venue fields, converts
nonblank finite numeric values to numbers, and splits comma-separated genre
tags into trimmed, nonempty strings. Empty or invalid numeric values become
`null`. Dates must match `YYYY-MM-DD`, and update timestamps must match
`YYYY-MM-DD HH:mm:ss`, including valid calendar dates and clock values. Empty,
malformed, or out-of-range dates and timestamps become `null`. Parsed dates use
the browser's local time, with no inferred timezone conversion.

The `raw` arrays retain the expected source columns as strings, using empty
strings for missing fields. Each formatted event retains its corresponding raw
row. All source rows and their order are preserved. This loading step does not
combine files, group, filter, sort, deduplicate, or aggregate events.

Individual file loads and the completed formatted collection are cached.
Failures clear the affected cache entries so a later call can retry while
reusing successful file loads. Cached calls do not repeat the console logs.

`App.svelte` stores the complete loaded collection in `baseFestivalDatasets`.
It is `undefined` until loading succeeds, then contains all 15 datasets, each
with `fileName`, formatted `events`, and `raw` rows. Future views should derive
their data from this base without modifying it. The existing on-demand venue
explorer also derives its data from this collection, loading it first if needed.

`App.svelte` passes the base collection and its loading/error status to
`Map.svelte`. The map owns an event-year selection, initially All years, and a
festival-name selection. `festivalMapData.ts` provides the named transformation
helpers. The other startup loaders remain separate from festival dataset loading.

## Map selections

`combineFestivalMapDatasets` concatenates formatted events in file-list and
source-row order. No records are deduplicated, including repeated event IDs
across or within files. All years includes records whose year is `null`.
`listFestivalMapYears` builds the control's distinct, ascending option list from
known event years. It does not infer years from filenames or performance dates.

`selectFestivalMapYear` selects exact matches to the formatted source year.
`groupFestivalMapEvents` groups that selection by exact source festival name,
retaining every event and its raw row. Selecting a festival resolves its group
again after each year change, so a festival absent from a year produces an
empty view. Resetting the festival keeps the selected year; choosing All years
restores all years while retaining the festival selection. Base records and
arrays are unchanged by any selection.

Event locations, country counts, country connections, and country/continent
previews all follow the current year and festival selections. The coordinate
filter in `festivalMapData.ts` applies only to plotted locations. Events with
missing coordinates remain in the base data and country totals. Existing
hexagon counts continue to count source event records, including repeats,
rather than unique events or venues. Opacity is rescaled within each rendered
selection and zoom level. It does not provide a fixed cross-year comparison.

The native Event year select supports keyboard and touch input. Loading,
error with retry, empty-event, and no-location states are provided. Text
alternatives and event-country summaries include the selected year scope.
The separate Tattoo visitor data retains its existing 2025 scope and is not
filtered by event year.

## Fixed circular calendar

The circular calendar uses the existing configured month/day ranges from
`festivals.js`, with their former 2025/2026 year prefixes removed. These are
fixed display dates, not dates calculated from CSV events and not a claim that
every year's festival occurred on those dates. Selecting a year does not move
the arcs. Historical festival names are not silently matched to other names;
arc selections use their configured exact source-name keys.

`festivalTimeline.ts` calculates arc paths, month ticks, and today's marker.
It uses an internal UTC leap-year reference solely for month/day geometry,
including February 29, without assigning years to event records. A range
crossing January is unwrapped onto the next revolution so Hogmanay remains a
short December-to-January arc. The textual calendar presents month/day labels
without a year. The display configuration's original provenance was not supplied.
