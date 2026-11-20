import * as d3 from "d3";
import type { RawCountryStripRow } from "./countryStripData";
import {
  formatCountryEventCount,
  type RepresentedWorldCountryStripCell,
} from "./festivalCountries";
import { eventCountryStripLayout } from "./eventCountryStrip";

export type EventCountryConnection = {
  countryKey: string;
  countryName: string;
  eventCount: number | null;
  eventCountLabel: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  strokeWidth: number;
  path: string;
  raw: RawCountryStripRow;
};

/**
 * Select only highlighted, visible cells, preserving their strip order.
 * One horizontal line starts at each rectangle's right-edge midpoint. Its
 * length is proportional to the related event-record count. The longest ends
 * midway between the strip and the central circle's left edge.
 * Lines are rendered as solid black; country cells retain their own opacity
 * encoding.
 */
export function createEventCountryConnections(
  countries: RepresentedWorldCountryStripCell[],
  width: number,
  height: number,
  circleRadius: number,
): EventCountryConnection[] {
  const { leftInset, continentWidth, countryWidth } = eventCountryStripLayout;
  const sourceX = leftInset + continentWidth + countryWidth;
  if (width <= sourceX + 2 || height <= 0) return [];

  const highlighted = countries.filter((country) => country.hasEventData && country.width > 0);
  const maximumEventCount =
    d3.max(highlighted, (country) => country.eventCount ?? 0) ?? 0;
  const circleLeftEdge = width / 2 - circleRadius;
  const maximumLineLength = Math.max(0, (circleLeftEdge - sourceX) / 2);
  const lineLength = d3
    .scaleLinear()
    .domain([0, maximumEventCount])
    .range([0, maximumLineLength]);

  return highlighted.map((country) => {
    const sourceY = country.x + country.width / 2;
    const targetY = sourceY;
    const targetX = sourceX + lineLength(country.eventCount ?? 0);
    const path = d3.path();
    path.moveTo(sourceX, sourceY);
    path.lineTo(targetX, targetY);
    return {
      countryKey: country.countryKey,
      countryName: country.countryName,
      eventCount: country.eventCount,
      eventCountLabel: country.eventCount === null
        ? "Event count unavailable"
        : formatCountryEventCount(country.eventCount),
      sourceX,
      sourceY,
      targetX,
      targetY,
      strokeWidth: country.width,
      path: path.toString(),
      raw: country.raw,
    };
  });
}

