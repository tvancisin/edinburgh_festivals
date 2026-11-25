import assert from "node:assert/strict";
import test from "node:test";
import { createHexBinPopupContent, groupHexBinEventsByVenue } from "../src/lib/utils/hexBinPopup.ts";

function event(name, code = "same-code") {
  return Object.freeze({
    title: "Individual event title should not appear",
    venue: Object.freeze({ name, code, latitude: 55.95, longitude: -3.19 }),
    raw: Object.freeze({ Venue: name, "Venue code": code }),
  });
}

function bin(events) {
  return Object.freeze({ centerX: 0, centerY: 0, vertices: [], events: Object.freeze(events) });
}

test("venue-name grouping removes repeated display entries while retaining every source record", () => {
  const first = event("Venue A");
  const repeatedName = event(" Venue A ", "different-code");
  const distinctName = event("Venue B");
  const blank = event("  ");
  const unnamed = event("");
  const caseVariant = event("venue a");
  const input = bin([first, distinctName, repeatedName, first, blank, unnamed, caseVariant]);
  const result = groupHexBinEventsByVenue(input);
  assert.deepEqual(result.map((venue) => venue.venueName), ["Venue A", "Venue B", null, "venue a"]);
  assert.deepEqual(result[0].events, [first, repeatedName, first]);
  assert.equal(result[0].events[0], first);
  assert.equal(result[0].raw[1], repeatedName.raw);
  assert.deepEqual(result[2].events, [blank, unnamed]);
  assert.equal(result.reduce((sum, venue) => sum + venue.events.length, 0), input.events.length);
  assert.equal(input.events[2].venue.name, " Venue A ");
});

test("popups include all venue names without event titles, counts, or a ten-item limit", () => {
  const input = bin(Array.from({ length: 12 }, (_, index) => event(`Venue ${index + 1}`)));
  const content = createHexBinPopupContent(input);
  assert.equal((content.match(/<li>/g) ?? []).length, 12);
  assert.ok(content.includes('<span class="venue-name">Venue 12</span>'));
  assert.ok(!content.includes(input.events[0].title));
  assert.ok(!content.includes("event records"));
});

test("venue text is escaped, blank names are labeled, and an empty bin is explained", () => {
  const content = createHexBinPopupContent(bin([event('<img src=x onerror="alert(1)"> & O\'Brien'), event("")]));
  assert.ok(!content.includes("<img"));
  assert.ok(content.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; O&#39;Brien"));
  assert.ok(content.includes('<span class="venue-name">Unnamed venue</span>'));
  assert.ok(createHexBinPopupContent(bin([])).includes("No venue names are available."));
});

test("each venue has a Context button with an escaped accessible venue label", () => {
  const content = createHexBinPopupContent(bin([event('Venue "A"'), event('Venue "A"'), event("Venue B")]));
  assert.equal((content.match(/class="venue-context"/g) ?? []).length, 2);
  assert.ok(content.includes('type="button" aria-haspopup="dialog" aria-label="Context for Venue &quot;A&quot;">Context</button>'));
  assert.ok(content.includes('aria-label="Context for Venue B"'));
});
