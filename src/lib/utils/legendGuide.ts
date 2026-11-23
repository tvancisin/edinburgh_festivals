import { eventCountryStripLayout } from "./eventCountryStrip";
import { ticketCountryStripLayout } from "./ticketCountries";

export type LegendStage = "hidden" | "central" | "timeline" | "events" | "tickets";

export function nextLegendStage(stage: LegendStage): LegendStage {
  switch (stage) {
    case "central":
      return "timeline";
    case "timeline":
      return "events";
    case "events":
      return "tickets";
    default:
      return "hidden";
  }
}

export type LegendGuideLayout = { left: number; top: number; width: number };

/** Keep callouts beside their subject and inside the measured container.
 * When a side callout will not fit, place the map description below its circle
 * and the timeline description inside the dimmed map. Protect the active strip
 * and its proportional lines when placing the two country descriptions.
 */
export function calculateLegendGuideLayout(
  stage: LegendStage,
  width: number,
  height: number,
  circleX: number,
  circleY: number,
  circleRadius: number,
  cardHeight: number,
): LegendGuideLayout {
  const edge = 12;
  const gap = 16;
  const stripWidth = Math.max(
    eventCountryStripLayout.leftInset + eventCountryStripLayout.titleWidth,
    ticketCountryStripLayout.rightInset + ticketCountryStripLayout.titleWidth,
  );
  const isStrip = stage === "events" || stage === "tickets";
  const circleLeft = circleX - circleRadius;
  const circleRight = circleX + circleRadius;
  const mapSideWidth = width - stripWidth - gap * 2 - circleRight;
  const preferredWidth = stage === "central" && mapSideWidth >= 200
    ? Math.min(280, mapSideWidth)
    : 280;
  const cardWidth = Math.max(0, Math.min(preferredWidth, width - edge * 2 - (isStrip ? stripWidth + gap : 0)));
  const maxLeft = Math.max(edge, width - cardWidth - edge);
  const maxTop = Math.max(edge, height - cardHeight - edge);
  let left = circleRight + gap;
  let top = circleY - cardHeight / 2;

  if (stage === "events") {
    left = Math.max(stripWidth + gap, (stripWidth + circleLeft) / 2 + gap);
  } else if (stage === "tickets") {
    left = Math.min(width - stripWidth - gap, (width - stripWidth + circleRight) / 2 - gap) - cardWidth;
  } else if (stage === "timeline") {
    // The map is dimmed in this step, leaving room beside the timeline's inner edge.
    left = circleX - cardWidth / 2;
  } else if (left + cardWidth > width - stripWidth - gap) {
    left = circleX - cardWidth / 2;
    top = circleY + circleRadius + gap;
    if (top + cardHeight > height - edge) {
      // Compact landscape layouts have no full-height side or bottom gutter.
      left = stripWidth + gap;
      top = edge;
    }
  }

  return {
    left: Math.min(maxLeft, Math.max(edge, left)),
    top: Math.min(maxTop, Math.max(edge, top)),
    width: cardWidth,
  };
}
