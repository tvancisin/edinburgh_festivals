import assert from "node:assert/strict";
import test from "node:test";
import { findVenueActivityLabelAtX, findVenueActivityPreview, moveVenueActivityLabel } from "../src/lib/utils/venueActivityInteraction.ts";

const venues = Object.freeze([
  Object.freeze({ venueKey: "code:a", venueName: "A", raw: [] }),
  Object.freeze({ venueKey: "code:b", venueName: "B", raw: [] }),
  Object.freeze({ venueKey: "code:c", venueName: "C", raw: [] }),
]);
const data = Object.freeze({ venues });
const columns = venues.map((venue, index) => ({ venue, targetX: index * 10 + 5, x: index * 10 + 5, width: 10 }));

test("hover stays on the original label slot when enlarged glyphs move or paint last", () => {
  const enlarged = columns.map((column) => ({ ...column, x: column.venue === venues[0] ? 7 : column.x }));
  assert.equal(findVenueActivityLabelAtX(enlarged, 1), venues[0]);
  assert.equal(findVenueActivityLabelAtX(enlarged, 14), venues[1]);
  assert.equal(findVenueActivityLabelAtX(enlarged, 29), venues[2]);
  assert.equal(findVenueActivityLabelAtX(enlarged, -1), null);
  assert.equal(findVenueActivityLabelAtX(enlarged, 31), null);
  assert.equal(findVenueActivityLabelAtX(enlarged, NaN), null);
  assert.equal(findVenueActivityLabelAtX([], 0), null);
});

test("all labels are reachable with arrows, Home and End without changing data order", () => {
  assert.equal(moveVenueActivityLabel(data, "code:a", "ArrowRight"), venues[1]);
  assert.equal(moveVenueActivityLabel(data, "code:b", "ArrowDown"), venues[2]);
  assert.equal(moveVenueActivityLabel(data, "code:c", "ArrowRight"), venues[2]);
  assert.equal(moveVenueActivityLabel(data, "code:b", "ArrowLeft"), venues[0]);
  assert.equal(moveVenueActivityLabel(data, "code:a", "ArrowUp"), venues[0]);
  assert.equal(moveVenueActivityLabel(data, "code:a", "End"), venues[2]);
  assert.equal(moveVenueActivityLabel(data, "code:c", "Home"), venues[0]);
  assert.equal(moveVenueActivityLabel(data, "code:b", "Tab"), null);
  assert.equal(moveVenueActivityLabel({ venues: [] }, null, "ArrowRight"), null);
  assert.deepEqual(data.venues, venues);
});

test("a cleared or filtered-out preview does not select another venue", () => {
  assert.equal(findVenueActivityPreview(columns, null), null);
  assert.equal(findVenueActivityPreview(columns, "removed-by-filter"), null);
  assert.equal(findVenueActivityPreview(columns, "code:b"), columns[1]);
});
