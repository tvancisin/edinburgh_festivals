<script lang="ts">
  import { onMount } from "svelte";
  import { venueActivityYearRangeLabel, type VenueActivityData, type VenueActivityRecord } from "./utils/venueActivity";
  import { createVenueActivityCanvasRenderer, createVenueActivityFrameScheduler, type VenueActivityCanvasRenderer } from "./utils/venueActivityCanvas";
  import type { VenueActivityLayout } from "./utils/venueActivityLayout";
  import { findVenueActivityLabelAtX, findVenueActivityPreview, moveVenueActivityLabel } from "./utils/venueActivityInteraction";

  export let data: VenueActivityData;
  export let filterDescription = "";
  export let highlightedVenues: VenueActivityRecord[] = [];
  export let selectionDescription = "";

  let width = 0;
  let height = 0;
  let canvas: HTMLCanvasElement;
  let layout: VenueActivityLayout | null = null;
  let renderer: VenueActivityCanvasRenderer | null = null;
  let scheduler: ReturnType<typeof createVenueActivityFrameScheduler> | null = null;
  let pixelRatio = 1;
  let drawError = "";
  let canvasTooltip: string | undefined;
  let hoveredVenueKey: string | null = null;
  let focusedVenueKey: string | null = null;
  let pinnedVenueKey: string | null = null;

  $: previewVenueKey = hoveredVenueKey ?? focusedVenueKey ?? pinnedVenueKey;
  $: renderState = { data, width, height, highlightedVenues, previewVenueKey, pixelRatio };
  $: if (scheduler && renderState) scheduler.request();
  $: previewColumn = findVenueActivityPreview(layout?.columns ?? [], previewVenueKey);

  onMount(() => {
    let alive = true;
    updatePixelRatio();
    try {
      renderer = createVenueActivityCanvasRenderer(canvas, getComputedStyle(canvas).fontFamily);
      scheduler = createVenueActivityFrameScheduler(() => {
        if (!renderer) return;
        try {
          const state = renderState;
          layout = renderer.render(state.data, state.width, state.height,
            state.highlightedVenues, state.previewVenueKey, state.pixelRatio);
          drawError = "";
        } catch {
          drawError = "The venue chart could not be drawn. Try resetting or reopening the Venues view.";
        }
      }, (callback) => requestAnimationFrame(callback), (id) => cancelAnimationFrame(id));
      scheduler.request();
    } catch {
      drawError = "Canvas rendering is unavailable. Venue records remain available in the accessible text table.";
    }
    void document.fonts.ready.then(() => {
      if (!alive) return;
      renderer?.clearTextMeasurements();
      scheduler?.request();
    });
    return () => {
      alive = false;
      scheduler?.dispose();
      renderer?.dispose();
    };
  });

  function updatePixelRatio() {
    pixelRatio = window.devicePixelRatio || 1;
  }

  function venueAtPointer(event: MouseEvent) {
    if (!canvas || !layout) return null;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width) return null;
    const x = (event.clientX - bounds.left) * (layout.axisWidth + layout.plotWidth) / bounds.width - layout.axisWidth;
    return findVenueActivityLabelAtX(layout.columns, x);
  }

  function handleLabelPointerMove(event: PointerEvent) {
    if (event.pointerType !== "touch") hoveredVenueKey = venueAtPointer(event)?.venueKey ?? null;
  }

  function focusLabels() {
    const contextColumn = findVenueActivityPreview(layout?.columns ?? [], highlightedVenues[0]?.venueKey ?? null);
    focusedVenueKey = hoveredVenueKey ?? pinnedVenueKey ?? contextColumn?.venue.venueKey ?? data.venues[0]?.venueKey ?? null;
  }

  function handleLabelClick(event: MouseEvent) {
    const venue = event.detail === 0
      ? findVenueActivityPreview(layout?.columns ?? [], focusedVenueKey)?.venue
      : venueAtPointer(event);
    if (!venue) return;
    pinnedVenueKey = pinnedVenueKey === venue.venueKey ? null : venue.venueKey;
    focusedVenueKey = venue.venueKey;
  }

  function handleLabelKeydown(event: KeyboardEvent) {
    const next = moveVenueActivityLabel(data, focusedVenueKey ?? previewVenueKey, event.key);
    if (next) {
      event.preventDefault();
      hoveredVenueKey = null;
      focusedVenueKey = next.venueKey;
    } else if ((event.key === "Enter" || event.key === " ") && focusedVenueKey) {
      event.preventDefault();
      pinnedVenueKey = pinnedVenueKey === focusedVenueKey ? null : focusedVenueKey;
    }
  }
</script>

<svelte:window on:resize={updatePixelRatio} />

<div
  class="venue-activity-chart"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <div
    class="canvas-image"
    role="img"
    aria-labelledby="venue-activity-title"
    aria-describedby="venue-activity-description"
  >
    <canvas
      bind:this={canvas}
      aria-hidden="true"
      title={canvasTooltip}
      on:pointermove={(event) => (canvasTooltip = venueAtPointer(event)?.accessibleLabel)}
      on:pointerleave={() => (canvasTooltip = undefined)}
    >
      Venue records are also available in the accessible text table.
    </canvas>
  </div>
  <p id="venue-activity-title" class="visually-hidden">Venue records, {venueActivityYearRangeLabel}</p>
  <p id="venue-activity-description" class="visually-hidden">
    {filterDescription}
    {selectionDescription}
    {#if previewColumn}Highlighted venue: {previewColumn.venue.venueName}.{/if}
    Hover over venue labels to highlight their circles and lines. Focus the venue-label
    controls and use arrow keys, Home, or End to explore; Enter or Space keeps a
    highlight after focus leaves. Tap a label to keep its highlight. Reset clears it.
    Every venue group fits across the chart, with its name written vertically above it.
    Enlarged names appear horizontally above the first row without moving the year grid.
    Original venue-code groups can combine using reviewed sites or matching addresses;
    they are never split. Conflicting locations prevent further merging, so a column
    can still contain different locations sharing one code. Original names, codes, and
    grouping evidence are retained in the screen-reader table.
    The years run from {data.years[0]} at the top to {data.years[data.years.length - 1]} at the bottom.
    Venues recorded in more years appear on the left; ties are alphabetical.
    A tiny circle marks at least one event record for that venue and year.
    Thin lines connect consecutive recorded years within the same venue group.
    A missing year breaks a line, except that 2019 connects to 2021 when
    2020 has no record, following the filter's continuity rule. A blank means no
    event record. The same information is available in the screen-reader table.
  </p>
  <div
    class="venue-label-controls"
    role="listbox"
    aria-label="Venue labels"
    aria-describedby="venue-label-help"
    aria-multiselectable="true"
    aria-activedescendant={previewColumn ? "venue-label-option-" + previewColumn.index : undefined}
    tabindex={layout?.columns.length && !drawError ? 0 : -1}
    title={previewColumn?.venue.accessibleLabel}
    style:left={(layout?.axisWidth ?? 0) + "px"}
    style:width={(layout?.plotWidth ?? 0) + "px"}
    style:height={Math.min(height, Math.max(44, layout?.gridTop ?? 0)) + "px"}
    on:pointermove={handleLabelPointerMove}
    on:pointerleave={() => (hoveredVenueKey = null)}
    on:focus={focusLabels}
    on:blur={() => (focusedVenueKey = null)}
    on:click={handleLabelClick}
    on:keydown={handleLabelKeydown}
  >
    {#if previewColumn}
      <span
        class="visually-hidden"
        id={"venue-label-option-" + previewColumn.index}
        role="option"
        aria-selected={previewColumn.highlighted}
        aria-posinset={previewColumn.index + 1}
        aria-setsize={data.venues.length}
      >{previewColumn.venue.accessibleLabel}</span>
    {/if}
  </div>
  <p id="venue-label-help" class="visually-hidden">
    Use arrow keys to highlight venue labels. Home and End move to the first and last venue.
    Enter or Space keeps the highlight after focus leaves. Reset restores the default view.
    The complete venue list and year records are available in the accessible text table.
  </p>
  {#if drawError}<p class="chart-error" role="alert">{drawError}</p>{/if}
</div>

<style>
  .venue-activity-chart {
    position: relative;
    flex: 1 1 0;
    height: 0;
    min-height: 0;
    width: 100%;
    overflow: hidden;
  }

  .canvas-image,
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .venue-label-controls {
    position: absolute;
    top: 0;
    cursor: default;
  }

  .venue-label-controls:focus-visible {
    outline: 2px solid #006b63;
    outline-offset: -2px;
  }

  .chart-error {
    position: absolute;
    inset: 0;
    display: grid;
    align-content: center;
    padding: 1rem;
    margin: 0;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
</style>
