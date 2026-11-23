import assert from "node:assert/strict";
import test from "node:test";
import { filterEventRecordsByContinent } from "../src/lib/utils/eventContinentFilter.ts";

function event(id, countryKeys, latitude = 55.95) {
  const raw = { ID: id, Country: countryKeys.join(";") };
  const record = { id, venue: { latitude, longitude: -3.18 }, raw };
  return { event: record, countryKeys, raw };
}

function representation(relations) {
  return {
    countries: [
      { key: "fr", raw: [{ id: "fr", name: "France", continent: "Europe" }] },
      { key: "de", raw: [{ id: "de", name: "Germany", continent: "Europe" }] },
      { key: "jp", raw: [{ id: "jp", name: "Japan", continent: "Asia" }] },
      { key: "826:scotland", raw: [{ id: "826", name: "Scotland (United Kingdom)", continent: "Europe" }] },
      { key: "826", raw: [] },
    ],
    relations,
  };
}

test("matches existing continent associations, counting a multi-country record once", () => {
  const a = event("europe", ["fr", "de"]);
  const b = event("both", ["fr", "jp"]);
  const c = event("asia", ["jp"]);
  const data = representation([a, b, c]);
  const europe = filterEventRecordsByContinent(data, "Europe");
  assert.deepEqual(europe, [a.event, b.event]);
  assert.deepEqual(filterEventRecordsByContinent(data, "Asia"), [b.event, c.event]);
  assert.equal(europe[0], a.event);
  assert.equal(europe[0].raw, a.raw);
});

test("preserves repeated source rows, selection order, and missing coordinates", () => {
  const a = event("same-id", ["fr"]);
  const b = event("same-id", ["fr"], null);
  const data = representation([b, a, a]);
  const before = structuredClone(data);
  assert.deepEqual(filterEventRecordsByContinent(data, "Europe"), [b.event, a.event, a.event]);
  assert.deepEqual(data, before);
  assert.deepEqual(filterEventRecordsByContinent(representation([b]), "Europe"), [b.event]);
});

test("uses UK nation keys without inferring a continent for undisplayed or unknown countries", () => {
  const scotland = event("scotland", ["826:scotland"]);
  const uk = event("uk-unspecified", ["826"]);
  const unknown = event("unknown", ["unmatched"]);
  const missing = event("missing", []);
  const data = representation([uk, scotland, unknown, missing]);
  assert.deepEqual(filterEventRecordsByContinent(data, "Europe"), [scotland.event]);
});

test("empty matches stay empty and unavailable country data stays unavailable", () => {
  assert.deepEqual(filterEventRecordsByContinent(representation([event("asia", ["jp"])]), "Africa"), []);
  assert.deepEqual(filterEventRecordsByContinent(representation([]), "Europe"), []);
  assert.equal(filterEventRecordsByContinent(undefined, "Europe"), undefined);
});
