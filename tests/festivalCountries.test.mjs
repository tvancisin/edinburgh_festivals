import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as d3 from "d3";
import {
  addCountryRepresentationToLayout,
  aggregateCountryRepresentation,
  countryOpacity,
  createCountryCatalog,
  describeCountryRepresentation,
  getHexCountryKey,
  relateEventCountries,
  selectFestivalEvents,
  splitEventCountryValues,
} from "../src/lib/utils/festivalCountries.ts";
import { createWorldHexData, createWorldHexLayout, validateHexWorldFile } from "../src/lib/utils/worldHexMap.ts";

const sourceHexes = validateHexWorldFile(JSON.parse(fs.readFileSync(
  new URL("../public/data/hex-world-110cols.json", import.meta.url), "utf8",
)));
const hexData = createWorldHexData(sourceHexes);
const catalog = createCountryCatalog(hexData);
const row = (country, id = "same-id") => ({ id, country, raw: { ID: id, Country: country } });

test("multi-country lists preserve South Korea's comma and resolve spelling aliases", () => {
  assert.deepEqual(splitEventCountryValues("KOREA, REPUBLIC OF"), ["South Korea"]);
  const relation = relateEventCountries(row("KOREA, REPUBLIC OF; United States / Taiwan (Republic of China), Czech Republic, North Macedonia, Bolivarian Republic of Venezuela"), catalog);
  assert.deepEqual(relation.countryKeys, ["410", "840", "158", "203", "807", "862"]);
  assert.deepEqual(relation.unmatchedValues, []);
  assert.deepEqual(splitEventCountryValues("N/A"), []);
  assert.deepEqual(splitEventCountryValues("UK, N/A"), ["UK"]);
});

test("one count per resolved country per row, without deduplicating repeated event IDs", () => {
  const events = [row("USA, United States, Canada"), row("United States")];
  const before = JSON.stringify(events);
  const stats = aggregateCountryRepresentation(events, catalog);
  assert.equal(stats.byKey.get("840").eventCount, 2);
  assert.equal(stats.byKey.get("124").eventCount, 1);
  assert.equal(stats.eventCount, 2);
  assert.equal(stats.byKey.get("840").eventRows[0], events[0].raw);
  assert.equal(stats.relations[0].raw, events[0].raw);
  assert.equal(JSON.stringify(events), before);
});

test("UK nations remain separate and generic UK counts are never attributed to them", () => {
  const stats = aggregateCountryRepresentation([
    row("UNITED KINGDOM - SCOTLAND"), row("Scotland"), row("UK"),
    row("England / Australia"), row("UNITED KINGDOM - WALES"),
    row("UNITED KINGDOM - NORTHERN IRELAND"),
  ], catalog);
  assert.equal(stats.byKey.get("826:scotland").eventCount, 2);
  assert.equal(stats.byKey.get("826:england").eventCount, 1);
  assert.equal(stats.byKey.get("826:wales").eventCount, 1);
  assert.equal(stats.byKey.get("826:northern-ireland").eventCount, 1);
  assert.equal(stats.byKey.get("826").eventCount, 1);
  assert.equal(stats.byKey.get("826").hasHexagons, false);
});

test("missing and unknown countries are retained and not inferred", () => {
  const stats = aggregateCountryRepresentation([
    row(""), row("COUNTRY NOT DECLARED"), row("Soviet Union"), row("France, Unknownland"),
  ], catalog);
  assert.equal(stats.eventCount, 4);
  assert.equal(stats.missingCountryCount, 2);
  assert.equal(stats.unmatchedEventCount, 2);
  assert.equal(stats.byKey.get("250").eventCount, 1);
  assert.equal(stats.byKey.get("643").eventCount, 0);
  assert.deepEqual(stats.unmatchedValues.map((v) => v.value), ["Soviet Union", "Unknownland"]);
  assert.equal(stats.raw.length, 4);
});

test("selected arcs override previews, reset restores all events, and empty selection stays empty", () => {
  const a = { festival: "A", events: [row("France")] };
  const b = { festival: "B", events: [row("Canada"), row("Canada")] };
  const groups = { A: a, B: b };
  assert.deepEqual(selectFestivalEvents(groups), [...a.events, ...b.events]);
  assert.equal(selectFestivalEvents(groups, a, b), a.events);
  assert.equal(selectFestivalEvents(groups, undefined, b), b.events);
  assert.deepEqual(selectFestivalEvents(groups, { festival: "Empty", events: [] }, b), []);
  assert.equal(selectFestivalEvents(undefined), undefined);
  assert.deepEqual(selectFestivalEvents({}), []);
  assert.equal(aggregateCountryRepresentation(selectFestivalEvents(groups, a), catalog).byKey.get("124").eventCount, 0);
  assert.equal(aggregateCountryRepresentation(selectFestivalEvents(groups), catalog).byKey.get("124").eventCount, 2);
});

test("opacity is monotonic, zero is faint, US/Hawaii share counts, and geometry is preserved", () => {
  const stats = aggregateCountryRepresentation([
    row("United States"), row("United States"), row("United States"), row("France"),
  ], catalog);
  assert.equal(stats.byKey.get("840").fillOpacity, countryOpacity.maximum);
  assert.ok(stats.byKey.get("250").fillOpacity > stats.byKey.get("124").fillOpacity);
  assert.ok(stats.byKey.get("250").fillOpacity < stats.byKey.get("840").fillOpacity);
  assert.equal(stats.byKey.get("124").fillOpacity, countryOpacity.noRecords);
  const single = aggregateCountryRepresentation([row("France")], catalog);
  assert.equal(single.byKey.get("250").fillOpacity, countryOpacity.maximum);
  const layout = createWorldHexLayout(hexData, 1920, 1080, 960, 490);
  const before = JSON.stringify(layout);
  const display = addCountryRepresentationToLayout(layout, stats, "Test festival");
  display.panels.forEach((panel, p) => panel.cells.forEach((cell, i) => {
    assert.equal(cell.points, layout.panels[p].cells[i].points);
    assert.equal(cell.raw, layout.panels[p].cells[i].raw);
    assert.ok(cell.accessibleLabel.includes("Test festival"));
    if (cell.countryId === "840") {
      assert.equal(cell.eventCount, 3);
      assert.equal(cell.fillOpacity, countryOpacity.maximum);
    }
    if (cell.countryId === "826") assert.notEqual(getHexCountryKey(cell), "826");
  }));
  assert.equal(JSON.stringify(layout), before);
  const pending = addCountryRepresentationToLayout(layout, undefined, "All festivals");
  assert.equal(pending.panels[0].cells[0].eventCount, null);
  assert.match(pending.panels[0].cells[0].accessibleLabel, /unavailable/);
  const empty = aggregateCountryRepresentation([], catalog);
  assert.ok(empty.countries.every((country) => country.fillOpacity === countryOpacity.noRecords));
  assert.match(describeCountryRepresentation(empty, "Empty festival"), /No mapped country associations/);
});

test("current CSV counts include every row and report the known unmatched source values", () => {
  const source = d3.csvParse(fs.readFileSync(new URL("../public/data/festivals_2025.csv", import.meta.url), "utf8"));
  const events = source.map((raw) => ({ country: raw.Country, festival: raw.Festival, raw }));
  const stats = aggregateCountryRepresentation(events, catalog);
  assert.equal(stats.eventCount, 5544);
  assert.equal(stats.missingCountryCount, 1101);
  assert.equal(stats.byKey.get("826:england").eventCount, 1677);
  assert.equal(stats.byKey.get("826:scotland").eventCount, 1283);
  assert.equal(stats.byKey.get("826:wales").eventCount, 42);
  assert.equal(stats.byKey.get("826:northern-ireland").eventCount, 21);
  assert.equal(stats.byKey.get("826").eventCount, 78);
  assert.equal(stats.byKey.get("410").eventCount, 11);
  const singleRecordCountries = stats.countries.filter((country) => country.hasHexagons && country.eventCount === 1);
  assert.ok(singleRecordCountries.length > 0);
  for (const country of singleRecordCountries) {
    assert.ok(country.fillOpacity >= countryOpacity.minimum, `${country.name} must remain visible with one record`);
    assert.ok(country.fillOpacity < countryOpacity.maximum);
  }
  const china = stats.byKey.get("156");
  const india = stats.byKey.get("356");
  assert.equal(china.eventCount, 43);
  assert.equal(india.eventCount, 11);
  assert.ok(china.fillOpacity - india.fillOpacity >= 0.1,
    "China and India should differ by at least ten opacity percentage points");
  assert.deepEqual(stats.unmatchedValues.map((v) => [v.value, v.eventCount]), [["Soviet Union", 1], ["GIBRALTAR", 1]]);
  const groups = Object.fromEntries([...d3.group(events, (event) => event.festival)].map(([festival, events]) => [festival, { festival, events }]));
  const totals = new Map();
  for (const group of Object.values(groups)) {
    const selected = aggregateCountryRepresentation(selectFestivalEvents(groups, group), catalog);
    assert.equal(selected.eventCount, group.events.length);
    for (const country of selected.countries) totals.set(country.key, (totals.get(country.key) ?? 0) + country.eventCount);
  }
  for (const country of stats.countries) assert.equal(totals.get(country.key), country.eventCount);
  assert.equal(aggregateCountryRepresentation(groups["Edinburgh International Science Festival"].events, catalog).maximumEventCount, 0);
});
