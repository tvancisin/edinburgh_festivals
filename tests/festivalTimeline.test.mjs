import assert from "node:assert/strict";
import test from "node:test";
import { festivals } from "../src/lib/utils/festivals.js";
import {
  createFestivalArcs,
  createMonthTicks,
  createTodayIndicator,
  festivalCalendarAngle,
  festivalCalendarRange,
  festivalCalendarRangesOverlap,
  formatFestivalCalendarDate,
  parseFestivalCalendarDate,
} from "../src/lib/utils/festivalTimeline.ts";

test("fixed month/day calendar dates are yearless and support leap day without accepting invalid dates", () => {
  for (const festival of festivals) {
    assert.match(festival.start, /^\d{2}-\d{2}$/);
    assert.match(festival.end, /^\d{2}-\d{2}$/);
  }
  assert.equal(formatFestivalCalendarDate("04-04"), "April 4");
  assert.equal(parseFestivalCalendarDate("02-29").getUTCDate(), 29);
  assert.throws(() => parseFestivalCalendarDate("02-30"), /Invalid/);
  assert.throws(() => parseFestivalCalendarDate("2025-04-04"), /Invalid/);
});

test("Hogmanay crosses January as a short forward arc rather than most of a year", () => {
  const hogmanay = festivals.find((festival) => festival.name === "Hogmanay");
  const [start, end] = festivalCalendarRange(hogmanay);
  assert.ok(end > start);
  assert.ok(end - start < Math.PI / 12);
  assert.equal(end, Math.PI * 2);
  const crossing = { ...hogmanay, start: "12-31", end: "01-03" };
  assert.equal(festivalCalendarRangesOverlap(crossing, { ...hogmanay, start: "01-02", end: "01-04" }), true);
  assert.equal(festivalCalendarRangesOverlap(crossing, { ...hogmanay, start: "01-03", end: "01-04" }), false);
});

test("all fixed arcs retain configuration and use separate tracks when date ranges overlap", () => {
  for (const radius of [0, 100, 400]) {
    const arcs = createFestivalArcs(radius);
    assert.equal(arcs.length, festivals.length);
    for (const [index, arc] of arcs.entries()) {
      assert.equal(arc.raw, festivals[index]);
      assert.ok(arc.path && !/NaN|Infinity/.test(arc.path));
      assert.ok(Number.isFinite(arc.labelX) && Number.isFinite(arc.labelY));
      for (const previous of arcs.slice(0, index)) {
        if (festivalCalendarRangesOverlap(arc, previous)) assert.notEqual(arc.stack, previous.stack);
      }
    }
  }
  assert.equal(createMonthTicks(100).length, 12);
  assert.equal(createMonthTicks(100)[0].label, "January");
  assert.equal(createMonthTicks(100).at(-1).label, "December");
});

test("today's position depends on month and day, independently of the actual year", () => {
  assert.deepEqual(createTodayIndicator(100, new Date(2025, 10, 24)), createTodayIndicator(100, new Date(2026, 10, 24)));
  const leapDay = createTodayIndicator(100, new Date(2024, 1, 29));
  assert.equal(leapDay.angle, festivalCalendarAngle("02-29"));
  assert.equal(leapDay.label, "February 29");
});
