import assert from "node:assert/strict";
import test from "node:test";
import { filterEventRecordsByCountry } from "../src/lib/utils/eventCountryFilter.ts";

const france = { id: "250", name: "France", continent: "Europe" };
const germany = { id: "276", name: "Germany", continent: "Europe" };
const scotland = { id: "826", name: "Scotland (United Kingdom)", continent: "Europe" };

function event(id, countryKeys, latitude = 55.95) {
  const raw = { ID: id, Country: countryKeys.join(";") };
  const record = { id, venue: { latitude, longitude: -3.18 }, raw };
  return { event: record, countryKeys, raw };
}

function representation(relations) {
  return {
    countries: [
      { key: "250", raw: [france] },
      { key: "276", raw: [germany] },
      { key: "826:scotland", raw: [scotland] },
      { key: "826", raw: [] },
    ],
    relations,
  };
}

test("country previews select related records once without including the whole continent", () => {
  const a = event("france", ["250"]);
  const b = event("both", ["250", "276"]);
  const c = event("germany", ["276"]);
  const data = representation([a, b, c]);
  assert.deepEqual(filterEventRecordsByCountry(data, { ...france }), [a.event, b.event]);
  assert.deepEqual(filterEventRecordsByCountry(data, germany), [b.event, c.event]);
});

test("preserves repeated source rows, current festival selection, raw references, and missing coordinates", () => {
  const a = event("repeated-id", ["250"]);
  const b = event("repeated-id", ["250"], null);
  const data = representation([b, a, a]);
  const before = structuredClone(data);
  const result = filterEventRecordsByCountry(data, france);
  assert.deepEqual(result, [b.event, a.event, a.event]);
  assert.equal(result[0], b.event);
  assert.equal(result[0].raw, b.raw);
  assert.deepEqual(data, before);
  assert.deepEqual(filterEventRecordsByCountry(representation([b]), france), [b.event]);
});

test("Scotland uses its existing nation key without including generic UK records", () => {
  const nation = event("scotland", ["826:scotland"]);
  const generic = event("uk", ["826"]);
  const unknown = event("unmatched", ["unmatched"]);
  assert.deepEqual(filterEventRecordsByCountry(representation([generic, nation, unknown]), scotland), [nation.event]);
});

test("zero matches, absent catalog cells, and unavailable data do not restore all events", () => {
  const data = representation([event("germany", ["276"])]);
  assert.deepEqual(filterEventRecordsByCountry(data, france), []);
  assert.deepEqual(filterEventRecordsByCountry(data, { ...france, name: "Unmatched" }), []);
  assert.deepEqual(filterEventRecordsByCountry(representation([]), france), []);
  assert.equal(filterEventRecordsByCountry(undefined, france), undefined);
});
