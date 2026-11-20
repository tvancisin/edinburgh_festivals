import * as d3 from "d3";
import type { RawCountryStripRow } from "./countryStripData";
import {
  formatTicketCountryRecordCount,
  ticketCountryStripLayout,
  type RepresentedTicketCountryStripCell,
} from "./ticketCountries";

export type TicketCountryConnection = {
  countryKey: string;
  countryName: string;
  purchaseRecordCount: number;
  purchaseRecordCountLabel: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  strokeWidth: number;
  path: string;
  raw: RawCountryStripRow;
};

/**
 * Mirror the Events-strip connections: one horizontal line leaves each Ticket
 * cell at its left-edge midpoint. Its length is proportional to the number of
 * ticket-data entries and the longest stops midway to the circle's right edge.
 */
export function createTicketCountryConnections(
  countries: RepresentedTicketCountryStripCell[],
  width: number,
  height: number,
  circleRadius: number,
): TicketCountryConnection[] {
  const { rightInset, titleWidth, contentOffset } = ticketCountryStripLayout;
  const sourceX = width - rightInset - titleWidth + contentOffset;
  if (sourceX <= 2 || height <= 0) return [];

  const highlighted = countries.filter(
    (country) => country.purchaseRecordCount > 0 && country.width > 0,
  );
  const maximumPurchaseRecordCount =
    d3.max(highlighted, (country) => country.purchaseRecordCount) ?? 0;
  const circleRightEdge = width / 2 + circleRadius;
  const maximumLineLength = Math.max(0, (sourceX - circleRightEdge) / 2);
  const lineLength = d3
    .scaleLinear()
    .domain([0, maximumPurchaseRecordCount])
    .range([0, maximumLineLength]);

  return highlighted.map((country) => {
    const sourceY = country.x + country.width / 2;
    const targetY = sourceY;
    const targetX = sourceX - lineLength(country.purchaseRecordCount);
    const path = d3.path();
    path.moveTo(sourceX, sourceY);
    path.lineTo(targetX, targetY);
    return {
      countryKey: country.countryKey,
      countryName: country.countryName,
      purchaseRecordCount: country.purchaseRecordCount,
      purchaseRecordCountLabel: formatTicketCountryRecordCount(
        country.purchaseRecordCount,
      ),
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

