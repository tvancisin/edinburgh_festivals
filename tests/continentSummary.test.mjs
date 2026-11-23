import assert from "node:assert/strict";
import test from "node:test";
import {
  createEventContinentSummaries,
  createTicketContinentSummaries,
  selectContinentSummary,
} from "../src/lib/utils/continentSummary.ts";

function country(name, continent, eventCount, x) {
  return {
    countryKey: name,
    countryName: name,
    continent,
    x,
    width: 4,
    eventCount,
    purchaseRecordCount: 0,
    hasEventData: eventCount > 0,
    fillOpacity: 1,
    raw: { id: name, name, continent },
  };
}

test("summaries count represented countries, not their event records", () => {
  const countries = [
    country("A", "Europe", 1, 10),
    country("B", "Europe", 500, 15),
    country("C", "Europe", 0, 20),
    country("D", "Asia", 0, 27),
  ];
  const before = structuredClone(countries);
  const [europe, asia] = createEventContinentSummaries(countries);
  assert.equal(europe.countriesWithRecords, 2);
  assert.equal(europe.countriesWithoutRecords, 1);
  assert.equal(europe.countriesWithUnavailableCounts, 0);
  assert.equal(europe.totalCountries, 3);
  assert.equal(europe.x, 10);
  assert.equal(europe.width, 14);
  assert.equal(asia.countriesWithRecords, 0);
  assert.equal(asia.countriesWithoutRecords, 1);
  assert.match(asia.withoutRecordsLabel, /^1 country without event records$/);
  assert.deepEqual(countries, before);
  assert.equal(europe.raw[0], countries[0].raw);
  assert.equal(europe.countries[1], countries[1]);
});

test("missing and invalid counts stay distinct from countries with no records", () => {
  const countries = [
    country("A", "Africa", null, 0),
    country("B", "Africa", NaN, 5),
    country("C", "Africa", -1, 10),
    country("D", "Africa", Infinity, 15),
    country("E", "Africa", 0, 20),
  ];
  const [summary] = createEventContinentSummaries(countries);
  assert.equal(summary.countriesWithRecords, 0);
  assert.equal(summary.countriesWithoutRecords, 1);
  assert.equal(summary.countriesWithUnavailableCounts, 4);
  assert.equal(summary.totalCountries, 5);
  assert.match(summary.accessibleLabel, /4 countries with unavailable counts/);
});

test("ticket loading and unmatched aggregates never use the visual zero fallback", () => {
  const countries = [
    country("A", "Oceania", null, 0),
    country("B", "Oceania", null, 5),
    country("C", "Oceania", null, 10),
  ];
  const [loading] = createTicketContinentSummaries(countries, undefined);
  assert.equal(loading.countriesWithoutRecords, 0);
  assert.equal(loading.countriesWithUnavailableCounts, 3);
  const representation = {
    byKey: new Map([
      ["A", { purchaseRecordCount: 25 }],
      ["B", { purchaseRecordCount: 0 }],
    ]),
  };
  const [loaded] = createTicketContinentSummaries(countries, representation);
  assert.equal(loaded.countriesWithRecords, 1);
  assert.equal(loaded.countriesWithoutRecords, 1);
  assert.equal(loaded.countriesWithUnavailableCounts, 1);
  assert.match(loaded.withRecordsLabel, /^1 country with visitors$/);
});

test("an open continent resolves fresh counts after the festival selection changes", () => {
  const countries = [country("A", "Europe", 2, 0), country("B", "Europe", 0, 5)];
  const previous = createEventContinentSummaries(countries);
  const next = createEventContinentSummaries(countries.map((cell) => ({ ...cell, eventCount: 0 })));
  assert.equal(selectContinentSummary(previous, "Europe").countriesWithRecords, 1);
  assert.equal(selectContinentSummary(next, "Europe").countriesWithRecords, 0);
  assert.equal(selectContinentSummary(next, "Europe").countriesWithoutRecords, 2);
  assert.equal(selectContinentSummary(next, null), null);
  assert.equal(selectContinentSummary([], "Europe"), null);
  assert.deepEqual(createEventContinentSummaries([]), []);
});
