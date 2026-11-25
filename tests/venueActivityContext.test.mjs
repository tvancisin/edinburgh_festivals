import assert from "node:assert/strict";
import test from "node:test";
import { describeVenueActivityContext, findVenueActivityContext } from "../src/lib/utils/venueActivityContext.ts";
import { groupHexBinEventsByVenue } from "../src/lib/utils/hexBinPopup.ts";

function event(name, year, code = name) {
  return Object.freeze({
    id: "repeated-source-id", year,
    venue: Object.freeze({ name, code }),
    raw: Object.freeze({ ID: "repeated-source-id", Venue: name, "Venue code": code, Year: String(year) }),
  });
}

function venue(venueKey, venueName, events) {
  return Object.freeze({ venueKey, venueName, venueCodes: Object.freeze([...new Set(events.map((record) => record.venue.code))]), events: Object.freeze(events), raw: Object.freeze(events.map((record) => record.raw)) });
}

function selection(events) {
  return groupHexBinEventsByVenue({ events })[0];
}

test("a popup alias selects its all-year venue group without narrowing to the map year", () => {
  const historical = event("Old room name", 2012, "historical-code");
  const current = event("Current room name", 2026, "current-code");
  const unrelated = event("Old room name", 2012, "unrelated-code");
  const grouped = venue("site:one", "Reviewed site display name", [historical, current]);
  const other = venue("code:other", "Old room name", [unrelated]);
  const data = Object.freeze({ venues: Object.freeze([other, grouped]) });
  const result = findVenueActivityContext(data, selection([historical]));
  assert.deepEqual(result, [grouped]);
  assert.equal(result[0], grouped);
  assert.deepEqual(result[0].events, [historical, current]);
  assert.equal(result[0].raw[0], historical.raw);
  assert.deepEqual(data.venues, [other, grouped]);
  assert.deepEqual(findVenueActivityContext(data, structuredClone(selection([historical]))), [grouped], "selection survives reloaded or copied source records");
});

test("one popup name can select several existing groups, retaining chart order and excluding unrelated repeated IDs", () => {
  const first = event("Shared name", 2025, "a");
  const second = event("Shared name", 2026, "b");
  const unrelated = event("Shared name", 2025, "c");
  const a = venue("code:a", "Shared name", [first]);
  const b = venue("code:b", "Shared name", [second]);
  const c = venue("code:c", "Shared name", [unrelated]);
  const selected = selection([first, first, second]);
  assert.deepEqual(findVenueActivityContext({ venues: [b, c, a] }, selected), [b, a]);
  assert.deepEqual(findVenueActivityContext({ venues: [a, b, c] }, selection([structuredClone(first)])), [a]);
  assert.deepEqual(findVenueActivityContext({ venues: [a, b, c] }, selection([event("Shared name", 2025, "missing-code")])), []);
});

test("opening without a selection clears highlights; unavailable data and blank venue names are handled", () => {
  const unnamed = event("  ", 2026);
  const grouped = venue("code:blank", "Unnamed venue", [unnamed]);
  const selected = selection([unnamed]);
  const data = { venues: [grouped] };
  assert.deepEqual(findVenueActivityContext(data, null), []);
  assert.deepEqual(findVenueActivityContext(undefined, selected), []);
  assert.deepEqual(findVenueActivityContext(data, selected), [grouped]);
  assert.equal(describeVenueActivityContext(null, [], data), "");
  assert.match(describeVenueActivityContext(selected, [grouped], data), /Selected venue: Unnamed venue/);
});

test("year filters retain their membership and announce wholly or partly hidden selections", () => {
  const first = event("Shared name", 2012);
  const second = event("Shared name", 2020);
  const a = venue("code:a", "Shared name", [first]);
  const b = venue("code:b", "Shared name", [second]);
  const selected = selection([first, second]);
  const filtered = Object.freeze({ venues: Object.freeze([a]) });
  assert.match(describeVenueActivityContext(selected, [a], filtered), /Matching circles and connecting lines are highlighted/);
  assert.match(describeVenueActivityContext(selected, [a, b], filtered), /Some matching venue groups are hidden/);
  assert.match(describeVenueActivityContext(selected, [b], filtered), /Hidden by the current year filters/);
  assert.match(describeVenueActivityContext(selected, [], filtered), /No matching venue group is available/);
  assert.deepEqual(filtered.venues, [a]);
});

test("literal codes preserve leading zeros and the chart's original blank-code group", () => {
  const padded = event("Same name", 2026, "016");
  const numeric = event("Same name", 2026, "16");
  const blank = event("Same name", 2026, "");
  const a = venue("a", "Same name", [padded]);
  const b = venue("b", "Same name", [numeric]);
  const c = venue("blank", "Original blank-code group", [blank]);
  assert.deepEqual(findVenueActivityContext({ venues: [a, b, c] }, selection([structuredClone(padded)])), [a]);
  assert.deepEqual(findVenueActivityContext({ venues: [a, b, c] }, selection([structuredClone(blank)])), [c]);
});
