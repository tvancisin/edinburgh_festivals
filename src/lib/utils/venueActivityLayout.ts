import * as d3 from "d3";
import type { VenueActivityData, VenueActivityRecord } from "./venueActivity";
import { createVenueYearConnections, type VenueYearConnection } from "./venueActivityFilters";

export type VenueActivityConnection = VenueYearConnection & { y1: number; y2: number };

export type VenueActivityColumn = {
  venue: VenueActivityRecord;
  x: number;
  labelFontSize: number;
  connections: VenueActivityConnection[];
};

/** Fill the measured width and height without scrolling. Tiny circles sit at
 * year-band centers. Their radius fits column spacing and is at most 1.5 px;
 * thinner vertical connections stop at the circle edges.
 * Fonts fit a compact label area capped at 96 px and 20% of the container,
 * leaving the remaining height for year rows. Once the SVG text has been measured,
 * leave just 8 px between its baseline and the top of the year grid. Until
 * measurement is available, estimate label length at 0.65 em per character.
 */
export function createVenueActivityLayout(
  data: VenueActivityData,
  width: number,
  height: number,
  measuredLabelHeight: number | null = null,
) {
  const axisWidth = Math.max(0, Math.min(40, width));
  const plotWidth = Math.max(0, width - axisWidth);
  const svgWidth = plotWidth;
  const svgHeight = Math.max(0, height);
  const maximumLabelHeight = Math.max(0, Math.min(96, height * 0.2, height - 24));
  const venueX = d3.scaleBand<string>()
    .domain(data.venues.map((venue) => venue.venueKey))
    .range([0, svgWidth]);
  const labelColumns = data.venues.map((venue) => ({
    venue,
    x: (venueX(venue.venueKey) ?? 0) + venueX.bandwidth() / 2,
    labelFontSize: Math.max(0, Math.min(
      11,
      venueX.bandwidth() * 0.72,
      maximumLabelHeight / Math.max(1, venue.venueName.length * 1.1),
    )),
  }));
  const labelFontSize = d3.min(labelColumns, (column) => column.labelFontSize) ?? 0;
  const estimatedLabelHeight = d3.max(labelColumns, (column) =>
    column.venue.venueName.length * column.labelFontSize * 0.65,
  ) ?? 0;
  const labelHeight = Math.max(0, Math.min(maximumLabelHeight, measuredLabelHeight ?? estimatedLabelHeight));
  const nameBaselineY = Math.min(svgHeight, 8 + labelHeight);
  const gridTop = Math.min(svgHeight, nameBaselineY + 8);
  const gridHeight = Math.max(0, svgHeight - gridTop - 8);
  const yearStep = gridHeight / Math.max(1, data.years.length);
  const circleRadius = Math.max(0, Math.min(1.5, venueX.bandwidth() * 0.35, yearStep * 0.2));
  const connectionStrokeWidth = Math.min(0.65, circleRadius * 0.65);
  const yearLabelFontSize = Math.min(12, yearStep * 0.8);
  const yearY = d3.scaleBand<number>().domain(data.years).range([gridTop, gridTop + gridHeight]);
  const years = data.years.map((year) => ({
    year,
    y: (yearY(year) ?? gridTop) + yearStep / 2,
  }));
  const columns: VenueActivityColumn[] = labelColumns.map((column) => ({
    ...column,
    connections: createVenueYearConnections(column.venue.presence).map((connection) => ({
      ...connection,
      y1: yearY(connection.from.year)! + yearStep / 2 + circleRadius,
      y2: yearY(connection.to.year)! + yearStep / 2 - circleRadius,
    })),
  }));
  const firstYearY = years[0]?.y ?? gridTop;
  const lastYearY = years[years.length - 1]?.y ?? gridTop;
  return {
    axisWidth, svgWidth, svgHeight, firstYearY, lastYearY, nameBaselineY,
    labelFontSize, circleRadius, connectionStrokeWidth, gridTop, yearStep, yearLabelFontSize, years, columns,
  };
}
