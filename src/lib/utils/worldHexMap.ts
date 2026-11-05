import * as d3 from "d3";

export type RawWorldHex = {
  col: number;
  row: number;
  x: number;
  y: number;
  id?: string | number | null;
  name: string;
  group: "americas" | "rest";
};

export type RawHexWorldFile = {
  width: number;
  height: number;
  hexRadius: number;
  orientation: "pointy-top";
  cols: number;
  rows: number;
  hexes: RawWorldHex[];
};

export type WorldHex = {
  columnIndex: number;
  rowIndex: number;
  sourceX: number;
  sourceY: number;
  countryId: string | null;
  countryKey: string;
  countryName: string;
  group: RawWorldHex["group"];
  raw: RawWorldHex;
};

export type WorldHexData = {
  hexRadius: number;
  americasHexes: WorldHex[];
  restHexes: WorldHex[];
  raw: RawHexWorldFile;
};

export type WorldHexCell = {
  countryId: string | null;
  countryName: string;
  centerX: number;
  centerY: number;
  points: string;
  raw: RawWorldHex;
};

export type WorldHexPanelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WorldHexPanelLayout = {
  group: RawWorldHex["group"];
  cells: WorldHexCell[];
  panel: WorldHexPanelBox;
};

export type WorldHexLayout = {
  panels: WorldHexPanelLayout[];
  scale: number;
  hexRadius: number;
};

export type WorldHexDataStatus = "loading" | "ready" | "empty" | "error";

// Panel dimensions are constrained by the existing circle.
export const worldHexPanelBox = {
  edgePadding: 16,
  circleGap: 24,
  heightFraction: 0.9,
  minimumWidth: 120,
};
// Inset each hex radius by 8% to leave a thin gap between neighboring cells.
export const worldHexGap = 0.08;
// Relative size of both maps after they are fitted. Adjust from 0 to 1 to preview a smaller map.
export const worldHexMapSize = 0.8;

let worldHexDataPromise: Promise<WorldHexData> | undefined;

/** Fetch the public asset using the deployment base; failed loads can retry. */
export function loadWorldHexData(): Promise<WorldHexData> {
  if (!worldHexDataPromise) {
    worldHexDataPromise = fetch(
      `${import.meta.env.BASE_URL}data/hex-world-110cols.json`,
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load world hex data (${response.status}).`);
        }
        return validateHexWorldFile(await response.json());
      })
      .then(createWorldHexData)
      .catch((error: unknown) => {
        worldHexDataPromise = undefined;
        throw error;
      });
  }
  return worldHexDataPromise;
}

/** Derive both display groups while retaining the complete loaded file. */
export function createWorldHexData(raw: RawHexWorldFile): WorldHexData {
  return {
    hexRadius: raw.hexRadius,
    americasHexes: filterAmericasHexes(raw.hexes).map(toWorldHex),
    restHexes: filterRestOfWorldHexes(raw.hexes).map(toWorldHex),
    raw,
  };
}

/** Select exactly the supplied Americas group; do not reclassify territories. */
export function filterAmericasHexes(hexes: RawWorldHex[]): RawWorldHex[] {
  return hexes.filter((hex) => hex.group === "americas");
}

/** Select every supplied rest-group cell without reclassification or omission. */
export function filterRestOfWorldHexes(hexes: RawWorldHex[]): RawWorldHex[] {
  return hexes.filter((hex) => hex.group === "rest");
}

export function toWorldHex(raw: RawWorldHex): WorldHex {
  const countryId = raw.id == null || String(raw.id).trim() === ""
    ? null
    : String(raw.id);
  return {
    columnIndex: raw.col,
    rowIndex: raw.row,
    sourceX: raw.x,
    sourceY: raw.y,
    countryId,
    countryKey: countryId ?? raw.name,
    countryName: raw.name,
    group: raw.group,
    raw,
  };
}

export function getWorldHexPanelBox(
  group: RawWorldHex["group"],
  width: number,
  height: number,
  circleX: number,
  circleRadius: number,
): WorldHexPanelBox {
  const { edgePadding, circleGap, heightFraction } = worldHexPanelBox;
  const left = group === "americas"
    ? edgePadding
    : Math.min(width, circleX + circleRadius + circleGap);
  const right = group === "americas"
    ? Math.max(0, circleX - circleRadius - circleGap)
    : width - edgePadding;
  return {
    x: left,
    y: (height * (1 - heightFraction)) / 2,
    width: Math.max(0, right - left),
    height: Math.max(0, height * heightFraction),
  };
}

/** Fit both source bounds using one scale, giving every hex the same radius. */
export function createWorldHexLayout(
  data: WorldHexData | undefined,
  width: number,
  height: number,
  circleX: number,
  circleRadius: number,
): WorldHexLayout | undefined {
  if (!data) return undefined;
  const groups: RawWorldHex["group"][] = ["americas", "rest"];
  const preparedPanels = groups.map((group) => {
    const hexes = group === "americas" ? data.americasHexes : data.restHexes;
    return {
      group,
      hexes,
      panel: getWorldHexPanelBox(group, width, height, circleX, circleRadius),
      bounds: getWorldHexBounds(hexes, data.hexRadius),
    };
  });
  if (preparedPanels.some(({ panel }) =>
    panel.width < worldHexPanelBox.minimumWidth || panel.height <= 0)) {
    return undefined;
  }
  const scales = preparedPanels.flatMap(({ panel, bounds }) =>
    bounds ? [panel.width / bounds.width, panel.height / bounds.height] : []);
  if (!scales.length) return undefined;
  const scale = Math.min(...scales) * worldHexMapSize;
  const radius = data.hexRadius * scale * (1 - worldHexGap);
  // Match the smaller centered gap, moving the narrower map toward the circle.
  const circleInset = Math.max(0, Math.min(...preparedPanels.flatMap(({ panel, bounds }) =>
    bounds ? [(panel.width - bounds.width * scale) / 2] : [])));
  const panels = preparedPanels.map(({ group, hexes, panel, bounds }) =>
    bounds
      ? createWorldHexPanelLayout(group, hexes, panel, bounds, scale, radius, circleInset)
      : { group, panel, cells: [] });
  return { panels, scale, hexRadius: radius };
}

type WorldHexBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

/** Include the full source radius around each loaded center when fitting the map. */
export function getWorldHexBounds(hexes: WorldHex[], radius: number): WorldHexBounds | null {
  if (!hexes.length) return null;
  const minX = d3.min(hexes, (hex) => hex.sourceX)! - radius;
  const maxX = d3.max(hexes, (hex) => hex.sourceX)! + radius;
  const minY = d3.min(hexes, (hex) => hex.sourceY)! - radius;
  const maxY = d3.max(hexes, (hex) => hex.sourceY)! + radius;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/** Center vertically and match the shared inset from each panel's circle edge. */
export function createWorldHexPanelLayout(
  group: RawWorldHex["group"],
  hexes: WorldHex[],
  panel: WorldHexPanelBox,
  bounds: WorldHexBounds,
  scale: number,
  radius: number,
  circleInset: number,
): WorldHexPanelLayout {
  const { minX, minY } = bounds;
  const offsetX = group === "americas"
    ? panel.x + panel.width - bounds.width * scale - circleInset
    : panel.x + circleInset;
  const offsetY = panel.y + (panel.height - bounds.height * scale) / 2;
  const cells = hexes.map((hex) => {
    const centerX = offsetX + (hex.sourceX - minX) * scale;
    const centerY = offsetY + (hex.sourceY - minY) * scale;
    return {
      countryId: hex.countryId,
      countryName: hex.countryName,
      centerX,
      centerY,
      points: createHexagonPoints(centerX, centerY, radius),
      raw: hex.raw,
    };
  });
  return { group, cells, panel };
}

/** Keep the measured name popup inside the container, above or below its cell. */
export function getWorldHexTooltipPosition(
  cell: WorldHexCell,
  width: number,
  height: number,
  tooltipWidth: number,
  tooltipHeight: number,
  radius: number,
): { x: number; y: number } {
  const padding = 8;
  const gap = radius + 8;
  const above = cell.centerY - gap - tooltipHeight;
  return {
    x: Math.max(padding, Math.min(cell.centerX - tooltipWidth / 2, width - tooltipWidth - padding)),
    y: Math.max(padding, Math.min(above >= padding ? above : cell.centerY + gap,
      height - tooltipHeight - padding)),
  };
}

/** Roving keyboard focus chooses the closest cell in the requested direction.
 * Perpendicular distance is weighted to favor movement along the chosen axis.
 */
export function getNextWorldHexCellIndex(
  cells: WorldHexCell[],
  currentIndex: number,
  key: string,
): number {
  if (key === "Home") return 0;
  if (key === "End") return Math.max(0, cells.length - 1);
  const current = cells[currentIndex];
  if (!current || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
    return currentIndex;
  }
  const horizontal = key === "ArrowLeft" || key === "ArrowRight";
  const direction = key === "ArrowLeft" || key === "ArrowUp" ? -1 : 1;
  let nextIndex = currentIndex;
  let closestScore = Infinity;
  cells.forEach((cell, index) => {
    const dx = cell.centerX - current.centerX;
    const dy = cell.centerY - current.centerY;
    const forward = (horizontal ? dx : dy) * direction;
    const sideways = Math.abs(horizontal ? dy : dx);
    if (forward <= 0 || sideways > forward * 1.75) return;
    const score = forward * forward + 4 * sideways * sideways;
    if (score < closestScore) {
      closestScore = score;
      nextIndex = index;
    }
  });
  return nextIndex;
}

export function createHexagonPoints(centerX: number, centerY: number, radius: number): string {
  return d3.range(6).map((index) => {
    const angle = ((60 * index - 30) * Math.PI) / 180;
    return `${centerX + Math.cos(angle) * radius},${centerY + Math.sin(angle) * radius}`;
  }).join(" ");
}

/** Reject malformed geometry instead of dropping cells or inventing coordinates. */
export function validateHexWorldFile(value: unknown): RawHexWorldFile {
  if (!value || typeof value !== "object") {
    throw new Error("The hex world file is not an object.");
  }
  const file = value as Record<string, unknown>;
  if (file.orientation !== "pointy-top" ||
    ![file.width, file.height, file.hexRadius, file.cols, file.rows].every(isPositiveNumber) ||
    !Array.isArray(file.hexes) || !file.hexes.every(isRawWorldHex)) {
    throw new Error("The hex world file contains invalid dimensions or cells.");
  }
  return value as RawHexWorldFile;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRawWorldHex(value: unknown): value is RawWorldHex {
  if (!value || typeof value !== "object") return false;
  const hex = value as Record<string, unknown>;
  return [hex.col, hex.row, hex.x, hex.y].every((coordinate) =>
    typeof coordinate === "number" && Number.isFinite(coordinate)) &&
    typeof hex.name === "string" &&
    (hex.group === "americas" || hex.group === "rest") &&
    (hex.id == null || typeof hex.id === "string" ||
      (typeof hex.id === "number" && Number.isFinite(hex.id)));
}
