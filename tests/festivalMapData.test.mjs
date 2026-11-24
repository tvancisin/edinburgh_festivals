import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import * as d3 from "d3";
import {
  combineFestivalMapDatasets,
  describeFestivalMapScope,
  filterFestivalDataWithCoordinates,
  groupFestivalMapEvents,
  listFestivalMapYears,
  selectFestivalMapEvents,
  selectFestivalMapYear,
} from "../src/lib/utils/festivalMapData.ts";

function event(festival, year, latitude = 55.95) {
  return Object.freeze({
    id: "repeated-id", festival, year,
    venue: Object.freeze({ latitude, longitude: -3.19 }),
    raw: Object.freeze({ ID: "repeated-id", Festival: festival, Year: year === null ? "" : String(year) }),
  });
}

const a2012 = event("A", 2012);
const b2026 = event("B", 2026, null);
const a2026 = event("A", 2026);
const unknownYear = event("A", null);
const events = Object.freeze([a2012, b2026, a2026, unknownYear, a2012]);

test("combines datasets in source order without dropping repeated IDs, repeated references, or unknown years", () => {
  const datasets = Object.freeze([
    Object.freeze({ fileName: "2026.csv", events: Object.freeze([a2012, b2026]) }),
    Object.freeze({ fileName: "2012.csv", events: Object.freeze([a2026, unknownYear, a2012]) }),
  ]);
  const combined = combineFestivalMapDatasets(datasets);
  assert.deepEqual(combined, events);
  assert.equal(combined[0], a2012);
  assert.equal(combined[4], a2012);
  assert.equal(combined[3].raw, unknownYear.raw);
  assert.equal(datasets[0].events.length, 2);
});

test("year options use known source years and exact year selection retains order and all matching rows", () => {
  assert.deepEqual(listFestivalMapYears(events), [2012, 2026]);
  assert.equal(selectFestivalMapYear(events, "all"), events);
  assert.deepEqual(selectFestivalMapYear(events, 2012), [a2012, a2012]);
  assert.deepEqual(selectFestivalMapYear(events, 2026), [b2026, a2026]);
  assert.deepEqual(selectFestivalMapYear(events, 2025), []);
  assert.deepEqual(listFestivalMapYears([unknownYear]), []);
});

test("festival selection resolves fresh year groups and stays empty when that festival is absent", () => {
  const firstYear = selectFestivalMapYear(events, 2026);
  const firstGroups = groupFestivalMapEvents(firstYear);
  assert.deepEqual(selectFestivalMapEvents(firstYear, firstGroups, "B"), [b2026]);
  const nextYear = selectFestivalMapYear(events, 2012);
  const nextGroups = groupFestivalMapEvents(nextYear);
  assert.deepEqual(selectFestivalMapEvents(nextYear, nextGroups, "B"), []);
  assert.equal(selectFestivalMapEvents(nextYear, nextGroups, null), nextYear);
  const allGroups = groupFestivalMapEvents(events);
  assert.deepEqual(selectFestivalMapEvents(events, allGroups, "A"), [a2012, a2026, unknownYear, a2012]);
  assert.equal(allGroups.A.events[2].raw, unknownYear.raw);
  assert.equal(selectFestivalMapEvents(undefined, undefined, "A"), undefined);
  assert.deepEqual(selectFestivalMapEvents([], {}, null), []);
});

test("coordinate filtering changes only plotted locations, and summaries retain the selected year scope", () => {
  const selected = selectFestivalMapYear(events, 2026);
  assert.deepEqual(filterFestivalDataWithCoordinates(selected), [a2026]);
  assert.equal(selected.length, 2);
  assert.equal(events.length, 5);
  assert.equal(describeFestivalMapScope(null, "all"), "All festivals, all years");
  assert.equal(describeFestivalMapScope("B", 2026), "B, 2026");
});

test("all 15 local CSVs reach the map without losing records, and per-year groups reconcile to source Year", async () => {
  const source = stripTypeScriptTypes(await readFile(new URL("../src/lib/utils/festivalData.ts", import.meta.url), "utf8"))
    .replaceAll("import.meta.env.BASE_URL", JSON.stringify("/edinburgh_festivals/"))
    .replace('from "d3";', `from ${JSON.stringify(import.meta.resolve("d3"))};`);
  const { createFestivalDataset, festivalDataFiles } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const datasets = await Promise.all(festivalDataFiles.map(async (fileName) =>
    createFestivalDataset(fileName, d3.csvParse(await readFile(new URL(`../public/data/${fileName}`, import.meta.url), "utf8"))),
  ));
  const combined = combineFestivalMapDatasets(datasets);
  assert.equal(combined.length, datasets.reduce((count, dataset) => count + dataset.raw.length, 0));
  assert.deepEqual(listFestivalMapYears(combined), Array.from({ length: 15 }, (_, index) => 2012 + index));
  const byYear = d3.group(combined, (record) => record.year);
  for (const year of listFestivalMapYears(combined)) {
    const selected = selectFestivalMapYear(combined, year);
    assert.deepEqual(selected, byYear.get(year));
    const groups = groupFestivalMapEvents(selected);
    assert.equal(Object.values(groups).reduce((count, group) => count + group.events.length, 0), selected.length);
    assert.ok(selected.every((record) => record.raw.Year === String(year)));
  }
  let offset = 0;
  for (const dataset of datasets) {
    for (const record of dataset.events) assert.equal(combined[offset++], record);
  }
});
