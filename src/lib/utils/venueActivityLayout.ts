import * as d3 from "d3";
import type { VenueActivityData, VenueActivityRecord, VenueYearPresence } from "./venueActivity";
import { createVenueYearConnections, type VenueYearConnection } from "./venueActivityFilters";

export type VenueActivityConnection = VenueYearConnection & { y1: number; y2: number };
export type VenueActivityLabelMeasurer = (label: string, fontSize: number, highlighted: boolean) => number;

const connectionsByPresence = new WeakMap<VenueYearPresence[], VenueYearConnection[]>();

/** Reuse connection membership and retained raw-row arrays across redraws.
 * Derived presence arrays are immutable; a new array gets a new cache entry.
 * Only pixel endpoints are recalculated when layout or highlighting changes.
 */
export function getVenueActivityConnections(presence: VenueYearPresence[]): VenueYearConnection[] {
  let connections = connectionsByPresence.get(presence);
  if (!connections) {
    connections = createVenueYearConnections(presence);
    connectionsByPresence.set(presence, connections);
  }
  return connections;
}

export type VenueActivityColumn = {
  venue: VenueActivityRecord;
  x: number;
  targetX: number;
  index: number;
  width: number;
  highlighted: boolean;
  label: string;
  labelX: number;
  labelY: number;
  labelHorizontal: boolean;
  labelFontSize: number;
  circleRadius: number;
  connectionStrokeWidth: number;
  connections: VenueActivityConnection[];
};

/** Shorten a visual label to its pixel budget using measured width when
 * available, otherwise a conservative 1.1 em per Unicode character.
 * Full source names remain in pointer tooltips,
 * accessible labels, the selection status, and the text table.
 */
export function fitVenueActivityLabel(name: string, fontSize: number, availableLength: number,
  measure?: (text: string) => number): string {
  if (fontSize <= 0) return "";
  const characters = Array.from(name);
  if (measure) {
    if (measure(name) <= availableLength) return name;
    if (measure("…") > availableLength) return "";
    let low = 0;
    let high = characters.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (measure(characters.slice(0, middle).join("") + "…") <= availableLength) low = middle;
      else high = middle - 1;
    }
    return characters.slice(0, low).join("") + "…";
  }
  const maximumCharacters = Math.max(0, Math.floor(availableLength / (fontSize * 1.1)));
  if (characters.length <= maximumCharacters) return name;
  return maximumCharacters > 0 ? `${characters.slice(0, maximumCharacters - 1).join("")}…` : "";
}

/** Fill the measured width and height without scrolling. Tiny circles sit at
 * year-band centers. Their radius fits column spacing and is at most 1.5 px;
 * thinner vertical connections stop at the circle edges.
 * Fonts fit a compact label area capped at 96 px and 20% of the container,
 * leaving the remaining height for year rows. Compute that space from neutral
 * labels only, with a minimum 18-pixel band for a horizontal highlight label.
 * Highlighting never changes the year centers or row spacing. Leave 2 pixels
 * between label bounds and the top of the first-row circle.
 * Selected columns reserve up to 28 extra pixels apiece, using at most 60% of
 * the plot for this extra space. Their labels reach 13 px, circles 4 px, and
 * lines 2 px. Selected labels float horizontally in the existing label band,
 * with an ellipsis if they exceed 320 pixels or the available plot width.
 * Preserve column order, source membership, and the original year/gap rules.
 */
export function createVenueActivityLayout(
  data: VenueActivityData,
  width: number,
  height: number,
  measuredLabelHeight: number | null = null,
  highlightedVenues: VenueActivityRecord[] = [],
  previewVenueKey: string | null = null,
  measureLabel?: VenueActivityLabelMeasurer,
) {
  const axisWidth = Math.max(0, Math.min(40, width));
  const plotWidth = Math.max(0, width - axisWidth);
  const plotHeight = Math.max(0, height);
  const highlightedKeys = new Set(highlightedVenues.map((venue) => venue.venueKey));
  const highlightedCount = data.venues.filter((venue) => highlightedKeys.has(venue.venueKey)).length;
  const hasPreview = data.venues.some((venue) => venue.venueKey === previewVenueKey);
  const activeKeys = hasPreview ? new Set([previewVenueKey]) : highlightedKeys;
  const extraColumnWidth = highlightedCount > 0 ? Math.min(28, plotWidth * 0.6 / highlightedCount) : 0;
  const regularColumnWidth = Math.max(0, (plotWidth - highlightedCount * extraColumnWidth) / Math.max(1, data.venues.length));
  const neutralColumnWidth = plotWidth / Math.max(1, data.venues.length);
  const columnWidths = data.venues.map((venue) => regularColumnWidth + (highlightedKeys.has(venue.venueKey) ? extraColumnWidth : 0));
  const columnEnds = d3.cumsum(columnWidths);
  const regularLabelHeight = Math.max(0, Math.min(96, height * 0.2, height - 24));
  // Measure the same neutral names/fonts regardless of Context or hover state.
  const neutralLabels = data.venues.map((venue) => ({
    name: venue.venueName,
    fontSize: Math.max(0, Math.min(11, neutralColumnWidth * 0.72, regularLabelHeight / Math.max(1, venue.venueName.length * 1.1))),
  }));
  const naturalLabelHeight = d3.max(neutralLabels, (label) => measureLabel
    ? measureLabel(label.name, label.fontSize, false)
    : label.name.length * label.fontSize * 0.65) ?? 0;
  const labelHeight = Math.max(Math.min(18, regularLabelHeight),
    Math.min(regularLabelHeight, measuredLabelHeight ?? naturalLabelHeight));
  const nameBaselineY = Math.min(plotHeight, 8 + labelHeight);
  const gridTop = Math.min(plotHeight, nameBaselineY + 2);
  const intervals = Math.max(1, data.years.length - 1);
  const availableYearHeight = Math.max(0, plotHeight - 8 - gridTop);
  const referenceRadius = Math.max(0, Math.min(1.5, neutralColumnWidth * 0.35, availableYearHeight * 0.2 / (intervals + 0.4)));
  const rowStart = Math.min(plotHeight, gridTop + referenceRadius);
  const rowEnd = Math.max(rowStart, plotHeight - 8 - referenceRadius);
  const yearStep = (rowEnd - rowStart) / intervals;
  const yearY = d3.scalePoint<number>().domain(data.years).range([rowStart, rowEnd]);
  const years = data.years.map((year) => ({ year, y: yearY(year) ?? rowStart }));
  const firstYearY = years[0]?.y ?? gridTop;
  const lastYearY = years[years.length - 1]?.y ?? gridTop;
  const labelEdge = Math.min(4, plotWidth / 2);
  const maximumLabelWidth = Math.max(0, Math.min(320, plotWidth - labelEdge * 2));
  const labelColumns = data.venues.map((venue, index) => {
    const highlighted = activeKeys.has(venue.venueKey);
    const columnWidth = columnWidths[index];
    // Hover/focus previews enlarge the marks without moving their hit targets.
    const markWidth = hasPreview && highlighted ? Math.max(28, columnWidth) : columnWidth;
    const targetX = columnEnds[index] - columnWidth / 2;
    const edgeInset = Math.min(5, plotWidth / 2);
    const labelFontSize = highlighted
      ? Math.max(0, Math.min(13, markWidth * 0.7))
      : neutralLabels[index].fontSize;
    const label = highlighted ? fitVenueActivityLabel(venue.venueName, labelFontSize, maximumLabelWidth,
      measureLabel ? (text) => measureLabel(text, labelFontSize, true) : undefined) : venue.venueName;
    const labelWidth = highlighted
      ? measureLabel?.(label, labelFontSize, true) ?? label.length * labelFontSize * 0.65
      : 0;
    const x = hasPreview && highlighted ? Math.max(edgeInset, Math.min(plotWidth - edgeInset, targetX)) : targetX;
    return {
      venue, highlighted, width: columnWidth, markWidth, index, targetX,
      x, labelFontSize, label, labelHorizontal: highlighted,
      labelX: highlighted ? Math.max(labelEdge, Math.min(plotWidth - labelEdge - labelWidth, x - labelWidth / 2)) : x,
    };
  });
  const labelFontSize = d3.min(labelColumns, (column) => column.labelFontSize) ?? 0;
  const circleRadius = Math.max(0, Math.min(referenceRadius, regularColumnWidth * 0.35));
  const connectionStrokeWidth = Math.min(0.65, circleRadius * 0.65);
  const yearLabelFontSize = Math.min(12, yearStep * 0.8);
  const columns: VenueActivityColumn[] = labelColumns.map((column) => {
    const columnRadius = column.highlighted
      ? Math.max(0, Math.min(4, column.markWidth * 0.3, yearStep * 0.22))
      : circleRadius;
    return {
      ...column,
      circleRadius: columnRadius,
      // Include both the circle outline and the selected label's underline
      // when anchoring the visual label edge 2 px above the first year row.
      labelY: firstYearY - columnRadius - 2 - (column.highlighted ? Math.min(1, columnRadius * 0.25) / 2 + 0.5 : 0),
      connectionStrokeWidth: column.highlighted ? Math.min(2, columnRadius * 0.6) : connectionStrokeWidth,
      connections: getVenueActivityConnections(column.venue.presence).map((connection) => ({
        ...connection,
        y1: yearY(connection.from.year)! + columnRadius,
        y2: yearY(connection.to.year)! - columnRadius,
      })),
    };
  });
  return {
    axisWidth, plotWidth, plotHeight, firstYearY, lastYearY, nameBaselineY,
    labelFontSize, circleRadius, connectionStrokeWidth, gridTop, yearStep, yearLabelFontSize, years, columns,
    paintColumns: orderVenueActivityColumnsForPainting(columns),
  };
}

export type VenueActivityLayout = ReturnType<typeof createVenueActivityLayout>;

/** Paint enlarged marks last without changing column positions or data order. */
export function orderVenueActivityColumnsForPainting(columns: VenueActivityColumn[]): VenueActivityColumn[] {
  return [...columns.filter((column) => !column.highlighted), ...columns.filter((column) => column.highlighted)];
}
