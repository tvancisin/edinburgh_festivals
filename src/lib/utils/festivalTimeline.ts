import * as d3 from "d3";
import { festivals } from "./festivals.js";

type Festival = (typeof festivals)[number];
export type FestivalArc = Festival & {
  path: string | null;
  stack: number;
  labelX: number;
  labelY: number;
  labelRotation: number;
  labelAnchor: "start" | "end";
  raw: Festival;
};
export type MonthTick = {
  angle: number;
  label: string;
  labelX: number;
  labelY: number;
  labelRotation: number;
};
export type TodayIndicator = MonthTick;

export const mapToTimelineGap = 32;
const arcThickness = 12;
const arcGap = 5;
const axisToArcGap = 5;
const fullCircle = Math.PI * 2;
// A leap-year reference positions month/day values; it never supplies an event year.
const calendarYear = 2000;
const yearStart = new Date(Date.UTC(calendarYear, 0, 1));
const yearEnd = new Date(Date.UTC(calendarYear + 1, 0, 1));
const dateAngle = d3.scaleUtc().domain([yearStart, yearEnd]).range([0, fullCircle]);
const parseDate = d3.utcParse("%Y-%m-%d");
const formatDate = d3.utcFormat("%Y-%m-%d");
const formatMonth = d3.utcFormat("%B");
const formatCalendarDate = d3.utcFormat("%B %-d");

/** Parse a fixed month/day on the display calendar, independent of event years. */
export function parseFestivalCalendarDate(monthDay: string): Date {
  const value = `${calendarYear}-${monthDay}`;
  const date = parseDate(value);
  if (!date || formatDate(date) !== value) throw new Error(`Invalid festival calendar date: ${monthDay}`);
  return date;
}

/** Format the fixed calendar's text alternative without displaying a year. */
export function formatFestivalCalendarDate(monthDay: string): string {
  return formatCalendarDate(parseFestivalCalendarDate(monthDay));
}

/** Position a month/day around one full calendar circle. */
export function festivalCalendarAngle(monthDay: string): number {
  return dateAngle(parseFestivalCalendarDate(monthDay));
}

/** Unwrap ranges crossing January so Hogmanay remains a short December-to-January arc. */
export function festivalCalendarRange(festival: Festival): [number, number] {
  const start = festivalCalendarAngle(festival.start);
  const end = festivalCalendarAngle(festival.end);
  return [start, end < start ? end + fullCircle : end];
}

/** Compare fixed calendar ranges, including overlap across January. */
export function festivalCalendarRangesOverlap(first: Festival, second: Festival): boolean {
  const [firstStart, firstEnd] = festivalCalendarRange(first);
  const [secondStart, secondEnd] = festivalCalendarRange(second);
  return [-fullCircle, 0, fullCircle].some((offset) =>
    firstStart < secondEnd + offset && secondStart + offset < firstEnd,
  );
}

/** Lay out every fixed festival arc, assigning the first free track in config order.
 * Preserve the configuration record on raw; event datasets do not affect geometry.
 */
export function createFestivalArcs(mapRadius: number): FestivalArc[] {
  const assignedTracks = new Map<Festival, number>();
  return festivals.map((festival) => {
    const occupiedTracks = new Set(Array.from(assignedTracks)
      .filter(([previous]) => festivalCalendarRangesOverlap(previous, festival))
      .map(([, track]) => track));
    let stack = 0;
    while (occupiedTracks.has(stack)) stack += 1;
    assignedTracks.set(festival, stack);

    const [startAngle, endAngle] = festivalCalendarRange(festival);
    const innerRadius = mapRadius + mapToTimelineGap + axisToArcGap + stack * (arcThickness + arcGap);
    const labelRadius = innerRadius + arcThickness / 2;
    const labelAngle = ((endAngle * 180) / Math.PI + 360) % 360;
    const shouldFlip = labelAngle > 90 && labelAngle < 270;
    const labelGap = 5;
    return {
      ...festival,
      raw: festival,
      stack,
      path: d3.arc()({ innerRadius, outerRadius: innerRadius + arcThickness, startAngle, endAngle }),
      labelX: labelRadius * Math.sin(endAngle) + labelGap * Math.cos(endAngle),
      labelY: -labelRadius * Math.cos(endAngle) + labelGap * Math.sin(endAngle),
      labelRotation: shouldFlip ? labelAngle + 180 : labelAngle,
      labelAnchor: shouldFlip ? "end" : "start",
    };
  });
}

/** Lay out twelve month labels on the fixed calendar. */
export function createMonthTicks(mapRadius: number): MonthTick[] {
  const labelRadius = Math.max(0, mapRadius + mapToTimelineGap / 2);
  return d3.utcMonth.range(yearStart, yearEnd).map((date) => {
    const angle = dateAngle(date);
    const degrees = ((angle * 180) / Math.PI + 360) % 360;
    return {
      angle, label: formatMonth(date),
      labelX: labelRadius * Math.sin(angle), labelY: -labelRadius * Math.cos(angle),
      labelRotation: degrees > 90 && degrees < 270 ? degrees + 180 : degrees,
    };
  });
}

/** Project today's local month/day onto the calendar without using its year. */
export function createTodayIndicator(mapRadius: number, today: Date): TodayIndicator {
  const date = new Date(Date.UTC(calendarYear, today.getMonth(), today.getDate()));
  const angle = dateAngle(date);
  const degrees = ((angle * 180) / Math.PI + 360) % 360;
  const labelRadius = mapRadius + mapToTimelineGap + 50;
  return {
    angle, label: formatCalendarDate(date),
    labelX: labelRadius * Math.sin(angle), labelY: -labelRadius * Math.cos(angle),
    labelRotation: degrees > 90 && degrees < 270 ? degrees + 180 : degrees,
  };
}
