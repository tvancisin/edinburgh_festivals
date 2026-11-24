import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import * as d3 from "d3";

const source = stripTypeScriptTypes(
  await readFile(new URL("../src/lib/utils/festivalData.ts", import.meta.url), "utf8"),
)
  .replaceAll("import.meta.env.BASE_URL", JSON.stringify("/edinburgh_festivals/"))
  .replace('from "d3";', `from ${JSON.stringify(import.meta.resolve("d3"))};`);

let moduleId = 0;
function freshLoader() {
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${moduleId++}`);
}

const csv = d3.csvFormat([
  {
    ID: "duplicate-id", Festival: "Same festival", Title: "First", Year: "2024",
    "Genre tags": "Theater, Comedy, ", Latitude: "55.95", Longitude: "-3.19",
    "Performers #": "2", "Lowest full price": "0", "Lowest concession price": "",
    "First performance date": "2024-02-29", "Last performance date": "2024-03-01",
    "Last updated": "2024-02-29 13:45:10",
  },
  {
    ID: "duplicate-id", Festival: "Same festival", Title: "Second", Year: "bad",
    "Genre tags": "", Latitude: "", Longitude: "invalid",
    "Performers #": "", "Lowest full price": "Infinity", "Lowest concession price": "bad",
    "First performance date": "2025-02-29", "Last performance date": "",
    "Last updated": "2025-01-01 24:00:00",
  },
]);

test("loads every year, formats without grouping or dropping rows, logs once, and reuses the cache", async (t) => {
  const { loadFestivalDatasets, festivalDataFiles, hasFestivalEvents } = await freshLoader();
  const requestedFiles = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requestedFiles.push(String(url).split("/").at(-1));
    return new Response(csv);
  });
  const log = t.mock.method(console, "log", () => {});

  const pending = loadFestivalDatasets();
  assert.equal(loadFestivalDatasets(), pending);
  const datasets = await pending;

  assert.deepEqual(requestedFiles, Array.from({ length: 15 }, (_, index) => `${2012 + index}.csv`));
  assert.deepEqual(datasets.map((dataset) => dataset.fileName), festivalDataFiles);
  assert.equal(log.mock.callCount(), 15);
  assert.equal(hasFestivalEvents(datasets), true);
  for (const [index, dataset] of datasets.entries()) {
    assert.equal(log.mock.calls[index].arguments[0], `Formatted festival dataset (${dataset.fileName}):`);
    assert.equal(log.mock.calls[index].arguments[1], dataset);
    assert.equal(dataset.events.length, 2);
    assert.equal(dataset.raw.length, 2);
    const [first, second] = dataset.events;
    assert.deepEqual(dataset.events.map((event) => event.title), ["First", "Second"]);
    assert.equal(first.raw, dataset.raw[0]);
    assert.equal(second.raw, dataset.raw[1]);
    assert.equal(first.year, 2024); // Use the row's year, not its filename.
    assert.equal(first.raw.Year, "2024");
    assert.deepEqual(first.genreTags, ["Theater", "Comedy"]);
    assert.equal(first.venue.latitude, 55.95);
    assert.equal(first.venue.longitude, -3.19);
    assert.equal(first.performerCount, 2);
    assert.equal(first.lowestFullPrice, 0);
    assert.equal(first.lowestConcessionPrice, null);
    assert.ok(first.firstPerformanceDate instanceof Date);
    assert.equal(first.firstPerformanceDate.getFullYear(), 2024);
    assert.equal(first.firstPerformanceDate.getMonth(), 1);
    assert.equal(first.firstPerformanceDate.getDate(), 29);
    assert.equal(first.lastUpdated.getHours(), 13);
    assert.equal(second.year, null);
    assert.equal(second.venue.latitude, null);
    assert.equal(second.venue.longitude, null);
    assert.equal(second.performerCount, null);
    assert.equal(second.lowestFullPrice, null);
    assert.equal(second.lowestConcessionPrice, null);
    assert.equal(second.firstPerformanceDate, null);
    assert.equal(second.lastPerformanceDate, null);
    assert.equal(second.lastUpdated, null);
    assert.equal(second.raw["First performance date"], "2025-02-29");
  }
  assert.equal(await loadFestivalDatasets(), datasets);
  assert.equal(requestedFiles.length, 15);
  assert.equal(log.mock.callCount(), 15);
});

test("retries a failed CSV while preserving successful file loads and logging only complete results", async (t) => {
  const { loadFestivalDatasets } = await freshLoader();
  const attempts = new Map();
  t.mock.method(globalThis, "fetch", async (url) => {
    const fileName = String(url).split("/").at(-1);
    const count = (attempts.get(fileName) ?? 0) + 1;
    attempts.set(fileName, count);
    return fileName === "2017.csv" && count === 1
      ? new Response("Unavailable", { status: 503, statusText: "Unavailable" })
      : new Response(csv);
  });
  const log = t.mock.method(console, "log", () => {});
  await assert.rejects(loadFestivalDatasets(), /503/);
  assert.equal(log.mock.callCount(), 0);
  const datasets = await loadFestivalDatasets();
  assert.equal(datasets.length, 15);
  assert.equal(log.mock.callCount(), 15);
  for (const [fileName, count] of attempts) {
    assert.equal(count, fileName === "2017.csv" ? 2 : 1);
  }
});

test("keeps empty datasets available and reports that they contain no events", async (t) => {
  const { loadFestivalDatasets, hasFestivalEvents } = await freshLoader();
  t.mock.method(globalThis, "fetch", async () => new Response("ID,Festival,Year\n"));
  t.mock.method(console, "log", () => {});
  const datasets = await loadFestivalDatasets();
  assert.equal(datasets.length, 15);
  assert.equal(hasFestivalEvents(datasets), false);
  assert.ok(datasets.every((dataset) => dataset.events.length === 0 && dataset.raw.length === 0));
});
