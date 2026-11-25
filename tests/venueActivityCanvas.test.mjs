import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { extname } from "node:path";
import { compile } from "svelte/compiler";
import { render } from "svelte/server";

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !extname(specifier) && context.parentURL?.includes("/src/lib/utils/")) {
    return nextResolve(specifier + ".ts", context);
  }
  return nextResolve(specifier, context);
} });
const { createVenueActivityCanvasRenderer, createVenueActivityFrameScheduler } = await import("../src/lib/utils/venueActivityCanvas.ts");

function surface() {
  const calls = [];
  const stack = [];
  let path = [];
  const ctx = { font: "10px sans-serif", fillStyle: "", strokeStyle: "", lineWidth: 1,
    lineCap: "butt", lineJoin: "miter", textAlign: "left", textBaseline: "alphabetic" };
  const record = (op, args) => calls.push({ op, args, font: ctx.font, fill: ctx.fillStyle, stroke: ctx.strokeStyle, lineWidth: ctx.lineWidth });
  for (const method of ["setTransform", "clearRect", "translate", "rotate", "clip", "fillText", "strokeText"]) {
    ctx[method] = (...args) => record(method, args);
  }
  ctx.save = () => stack.push(Object.fromEntries(Object.entries(ctx).filter(([, value]) => typeof value !== "function")));
  ctx.restore = () => Object.assign(ctx, stack.pop());
  ctx.beginPath = () => { path = []; };
  for (const method of ["moveTo", "lineTo", "arc", "rect"]) ctx[method] = (...args) => path.push({ op: method, args });
  for (const method of ["fill", "stroke"]) ctx[method] = () => record(method, path.slice());
  ctx.measureText = (text) => {
    record("measureText", [text]);
    return { width: text.length * Number(ctx.font.split(" ")[1].replace("px", "")) * 0.6 };
  };
  let pixelWidth = 0, pixelHeight = 0, widthWrites = 0, heightWrites = 0;
  const canvas = {
    get width() { return pixelWidth; }, set width(value) { pixelWidth = value; widthWrites++; },
    get height() { return pixelHeight; }, set height(value) { pixelHeight = value; heightWrites++; },
    getContext: (kind) => kind === "2d" ? ctx : null,
  };
  return { canvas, calls, get writes() { return [widthWrites, heightWrites]; } };
}

const years = [2019, 2020, 2021, 2022, 2023];
function venue(key, recordedYears) {
  const presence = years.map((year) => ({ year, isRecorded: recordedYears.includes(year), events: [], raw: [{ ID: key + year }] }));
  return { venueKey: key, venueName: key, accessibleLabel: key + " venue records", presence };
}
const first = venue("Alpha", [2019, 2021, 2023]);
const second = venue("Beta", [2020]);
const data = { years, venues: [first, second] };

test("canvas paints source-year circles and only existing connections, with the same Context highlight", () => {
  const output = surface();
  const renderer = createVenueActivityCanvasRenderer(output.canvas, "sans-serif");
  const layout = renderer.render(data, 640, 480, [first], null, 2);
  assert.equal(output.canvas.width, 1280);
  assert.equal(output.canvas.height, 960);
  assert.ok(output.calls.some((call) => call.op === "setTransform" && call.args.join() === "2,0,0,2,0,0"));
  const arcs = (color) => output.calls.filter((call) => call.op === "fill" && call.fill === color)
    .flatMap((call) => call.args.filter((part) => part.op === "arc"));
  assert.equal(arcs("#006b63").length, 3);
  assert.equal(arcs("#252525").length, 1);
  assert.deepEqual(arcs("#006b63").map((arc) => arc.args[1]), [layout.years[0].y, layout.years[2].y, layout.years[4].y]);
  assert.equal(layout.columns[0].connections.length, 1, "2019–2021 connects; missing 2022 still breaks a line");
  const connection = layout.columns[0].connections[0];
  assert.ok(output.calls.some((call) => call.op === "stroke" && call.stroke === "#006b63"
    && call.args.some((part) => part.op === "lineTo" && part.args[1] === connection.y2)));
  assert.ok(output.calls.some((call) => call.op === "fillText" && call.args[0] === "Alpha" && call.fill === "#006b63" && call.font.startsWith("800 13px")));
  assert.deepEqual(output.calls.filter((call) => call.op === "fillText" && /^20\d\d$/.test(call.args[0])).map((call) => call.args[0]), years.map(String));
});

test("redraws reuse text measurements, backing storage, and retained source-row connection arrays", () => {
  const output = surface();
  const renderer = createVenueActivityCanvasRenderer(output.canvas, "sans-serif");
  const initial = renderer.render(data, 640, 480, [], null);
  const measurements = output.calls.filter((call) => call.op === "measureText").length;
  const writes = [...output.writes];
  const next = renderer.render(data, 640, 480, [], null);
  assert.equal(output.calls.filter((call) => call.op === "measureText").length, measurements);
  assert.deepEqual(output.writes, writes);
  assert.equal(initial.columns[0].connections[0].raw, next.columns[0].connections[0].raw);
  const preview = renderer.render(data, 640, 480, [], "Beta");
  assert.deepEqual(preview.years, initial.years, "canvas text measurement must not move year rows on hover");
  assert.equal(preview.yearStep, initial.yearStep);
  assert.equal(preview.columns[1].highlighted, true);
  assert.equal(output.calls.filter((call) => call.op === "measureText").length, measurements + 1);
  renderer.clearTextMeasurements();
  renderer.render(data, 640, 480, [], null);
  assert.ok(output.calls.filter((call) => call.op === "measureText").length > measurements + 1);
  renderer.render(data, 320, 480, [], null, 2);
  assert.equal(output.canvas.width, 640);
  renderer.dispose();
  assert.equal(output.canvas.width, 0);
  assert.equal(output.canvas.height, 0);
});

test("enlarged canvas labels draw horizontally at a two-pixel gap without moving the grid", () => {
  const output = surface();
  const renderer = createVenueActivityCanvasRenderer(output.canvas, "sans-serif");
  const normal = renderer.render(data, 640, 480, [], null);
  const start = output.calls.length;
  const selected = renderer.render(data, 640, 480, [first], null);
  assert.deepEqual(selected.years, normal.years);
  const marked = selected.columns[0];
  assert.ok(output.calls.slice(start).some((call) => call.op === "translate" && call.args[0] === marked.labelX && call.args[1] === marked.labelY));
  assert.equal(output.calls.slice(start).filter((call) => call.op === "rotate").length, 1, "only the unselected label remains vertical");
  const circleTop = selected.firstYearY - marked.circleRadius - Math.min(1, marked.circleRadius * 0.25) / 2;
  assert.ok(Math.abs(circleTop - (marked.labelY + 0.5) - 2) < 1e-9);
});

test("frame scheduling coalesces rapid changes, draws the newest state, and cancels on unmount", () => {
  let value = 0, nextId = 0;
  const callbacks = new Map();
  const canceled = [];
  const drawn = [];
  const scheduler = createVenueActivityFrameScheduler(() => drawn.push(value),
    (callback) => { const id = nextId++; callbacks.set(id, callback); return id; },
    (id) => canceled.push(id));
  scheduler.request(); value = 1; scheduler.request(); value = 2; scheduler.request();
  assert.equal(callbacks.size, 1, "one pending frame even when the first frame ID is zero");
  callbacks.get(0)(0);
  assert.deepEqual(drawn, [2]);
  scheduler.request();
  scheduler.dispose();
  assert.deepEqual(canceled, [1]);
  callbacks.get(1)(0);
  scheduler.request();
  assert.deepEqual(drawn, [2]);
  assert.equal(callbacks.size, 2);
});

test("unavailable canvas fails explicitly, and empty/zero-sized views have no drawn marks", () => {
  assert.throws(() => createVenueActivityCanvasRenderer({ getContext: () => null }, "sans-serif"), /unavailable/);
  const output = surface();
  const renderer = createVenueActivityCanvasRenderer(output.canvas, "sans-serif");
  renderer.render({ years: [], venues: [] }, 0, 0, [], null, NaN);
  assert.equal(output.calls.filter((call) => call.op === "fillText").length, 0);
  assert.ok(!output.calls.some((call) => call.op === "fill" && call.args.some((part) => part.op === "arc")));
});

test("chart markup uses one canvas and constant-size accessible label controls instead of SVG marks", async () => {
  const componentUrl = new URL("../src/lib/VenueActivityChart.svelte", import.meta.url);
  const compiled = compile(await readFile(componentUrl, "utf8"), { generate: "server", filename: componentUrl.pathname });
  const source = compiled.js.code.replace(/from (["'])([^"']+)\1/g, (match, quote, specifier) => {
    if (specifier.startsWith("./utils/")) return "from " + quote + new URL(specifier + ".ts", componentUrl).href + quote;
    if (specifier.startsWith("svelte")) return "from " + quote + import.meta.resolve(specifier) + quote;
    return match;
  });
  const { default: Chart } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
  const html = render(Chart, { props: { data } }).body;
  assert.equal((html.match(/<canvas\b/g) ?? []).length, 1);
  assert.ok(!/<svg\b|<circle\b|<line\b/.test(html));
  assert.equal((html.match(/role="listbox"/g) ?? []).length, 1);
  assert.ok(html.includes("accessible text table"));
  const denseData = { ...data, venues: Array.from({ length: 1200 }, (_, index) => ({ ...first, venueKey: "dense-" + index })) };
  const denseHtml = render(Chart, { props: { data: denseData } }).body;
  assert.equal((denseHtml.match(/<canvas\b/g) ?? []).length, 1);
  assert.ok(denseHtml.length < 5000, "the chart's DOM does not grow by an element per mark or venue");
});
