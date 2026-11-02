import type { FestivalDataWithCoordinates } from "./festivalData";
import * as d3 from "d3";

export type ProjectedFestivalEvent = {
  event: FestivalDataWithCoordinates;
  x: number;
  y: number;
};

export type HexagonalFestivalBin = {
  centerX: number;
  centerY: number;
  vertices: { x: number; y: number }[];
  events: FestivalDataWithCoordinates[];
};

export type HexagonalFestivalBinWithOpacity = HexagonalFestivalBin & {
  fillOpacity: number;
};

type AxialCoordinate = {
  q: number;
  r: number;
};

/**
 * Groups projected event locations into pointy-topped, fixed-radius hexagons.
 * Every input event is retained in exactly one returned bin; no events are
 * deduplicated, sorted, or discarded.
 */
export function createHexagonalFestivalBins(
  projectedEvents: ProjectedFestivalEvent[],
  radius: number,
): HexagonalFestivalBin[] {
  if (radius <= 0) {
    return [];
  }

  const bins = new Map<string, HexagonalFestivalBin>();

  projectedEvents.forEach((projectedEvent) => {
    const coordinate = pixelToAxialCoordinate(
      projectedEvent.x,
      projectedEvent.y,
      radius,
    );
    const key = `${coordinate.q},${coordinate.r}`;
    const existingBin = bins.get(key);

    if (existingBin) {
      existingBin.events.push(projectedEvent.event);
      return;
    }

    const center = axialToPixelCoordinate(coordinate, radius);
    bins.set(key, {
      centerX: center.x,
      centerY: center.y,
      vertices: createHexagonVertices(center.x, center.y, radius),
      events: [projectedEvent.event],
    });
  });

  return Array.from(bins.values());
}

/**
 * Returns a copy of each bin with a fill opacity scaled to its event-record
 * count. The square-root scale preserves visible differences among less dense
 * bins while limiting the visual dominance of the densest bins.
 */
export function addHexagonalBinOpacities(
  bins: HexagonalFestivalBin[],
): HexagonalFestivalBinWithOpacity[] {
  const maximumEventCount = d3.max(bins, (bin) => bin.events.length) ?? 0;

  if (maximumEventCount <= 1) {
    return bins.map((bin) => ({ ...bin, fillOpacity: 0.65 }));
  }

  const opacityScale = d3
    .scaleSqrt()
    .domain([1, maximumEventCount])
    .range([0.3, 0.95]);

  return bins.map((bin) => ({
    ...bin,
    fillOpacity: opacityScale(bin.events.length),
  }));
}

function pixelToAxialCoordinate(x: number, y: number, radius: number) {
  const fractionalQ = (Math.sqrt(3) / 3 * x - y / 3) / radius;
  const fractionalR = (2 / 3 * y) / radius;
  return roundAxialCoordinate(fractionalQ, fractionalR);
}

function roundAxialCoordinate(q: number, r: number): AxialCoordinate {
  let roundedQ = Math.round(q);
  let roundedR = Math.round(r);
  const roundedS = Math.round(-q - r);
  const qDifference = Math.abs(roundedQ - q);
  const rDifference = Math.abs(roundedR - r);
  const sDifference = Math.abs(roundedS + q + r);

  if (qDifference > rDifference && qDifference > sDifference) {
    roundedQ = -roundedR - roundedS;
  } else if (rDifference > sDifference) {
    roundedR = -roundedQ - roundedS;
  }

  return { q: roundedQ, r: roundedR };
}

function axialToPixelCoordinate(coordinate: AxialCoordinate, radius: number) {
  return {
    x: radius * Math.sqrt(3) * (coordinate.q + coordinate.r / 2),
    y: radius * 1.5 * coordinate.r,
  };
}

function createHexagonVertices(centerX: number, centerY: number, radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + (index * Math.PI) / 3;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}
