import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { extname } from "node:path";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import * as d3 from "d3";
// Match Vite's extensionless TS module resolution without changing production imports.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !extname(specifier) && context.parentURL?.includes("/src/lib/utils/")) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
} });
const { createVenueActivityData, sortVenuesByRecordedYears, venueActivityFiles, venueActivityYears } = await import("../src/lib/utils/venueActivity.ts");
const { groupEventsByVenueSite, normalizeVenueSiteAddress, normalizeVenueSitePostcode } = await import("../src/lib/utils/venueSites.ts");
const { createVenueActivityLayout } = await import("../src/lib/utils/venueActivityLayout.ts");
const { createVenueYearConnections, filterVenueActivityByConnections, selectVenueConnectionYears, summarizeVenueConnections } = await import("../src/lib/utils/venueActivityFilters.ts");

function event(code, name, year, id = "same-id", location = {}) {
  return {
    id, year, festival: "Test festival", venue: {
      code, name, address: `${code || name} High Street`, postcode: "EH1 1AA",
      latitude: 55.95, longitude: -3.19, ...location,
    },
    raw: { ID: id, Year: year === null ? "" : String(year), Venue: name, "Venue code": code },
  };
}

function dataset(fileName, events) {
  return { fileName, events, raw: events.map((record) => record.raw) };
}

function activityData(overrides) {
  const sources = venueActivityFiles.map((fileName) =>
    overrides.find((source) => source.fileName === fileName) ?? dataset(fileName, []),
  );
  return createVenueActivityData([
    ...sources,
    ...overrides.filter((source) => !venueActivityFiles.includes(source.fileName)),
  ]);
}

function connectionFixture() {
  return activityData(venueActivityYears.map((year) => dataset(`${year}.csv`, [
    ...([2018, 2019, 2021, 2022].includes(year) ? [event("run", "Continuous venue", year)] : []),
    ...([2012, 2014, 2017, 2026].includes(year) ? [event("gaps", "Gapped venue", year)] : []),
    ...(year === 2020 ? [event("pandemic", "2020 only", year), event("with-2020", "2020 and 2021", year)] : []),
    ...(year === 2021 ? [event("with-2020", "2020 and 2021", year)] : []),
  ])));
}

test("connection thresholds count recorded years, allow gaps, preserve all source rows, and never count 2020", () => {
  const data = connectionFixture();
  const before = structuredClone(data);
  const filtered = filterVenueActivityByConnections(data, 3, false);
  assert.equal(filtered.maximumYears, 14);
  assert.deepEqual(filtered.eligibleYears, venueActivityYears.filter((year) => year !== 2020));
  assert.deepEqual(filtered.data.venues.map((venue) => venue.venueCodes[0]), ["run", "gaps"]);
  assert.equal(filtered.data.raw, data.raw);
  assert.equal(filtered.data.venues[0], data.venues[0]);
  assert.deepEqual(data, before);
  assert.equal(filterVenueActivityByConnections(data, 1, false).data.venues.length, 3);
  assert.ok(!filterVenueActivityByConnections(data, 2, false).data.venues.some((venue) => venue.venueCodes.includes("with-2020")));
  const retained2020 = filterVenueActivityByConnections(data, 1, false).data.venues.find((venue) => venue.venueCodes.includes("with-2020"));
  assert.ok(retained2020.presence.find((presence) => presence.year === 2020).isRecorded);
  assert.throws(() => filterVenueActivityByConnections(data, 15, false), RangeError);
  assert.throws(() => filterVenueActivityByConnections(data, 0, false), RangeError);
  assert.throws(() => filterVenueActivityByConnections(data, 1.5, false), RangeError);
});

test("continuous mode requires a long enough run and skips 2020 without breaking 2019–2021", () => {
  const data = connectionFixture();
  const continuous = filterVenueActivityByConnections(data, 4, true);
  assert.deepEqual(continuous.data.venues.map((venue) => venue.venueCodes[0]), ["run"]);
  const summary = summarizeVenueConnections(continuous.data.venues[0], selectVenueConnectionYears(data.years));
  assert.equal(summary.eligibleRecordedYearCount, 4);
  assert.equal(summary.longestContinuousYearCount, 4);
  assert.equal(summary.raw, continuous.data.venues[0].raw);
  const gaps = data.venues.find((venue) => venue.venueCodes.includes("gaps"));
  assert.equal(summarizeVenueConnections(gaps, continuous.eligibleYears).longestContinuousYearCount, 1);
  assert.equal(filterVenueActivityByConnections(data, 5, true).data.venues.length, 0);
  assert.equal(filterVenueActivityByConnections(data, 14, false).statusLabel, `Showing 0 of ${data.venues.length} venue groups.`);
});

test("fourteen eligible years satisfy both modes; repeated events and 2020 do not add years", () => {
  const data = activityData(venueActivityYears.map((year) => dataset(`${year}.csv`, [
    event("all", "All years", year), event("all", "All years", year),
  ])));
  const original = data.venues[0];
  const metrics = summarizeVenueConnections(original, selectVenueConnectionYears(data.years));
  assert.equal(metrics.eligibleRecordedYearCount, 14);
  assert.equal(metrics.longestContinuousYearCount, 14);
  for (const continuousOnly of [false, true]) {
    const result = filterVenueActivityByConnections(data, 14, continuousOnly);
    assert.equal(result.data.venues.length, 1);
    assert.equal(result.data.venues[0].events.length, 30);
    assert.deepEqual(result.data.years, venueActivityYears);
  }
});

test("circle connections join consecutive records, skip missing 2020, and leave other gaps unconnected", () => {
  const data = connectionFixture();
  const before = structuredClone(data);
  const run = data.venues.find((venue) => venue.venueCodes.includes("run"));
  const links = createVenueYearConnections(run.presence);
  assert.deepEqual(links.map((link) => [link.from.year, link.to.year]), [[2018, 2019], [2019, 2021], [2021, 2022]]);
  assert.equal(links[1].from, run.presence.find((presence) => presence.year === 2019));
  assert.equal(links[1].raw[0], links[1].from.raw[0]);
  assert.equal(links[1].raw.at(-1), links[1].to.raw.at(-1));
  assert.ok(!run.presence.find((presence) => presence.year === 2020).isRecorded);
  const gaps = data.venues.find((venue) => venue.venueCodes.includes("gaps"));
  assert.deepEqual(createVenueYearConnections(gaps.presence), []);
  const with2020 = data.venues.find((venue) => venue.venueCodes.includes("with-2020"));
  assert.deepEqual(createVenueYearConnections(with2020.presence).map((link) => [link.from.year, link.to.year]), [[2020, 2021]]);
  assert.deepEqual(data, before);
  const layout = createVenueActivityLayout(data, 720, 900);
  const column = layout.columns.find((column) => column.venue === run);
  for (const connection of column.connections) {
    const fromY = layout.years.find((year) => year.year === connection.from.year).y;
    const toY = layout.years.find((year) => year.year === connection.to.year).y;
    assert.ok(Math.abs(connection.y1 - fromY - layout.circleRadius) < 1e-9);
    assert.ok(Math.abs(connection.y2 - toY + layout.circleRadius) < 1e-9);
    assert.ok(connection.y2 > connection.y1);
  }
});

test("the union combines aliases while showing all fifteen years", () => {
  const sources = [
    dataset("2021.csv", [event("16", "First name", 2021)]),
    dataset("2025.csv", [event("16", "Old name", 2025), event("23", "Only 2025", 2025)]),
    dataset("2026.csv", [event("16", "New name", 2026), event("318", "Only 2026", 2026)]),
  ];
  const data = activityData(sources);
  assert.deepEqual(data.years, Array.from({ length: 15 }, (_, index) => 2012 + index));
  assert.deepEqual(data.venues.map((venue) => venue.venueCodes), [["16"], ["23"], ["318"]]);
  assert.deepEqual(data.venues.map((venue) => venue.presence.map((year) => year.isRecorded)), [
    data.years.map((year) => [2021, 2025, 2026].includes(year)),
    data.years.map((year) => year === 2025),
    data.years.map((year) => year === 2026),
  ]);
  assert.deepEqual(data.venues[0].venueNames, ["First name", "Old name", "New name"]);
  assert.equal(data.venues[0].venueName, "New name");
  assert.equal(data.venues[0].site.matchMethod, "address-match");
});

test("a venue recorded in each source year gets all fifteen markers in ascending year order", () => {
  const data = createVenueActivityData(venueActivityFiles.map((fileName, index) =>
    dataset(fileName, [event("1", "All years", venueActivityYears[index])]),
  ));
  assert.deepEqual(data.venues[0].presence.map((presence) => presence.year), venueActivityYears);
  assert.ok(data.venues[0].presence.every((presence) => presence.isRecorded && presence.events.length === 1));
});

test("presence keeps all repeated source events and their raw rows without mutating the input", () => {
  const a = event("1", "A", 2025);
  const b = event("1", "A", 2025);
  const sources = [dataset("2025.csv", [a, b, a]), dataset("2026.csv", [])];
  const before = structuredClone(sources);
  const data = activityData(sources);
  const venue = data.venues[0];
  const presence = venue.presence.find((presence) => presence.year === 2025);
  assert.equal(presence.isRecorded, true);
  assert.deepEqual(presence.events, [a, b, a]);
  assert.equal(venue.events[0], a);
  assert.equal(venue.raw[0], a.raw);
  assert.equal(presence.raw[1], b.raw);
  assert.equal(data.raw[2], a.raw);
  assert.deepEqual(sources, before);
});

test("years come from records, unknown years remain explicit, and other source files are excluded", () => {
  const sources = [
    dataset("2025.csv", [event("A", "A", 2026), event("B", "B", null), event("C", "C", 2027)]),
    dataset("2026.csv", []),
    dataset("2027.csv", [event("D", "D", 2025)]),
  ];
  const data = activityData(sources);
  assert.deepEqual(data.sourceFiles, venueActivityFiles);
  assert.deepEqual(data.venues.map((venue) => venue.venueCodes), [["A"], ["B"], ["C"]]);
  assert.deepEqual(data.venues[0].presence.map((year) => year.isRecorded), data.years.map((year) => year === 2026));
  assert.ok(data.venues[1].presence.every((year) => !year.isRecorded));
  assert.equal(data.unassignedYearRecordCount, 2);
  assert.equal(data.raw.length, 3);
  assert.equal(sources[2].events.length, 1);
});

test("codes stay literal and the original missing-code group stays intact", () => {
  const data = activityData([
    dataset("2025.csv", [event("016", "Same name", 2025), event("16", "Same name", 2025), event("", "Unknown A", 2025)]),
    dataset("2026.csv", [event("", "Unknown B", 2026)]),
  ]);
  assert.deepEqual(data.venues.map((venue) => venue.venueCodes), [[""], ["016"], ["16"]]);
  assert.deepEqual(data.venues[0].presence.map((year) => year.isRecorded), data.years.map((year) => year >= 2025));
  assert.equal(data.venues[0].codeLabel, "Code not provided");
});

test("missing source files are errors while fifteen loaded empty files give an empty view", () => {
  assert.throws(() => createVenueActivityData(venueActivityFiles
    .filter((fileName) => fileName !== "2024.csv")
    .map((fileName) => dataset(fileName, []))), /2024\.csv/);
  const data = activityData([]);
  assert.deepEqual(data.venues, []);
  assert.deepEqual(data.raw, []);
});

test("equal-year columns sort A–Z by display name with stable natural ordering and retain source rows", () => {
  const records = [
    event("z", "zulu", 2021), event("b", "!Beta", 2021),
    event("a1", "Álpha", 2021), event("a2", "alpha", 2021),
    event("10", "Venue 10", 2021), event("2", "Venue 2", 2021),
  ];
  const data = activityData([dataset("2021.csv", records)]);
  assert.deepEqual(data.venues.map((venue) => venue.venueCodes), [["a1"], ["a2"], ["b"], ["2"], ["10"], ["z"]]);
  assert.deepEqual(data.raw, records.map((record) => record.raw));
  assert.equal(data.venues[0].raw[0], records[2].raw);
  const reversed = [...data.venues].reverse();
  const before = [...reversed];
  const sorted = sortVenuesByRecordedYears(reversed);
  assert.deepEqual(reversed, before);
  assert.notEqual(sorted, reversed);
  assert.equal(sorted[0], data.venues[1]);
});

test("more recorded years sort first even when a one-year venue has more event records", () => {
  const sources = venueActivityFiles.map((fileName, index) => {
    const year = venueActivityYears[index];
    const records = [event("six", "Zulu", year)];
    if (index < 5) records.push(event("five-b", "Beta", year), event("five-a", "Alpha", year));
    if (index === 1 || index === 5) records.push(event("two", "Middle", year));
    if (index === 0) records.push(...Array.from({ length: 12 }, () => event("one", "A one-year venue", year)));
    return dataset(fileName, records);
  });
  const data = createVenueActivityData(sources);
  assert.deepEqual(data.venues.map((venue) => venue.venueCodes), [["six"], ["five-a"], ["five-b"], ["two"], ["one"]]);
  assert.deepEqual(data.venues.map((venue) => venue.recordedYearCount), [15, 5, 5, 2, 1]);
  assert.equal(data.venues[4].events.length, 12);
  assert.equal(data.venues[0].events.length, 15);
  assert.deepEqual(data.raw, sources.flatMap((source) => source.raw));
});

test("all columns and fifteen year rows fit the measured dimensions with no overflow", () => {
  const data = activityData([
    dataset("2025.csv", Array.from({ length: 913 }, (_, index) => event(String(index), `Venue ${index}`, 2025))),
    dataset("2026.csv", []),
  ]);
  for (const [width, height] of [[296, 180], [720, 260], [1440, 320], [1440, 900]]) {
    const layout = createVenueActivityLayout(data, width, height);
    assert.equal(layout.columns.length, 913);
    assert.ok(layout.axisWidth + layout.svgWidth <= width);
    assert.ok(layout.lastYearY - layout.firstYearY > 0);
    assert.equal(layout.years.length, 15);
    for (let index = 1; index < layout.years.length; index += 1) {
      const gap = layout.years[index].y - layout.years[index - 1].y;
      assert.ok(gap > 0);
      assert.ok(gap > layout.circleRadius * 2);
    }
    assert.ok(layout.firstYearY > 0);
    assert.ok(layout.lastYearY < height);
    assert.ok(layout.nameBaselineY < layout.firstYearY);
    assert.ok(layout.labelFontSize > 0);
    assert.ok(layout.circleRadius > 0 && layout.circleRadius <= 1.5);
    assert.ok(layout.connectionStrokeWidth > 0 && layout.connectionStrokeWidth < layout.circleRadius);
    assert.ok(Math.abs(layout.gridTop - layout.nameBaselineY - 8) < 1e-9);
    for (const column of layout.columns) {
      assert.ok(column.x - layout.circleRadius >= 0);
      assert.ok(column.x + layout.circleRadius <= layout.svgWidth);
      assert.ok(column.labelFontSize > 0);
      assert.ok(column.venue.venueName.length * column.labelFontSize * 0.65 <= layout.nameBaselineY - 8 + 1e-9);
    }
    for (const year of layout.years) {
      assert.ok(year.y - layout.circleRadius > layout.nameBaselineY);
      assert.ok(year.y + layout.circleRadius <= height);
    }
    const spacing = layout.columns[1].x - layout.columns[0].x;
    assert.ok(layout.circleRadius * 2 < spacing);
    assert.ok(Math.abs(layout.years.at(-1).y + layout.yearStep / 2 - (height - 8)) < 1e-9);
    assert.ok(layout.labelFontSize < spacing);
  }
  const narrow = createVenueActivityLayout(data, 296, 180);
  const wide = createVenueActivityLayout(data, 1440, 320);
  assert.ok(narrow.circleRadius < wide.circleRadius);
  assert.ok(narrow.labelFontSize < wide.labelFontSize);
  const tall = createVenueActivityLayout(data, 1440, 900);
  assert.ok(tall.yearStep > 22);
});

test("long combined names fit the label area and an unmeasured container has finite dimensions", () => {
  const data = activityData([
    dataset("2025.csv", [event("1", "A very long venue name ".repeat(20), 2025), event("2", "Short name", 2025)]),
    dataset("2026.csv", []),
  ]);
  const layout = createVenueActivityLayout(data, 320, 180);
  assert.ok(data.venues[0].venueName.length * layout.labelFontSize * 0.65 <= layout.nameBaselineY - 8 + 1e-9);
  assert.ok(layout.columns[0].labelFontSize < layout.columns[1].labelFontSize);
  const initial = createVenueActivityLayout(data, 0, 0);
  for (const value of [initial.svgWidth, initial.svgHeight, initial.labelFontSize, initial.circleRadius, initial.connectionStrokeWidth]) {
    assert.ok(Number.isFinite(value));
    assert.ok(value >= 0);
  }
});

test("measured vertical labels move the grid up to an eight-pixel gap", () => {
  const data = activityData([dataset("2021.csv", [event("1", "A venue", 2021)])]);
  const layout = createVenueActivityLayout(data, 720, 320, 37.5);
  assert.equal(layout.nameBaselineY, 45.5);
  assert.equal(layout.gridTop, 53.5);
  assert.ok(layout.firstYearY > layout.gridTop);
  assert.ok(layout.lastYearY < 320);
  const tall = createVenueActivityLayout(data, 720, 900, 500);
  assert.ok(tall.gridTop < 900 * 0.2, "long label measurements must not consume a large part of the screen");
  assert.ok(tall.lastYearY - tall.firstYearY > 900 * 0.75, "year rows must use the available vertical space");
});

test("comparison addresses normalize road suffixes, postcode spacing, dashes and locality without rewriting Saint", () => {
  assert.equal(normalizeVenueSiteAddress("14–16 Grassmarket, Edinburgh, EH1 2JU"), "14-16 grassmarket");
  assert.equal(normalizeVenueSiteAddress("2 Roxburgh Pl\nEdinburgh"), "2 roxburgh place");
  assert.equal(normalizeVenueSiteAddress("St Giles, High St, Edinburgh"), "st giles high street");
  assert.equal(normalizeVenueSitePostcode("EH12JU"), "EH12JU");
  assert.equal(normalizeVenueSitePostcode("", "2 Roxburgh Place, Edinburgh EH8 9SU"), "EH89SU");
  assert.equal(normalizeVenueSitePostcode("Online Venue"), null);
  assert.equal(normalizeVenueSitePostcode("EH1 1AA", "10 High Street EH2 2BB"), null);
});

test("address evidence combines different codes and retains every original code, alias and repeated row", () => {
  const a = event("5a", "The Stand Comedy Club", 2025, "a", { address: "5 York Place", postcode: "EH1 3EB" });
  const b = event("5", "The Stand", 2026, "b", { address: "5 York Pl, Edinburgh", postcode: "EH13EB" });
  const data = activityData([dataset("2025.csv", [a, a]), dataset("2026.csv", [b])]);
  assert.equal(data.venues.length, 1);
  const site = data.venues[0].site;
  assert.deepEqual(data.venues[0].venueCodes, ["5a", "5"]);
  assert.equal(site.aliases.length, 2);
  assert.deepEqual(site.events, [a, a, b]);
  assert.deepEqual(site.raw, [a.raw, a.raw, b.raw]);
  assert.deepEqual(site.aliases.flatMap((alias) => alias.events), [a, a, b]);
  assert.equal(groupEventsByVenueSite([b, a])[0].siteId, site.siteId);
});

test("a reused code stays intact and cannot bridge its different locations to other codes", () => {
  const a = event("336", "Venue", 2025, "a", { address: "46 St Stephen Street", postcode: "EH3 5AL" });
  const b = event("336", "Venue", 2026, "b", { address: "Archerfield Estate, Dirleton", postcode: "EH39 5HQ", latitude: 56.04 });
  const c = event("new-code", "Venue", 2026, "c", { ...a.venue, code: "new-code" });
  const sites = groupEventsByVenueSite([a, b, c]);
  assert.equal(sites.length, 2);
  assert.deepEqual(sites[0].events, [a, b]);
  assert.deepEqual(sites[1].events, [c]);
  assert.equal(sites[0].matchMethod, "venue-code");
  assert.match(sites[0].matchExplanation, /not one confirmed physical site/);
});

test("shared coordinates and a broad street or postcode alone cannot join venues", () => {
  const a = event("1", "Gardens", 2025, "a", { address: "George Square" });
  const b = event("2", "Studios", 2025, "b", { address: "George Square" });
  const c = event("3", "Other place", 2025, "c", { address: "A different street" });
  assert.equal(groupEventsByVenueSite([a, b, c]).length, 3);
});

test("coordinate drift does not split existing codes or prevent matching a complete address", () => {
  const records = [0, 0.0003, 0.0006].map((offset, index) => event(String(index), "Place", 2025, "same", {
    address: "10 High Street", latitude: 55.95 + offset,
  }));
  const sites = groupEventsByVenueSite(records);
  assert.equal(sites.length, 1);
  assert.equal(sites[0].matchMethod, "address-match");
  assert.deepEqual(sites[0].events.map((e) => e.venue.latitude), records.map((e) => e.venue.latitude));
});

test("reviewed building rules accept known coordinate outliers but require matching address and postcode", () => {
  const a = event("EFI", "Edinburgh Futures Institute", 2024, "a", {
    address: "1 Lauriston Place\nEdinburgh", postcode: "EH3 9EF", longitude: -3.1952571,
  });
  const b = event("11162", "Edinburgh International Book Festival", 2026, "b", {
    address: "Edinburgh Futures Institute, The University of Edinburgh, 1 Lauriston Place, Edinburgh",
    postcode: "EH3 9EF", longitude: -3.19287,
  });
  const c = event("tent", "Spiegeltent", 2026, "c", {
    address: "Nightingale Way, Quartermile, Edinburgh", postcode: "EH3 9EF", longitude: -3.19287,
  });
  const sites = groupEventsByVenueSite([a, b, c]);
  assert.equal(sites.length, 2);
  assert.equal(sites[0].siteId, "site:edinburgh-futures-institute");
  assert.deepEqual(sites[0].events, [a, b]);
  assert.equal(sites[0].matchMethod, "reviewed-site");
  assert.equal(groupEventsByVenueSite([{ ...a, venue: { ...a.venue, postcode: "EH1 1AA" } }])[0].matchMethod, "address-match");
});

test("online and digital records cannot enter physical site groups even with a real building address", () => {
  const location = { address: "43-45 High Street", postcode: "EH1 1SR" };
  const a = event("30", "Scottish Storytelling Centre", 2025, "a", location);
  const b = event("NET", "Netherbow Theatre", 2026, "b", location);
  const c = event("online", "Scottish International Storytelling Festival - Online", 2026, "c", location);
  const sites = groupEventsByVenueSite([a, b, c]);
  assert.equal(sites.length, 2);
  assert.deepEqual(sites[0].events, [a, b]);
  assert.equal(sites[1].matchMethod, "virtual");
});

test("unlocated and online descriptions retain their original code groups and stable IDs", () => {
  const blank = { address: "", postcode: "", latitude: null, longitude: null };
  const a = event("", "Unknown A", 2025, "a", blank);
  const b = event("", "Unknown B", 2026, "b", blank);
  const virtualAddress = { address: "180 High Street", postcode: "EH1 1QS" };
  const c = event("web", "Online A", 2025, "c", virtualAddress);
  const d = event("web", "Online B", 2026, "d", virtualAddress);
  const sites = groupEventsByVenueSite([a, b, c, d]);
  assert.equal(sites.length, 2);
  assert.deepEqual(new Set(sites.map((site) => site.siteId)), new Set(groupEventsByVenueSite([d, c, b, a]).map((site) => site.siteId)));
  assert.equal(groupEventsByVenueSite([a, { ...a, year: 2026 }]).length, 1);
});

test("automatic grouping rejects invalid postcodes and administrative addresses", () => {
  for (const location of [
    { postcode: "not a postcode" },
    { address: "180 High Street", postcode: "EH1 1QS" },
  ]) {
    const sites = groupEventsByVenueSite([event("a", "A", 2025, "a", { address: "10 High Street", ...location }),
      event("b", "B", 2026, "b", { address: "10 High Street", ...location })]);
    assert.equal(sites.length, 2);
    assert.ok(sites.every((site) => site.matchMethod === "venue-code"));
  }
});

test("multi-site source descriptions cannot become an alias of one building", () => {
  const location = { address: "11 Hasties Close", postcode: "EH1 1HJ" };
  const sites = groupEventsByVenueSite([event("1", "La Belle Angele CIC", 2025, "a", location),
    event("2", "La Belle Angele, Sneaky Pete's and Bannerman's Bar", 2026, "b", location)]);
  assert.equal(sites.length, 2);
  assert.equal(sites[1].matchMethod, "venue-code");
  const storytellingAddress = { address: "43-45 High Street", postcode: "EH1 1SR" };
  const storytelling = groupEventsByVenueSite([
    event("Centre", "Scottish Storytelling Centre", 2012, "a", storytellingAddress),
    event("Tour", "Scottish Storytelling Centre & Museum of Edinburgh", 2012, "b", storytellingAddress),
  ]);
  assert.equal(storytelling.length, 2);
});

test("2012–2026 CSV integration retains all rows, only merges original code groups, and reduces columns", async () => {
  // Execute the real parser outside Vite; only its BASE_URL expression and bare
  // D3 import need adapting to a Node data URL. No loader behavior is replaced.
  const source = stripTypeScriptTypes(await readFile(new URL("../src/lib/utils/festivalData.ts", import.meta.url), "utf8"))
    .replaceAll("import.meta.env.BASE_URL", JSON.stringify("/edinburgh_festivals/"))
    .replace('from "d3";', `from ${JSON.stringify(import.meta.resolve("d3"))};`);
  const { createFestivalDataset, festivalDataFiles } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.deepEqual(festivalDataFiles, venueActivityFiles);
  const sources = await Promise.all(venueActivityFiles.map(async (file) =>
    createFestivalDataset(file, d3.csvParse(await readFile(new URL(`../public/data/${file}`, import.meta.url), "utf8"))),
  ));
  const data = createVenueActivityData(sources);
  const events = sources.flatMap((source) => source.events);
  assert.equal(data.years.length, 15);
  assert.equal(data.years[0], 2012);
  assert.equal(data.years.at(-1), 2026);
  const originalCodeGroups = d3.groups(events, (event) => event.venue.code);
  assert.equal(data.sourceVenueCodeCount, originalCodeGroups.length);
  assert.ok(data.venues.length < originalCodeGroups.length);
  const columnForEvent = new Map(data.venues.flatMap((venue) => venue.events.map((event) => [event, venue.venueKey])));
  for (const [, records] of originalCodeGroups) {
    assert.equal(new Set(records.map((event) => columnForEvent.get(event))).size, 1, "an original code group must never split");
  }
  assert.equal(data.raw.length, events.length);
  assert.equal(data.venues.reduce((sum, venue) => sum + venue.events.length, 0), events.length);
  assert.equal(new Set(data.venues.flatMap((venue) => venue.events)).size, events.length);
  assert.equal(data.venues.reduce((sum, venue) => sum + venue.site.aliases.reduce((n, alias) => n + alias.events.length, 0), 0), events.length);
  for (const venue of data.venues) {
    assert.equal(venue.presence.reduce((sum, year) => sum + year.events.length, 0), venue.events.length);
    assert.ok(venue.raw.every((raw, index) => raw === venue.events[index].raw));
  }
  const roxy = data.venues.find((venue) => venue.venueKey === "site:assembly-roxy");
  assert.ok(roxy.venueCodes.includes("139"));
  assert.ok(roxy.venueCodes.includes("1424"));
  assert.ok(roxy.recordedYearCount >= 6);
  const storytelling = data.venues.find((venue) => venue.venueKey === "site:scottish-storytelling-centre");
  assert.ok(storytelling.venueNames.includes("Netherbow Theatre"));
  assert.ok(storytelling.venueNames.includes("Storytelling Court"));
  assert.ok(storytelling.venueNames.every((name) => !/online/i.test(name)));
  const efi = data.venues.find((venue) => venue.venueKey === "site:edinburgh-futures-institute");
  assert.ok(efi.venueNames.includes("Edinburgh International Book Festival"));
  assert.ok(efi.venueNames.includes("Venue A"));
  const recentEvents = events.filter((event) => event.year >= 2021);
  const recentSites = groupEventsByVenueSite(recentEvents);
  assert.ok(recentSites.length < new Set(recentEvents.map((event) => event.venue.code)).size);
  for (const [oldCode, newCode] of [["5a", "5"], ["158a", "158"], ["293a", "293"]]) {
    assert.ok(recentSites.some((site) => {
      const codes = new Set(site.events.map((event) => event.venue.code));
      return codes.has(oldCode) && codes.has(newCode);
    }));
  }
  const reused = data.venues.filter((venue) => venue.venueCodes.includes("336"));
  assert.equal(reused.length, 1);
  assert.ok(reused.some((venue) => venue.venueNames.includes("ætla Fine Jewellery")));
  assert.ok(reused.some((venue) => venue.venueNames.includes("Archerfield Walled Garden")));
  assert.equal(reused[0].site.matchMethod, "venue-code");
  const eligibleYears = selectVenueConnectionYears(data.years);
  const counts = [];
  for (let minimum = 1; minimum <= eligibleYears.length; minimum += 1) {
    const any = filterVenueActivityByConnections(data, minimum, false);
    const continuous = filterVenueActivityByConnections(data, minimum, true);
    assert.ok(continuous.data.venues.every((venue) => any.data.venues.includes(venue)));
    assert.equal(any.data.raw, data.raw);
    assert.equal(any.data.years, data.years);
    counts.push(any.data.venues.length);
  }
  assert.ok(counts.every((count, index) => index === 0 || count <= counts[index - 1]));
});

test("name, festival, missing location and coordinate changes cannot multiply a code group", () => {
  const a = event("same-code", "Old name", 2012, "a");
  const b = { ...event("same-code", "New name", 2026, "b", { address: "A different address", postcode: "", latitude: null, longitude: null }), festival: "Another festival" };
  const sites = groupEventsByVenueSite([a, b]);
  assert.equal(sites.length, 1);
  assert.deepEqual(sites[0].events, [a, b]);
  assert.deepEqual(sites[0].raw, [a.raw, b.raw]);
});

test("a mixed physical/online code cannot bridge virtual and physical code groups", () => {
  const location = { address: "43-45 High Street", postcode: "EH1 1SR" };
  const a = event("mixed", "Storytelling Centre", 2025, "a", location);
  const b = event("mixed", "Storytelling Online", 2026, "b", location);
  const c = event("NET", "Netherbow Theatre", 2026, "c", location);
  const sites = groupEventsByVenueSite([a, b, c]);
  assert.equal(sites.length, 2);
  assert.deepEqual(sites[0].events, [a, b]);
  assert.deepEqual(sites[1].events, [c]);
});

test("complete matching addresses can merge codes with missing coordinates, retaining nulls", () => {
  const location = { address: "10 High Street", latitude: null, longitude: null };
  const a = event("a", "A", 2012, "a", location);
  const b = event("b", "B", 2026, "b", location);
  const sites = groupEventsByVenueSite([a, b]);
  assert.equal(sites.length, 1);
  assert.equal(sites[0].matchMethod, "address-match");
  assert.ok(sites[0].aliases.every((alias) => alias.latitude === null && alias.longitude === null));
});
