import type { VenueActivityData, VenueActivityRecord } from "./venueActivity";
import { createVenueActivityLayout, type VenueActivityColumn, type VenueActivityLayout } from "./venueActivityLayout";

const ink = "#252525";
const accent = "#006b63";
const background = "#f8f7f4";

/** Canvas rendering is explicitly requested for this chart. Data grouping,
 * source records, layout, and connection membership stay in their typed helpers.
 * Cache text metrics instead of forcing DOM text measurements on every hover.
 */
export function createVenueActivityCanvasRenderer(canvas: HTMLCanvasElement, fontFamily: string) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
  const ctx = context;
  const textWidths = new Map<string, number>();

  function fontFor(fontSize: number, highlighted = false) {
    return `${highlighted ? 800 : 600} ${fontSize}px ${fontFamily}`;
  }

  function setFont(fontSize: number, highlighted = false) {
    const font = fontFor(fontSize, highlighted);
    if (ctx.font !== font) ctx.font = font;
    return font;
  }

  function measureLabel(label: string, fontSize: number, highlighted: boolean) {
    if (!label || fontSize <= 0) return 0;
    const font = fontFor(fontSize, highlighted);
    const key = `${font}\n${label}`;
    let measured = textWidths.get(key);
    if (measured === undefined) {
      setFont(fontSize, highlighted);
      measured = ctx.measureText(label).width;
      if (textWidths.size >= 8192) textWidths.clear();
      textWidths.set(key, measured);
    }
    return measured;
  }

  function drawLabel(column: VenueActivityColumn) {
    if (!column.label || column.labelFontSize <= 0) return;
    ctx.save();
    ctx.translate(column.labelX, column.labelY);
    if (!column.labelHorizontal) ctx.rotate(-Math.PI / 2);
    setFont(column.labelFontSize, column.highlighted);
    ctx.textAlign = "left";
    ctx.textBaseline = column.labelHorizontal ? "bottom" : "middle";
    ctx.fillStyle = column.highlighted ? accent : ink;
    if (column.highlighted) {
      ctx.strokeStyle = background;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.strokeText(column.label, 0, 0);
    }
    ctx.fillText(column.label, 0, 0);
    if (column.highlighted) {
      const length = measureLabel(column.label, column.labelFontSize, true);
      ctx.beginPath();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      const underlineY = column.labelHorizontal ? 0 : column.labelFontSize * 0.55;
      ctx.moveTo(0, underlineY);
      ctx.lineTo(length, underlineY);
      ctx.stroke();
    }
    ctx.restore();
  }

  function addConnections(column: VenueActivityColumn) {
    for (const connection of column.connections) {
      ctx.moveTo(column.x, connection.y1);
      ctx.lineTo(column.x, connection.y2);
    }
  }

  function addCircles(column: VenueActivityColumn, layout: VenueActivityLayout) {
    if (column.circleRadius <= 0) return;
    for (let index = 0; index < column.venue.presence.length; index++) {
      if (!column.venue.presence[index].isRecorded) continue;
      const y = layout.years[index].y;
      ctx.moveTo(column.x + column.circleRadius, y);
      ctx.arc(column.x, y, column.circleRadius, 0, Math.PI * 2);
    }
  }

  function paint(layout: VenueActivityLayout, pixelRatio: number) {
    const width = layout.axisWidth + layout.plotWidth;
    const height = layout.plotHeight;
    const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    // Setting these on every redraw would reset the context and reallocate it.
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (width <= 0 || height <= 0) return;

    ctx.fillStyle = ink;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    setFont(layout.yearLabelFontSize);
    if (layout.yearLabelFontSize > 0) {
      for (const year of layout.years) ctx.fillText(String(year.year), layout.axisWidth - 10, year.y);
    }

    ctx.save();
    ctx.translate(layout.axisWidth, 0);
    ctx.beginPath();
    ctx.rect(0, 0, layout.plotWidth, height);
    ctx.clip();
    ctx.lineCap = "round";

    // Normal marks share a style, so draw one path per mark type instead of
    // one stroke/fill per event, circle, or connection.
    ctx.beginPath();
    for (const column of layout.columns) if (!column.highlighted) addConnections(column);
    ctx.strokeStyle = ink;
    ctx.lineWidth = layout.connectionStrokeWidth;
    if (layout.connectionStrokeWidth > 0) ctx.stroke();
    ctx.beginPath();
    for (const column of layout.columns) if (!column.highlighted) addCircles(column, layout);
    ctx.fillStyle = ink;
    ctx.fill();
    for (const column of layout.columns) if (!column.highlighted) drawLabel(column);

    // Enlarged selections paint last, preserving the original column order.
    for (const column of layout.columns) {
      if (!column.highlighted) continue;
      ctx.strokeStyle = accent;
      ctx.fillStyle = accent;
      ctx.beginPath();
      addConnections(column);
      ctx.lineWidth = column.connectionStrokeWidth;
      if (column.connectionStrokeWidth > 0) ctx.stroke();
      ctx.beginPath();
      addCircles(column, layout);
      ctx.fill();
      if (column.circleRadius > 0) {
        ctx.lineWidth = Math.min(1, column.circleRadius * 0.25);
        ctx.stroke();
      }
      drawLabel(column);
    }
    ctx.restore();
  }

  return {
    render(data: VenueActivityData, width: number, height: number,
      highlightedVenues: VenueActivityRecord[], previewVenueKey: string | null, pixelRatio = 1) {
      const layout = createVenueActivityLayout(data, width, height, null, highlightedVenues, previewVenueKey, measureLabel);
      paint(layout, pixelRatio);
      return layout;
    },
    clearTextMeasurements() { textWidths.clear(); },
    dispose() { textWidths.clear(); canvas.width = 0; canvas.height = 0; },
  };
}

export type VenueActivityCanvasRenderer = ReturnType<typeof createVenueActivityCanvasRenderer>;

/** Coalesce pointer and resize updates; draw the newest state once per frame.
 * Frame batching is scheduling, not an animated transition.
 */
export function createVenueActivityFrameScheduler(draw: () => void,
  requestFrame: (callback: FrameRequestCallback) => number,
  cancelFrame: (id: number) => void) {
  let pending: number | null = null;
  let disposed = false;
  return {
    request() {
      if (disposed || pending !== null) return;
      pending = requestFrame(() => { pending = null; if (!disposed) draw(); });
    },
    dispose() { disposed = true; if (pending !== null) cancelFrame(pending); pending = null; },
  };
}
