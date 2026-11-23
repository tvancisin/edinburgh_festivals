import assert from "node:assert/strict";
import test from "node:test";
import {
  countryDetailKey, continentDetailKey, createEventCountrySummaries,
  createVisitorCountrySummaries, moveCountryFocus, selectStripDetail, selectTabCountry,
} from "../src/lib/utils/countrySummary.ts";

function country(name, eventCount, x = 0) {
  return {
    countryKey: name, countryName: name, continent: "Europe", x, width: 4,
    eventCount, purchaseRecordCount: 0, hasEventData: eventCount > 0,
    fillOpacity: 1, raw: { id: name, name, continent: "Europe" },
  };
}

test("country counts retain exact values, zero, unavailable states, and raw rows", () => {
  const countries = [country("A", 1200), country("B", 1), country("C", 0), country("D", null), country("E", NaN)];
  const before = structuredClone(countries);
  const summaries = createEventCountrySummaries(countries);
  assert.deepEqual(summaries.map((item) => item.countLabel), [
    "1,200 event records", "1 event record", "0 event records", "Count unavailable", "Count unavailable",
  ]);
  assert.equal(summaries[0].raw, countries[0].raw);
  assert.equal(summaries[2].hasRecords, false);
  assert.equal(summaries[3].recordCount, null);
  assert.deepEqual(countries, before);
});

test("visitor labels use confirmed one-person-per-row aggregates, ignoring quantities", () => {
  const countries = [country("A", null), country("B", null), country("C", null), country("D", null)];
  const representation = { byKey: new Map([
    ["A", { purchaseRecordCount: 2, ticketRows: [{ raw: { ORDER_QUANTITY: "50" } }, { raw: { ORDER_QUANTITY: "100" } }] }],
    ["B", { purchaseRecordCount: 1 }],
    ["C", { purchaseRecordCount: 0 }],
  ]) };
  const summaries = createVisitorCountrySummaries(countries, representation);
  assert.deepEqual(summaries.map((item) => item.countLabel), ["2 visitors", "1 visitor", "0 visitors", "Count unavailable"]);
  const loading = createVisitorCountrySummaries(countries, undefined);
  assert.equal(loading[0].recordCount, null);
  assert.equal(loading[0].countLabel, "Count unavailable");
});

test("tooltip selection distinguishes country and continent keys and refreshes counts", () => {
  const first = createEventCountrySummaries([country("A", 4)]);
  const next = createEventCountrySummaries([country("A", 9)]);
  const continents = [{ continent: "A", accessibleLabel: "Continent A" }];
  assert.equal(selectStripDetail(continents, first, countryDetailKey("A")).summary.recordCount, 4);
  assert.equal(selectStripDetail(continents, next, countryDetailKey("A")).summary.recordCount, 9);
  assert.equal(selectStripDetail(continents, next, continentDetailKey("A")).kind, "continent");
  assert.equal(selectStripDetail(continents, next, null), null);
  assert.equal(selectStripDetail([], [], countryDetailKey("A")), null);
});

test("keyboard traversal follows the displayed order and stays within the list", () => {
  const summaries = createEventCountrySummaries([country("B", 4), country("A", 0), country("C", 8)]);
  assert.equal(selectTabCountry(summaries, null).countryKey, "B");
  assert.equal(selectTabCountry(summaries, "C").countryKey, "C");
  assert.equal(selectTabCountry(summaries, "removed").countryKey, "B");
  assert.equal(moveCountryFocus(summaries, "B", "ArrowDown").countryKey, "A");
  assert.equal(moveCountryFocus(summaries, "A", "ArrowUp").countryKey, "B");
  assert.equal(moveCountryFocus(summaries, "C", "Home").countryKey, "B");
  assert.equal(moveCountryFocus(summaries, "B", "End").countryKey, "C");
  assert.equal(moveCountryFocus(summaries, "B", "ArrowUp").countryKey, "B");
  assert.equal(moveCountryFocus(summaries, "C", "ArrowDown").countryKey, "C");
  assert.equal(moveCountryFocus([], "B", "ArrowDown"), null);
  assert.equal(moveCountryFocus(summaries, "B", "Enter"), null);
  assert.equal(selectTabCountry([], null), null);
});
