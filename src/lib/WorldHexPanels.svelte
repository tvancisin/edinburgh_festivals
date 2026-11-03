<script lang="ts">
  import { onDestroy } from "svelte";
  import {
    createWorldHexLayout,
    getNextWorldHexCellIndex,
    getWorldHexPanelBox,
    getWorldHexTooltipPosition,
    type RawWorldHex,
    type WorldHexData,
    type WorldHexDataStatus,
    type WorldHexLayout,
  } from "./utils/worldHexMap";
  import {
    addCountryRepresentationToLayout,
    describeCountryRepresentation,
    listRepresentedCountries,
    type CountryRepresentation,
    type RepresentedWorldHexCell,
  } from "./utils/festivalCountries";

  export let circleX = 0;
  export let circleRadius = 0;
  export let data: WorldHexData | undefined;
  export let status: WorldHexDataStatus = "loading";
  export let error = "";
  export let representation: CountryRepresentation | undefined;
  export let scope = "All festivals";
  export let countryStatus: WorldHexDataStatus = "loading";
  export let countryError = "";

  let width = 0;
  let height = 0;
  let hexLayout: WorldHexLayout | undefined;
  let container: HTMLDivElement;
  let activeCell: RepresentedWorldHexCell | null = null;
  let popupMode: "hover" | "focus" | "tap" | null = null;
  let tooltipWidth = 0;
  let tooltipHeight = 0;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let focusedIndices = { americas: 0, rest: 0 };

  $: hexLayout = createWorldHexLayout(
    data,
    width,
    height,
    circleX,
    circleRadius,
  );
  $: statusPanel = getWorldHexPanelBox("americas", width, height, circleX, circleRadius);
  $: displayLayout = addCountryRepresentationToLayout(hexLayout, representation, scope);
  $: countryDescription = representation ? describeCountryRepresentation(representation, scope) : "";
  $: countryRows = representation ? listRepresentedCountries(representation) : [];
  $: tooltipPosition = activeCell
    ? getWorldHexTooltipPosition(activeCell, width, height, tooltipWidth, tooltipHeight,
      hexLayout?.hexRadius ?? 0)
    : { x: 0, y: 0 };
  // Dismiss popups when geometry, counts, or the festival selection changes.
  $: { displayLayout; dismissPopup(); }

  onDestroy(cancelClose);

  function cancelClose() {
    clearTimeout(closeTimer);
    closeTimer = undefined;
  }

  function dismissPopup() {
    cancelClose();
    activeCell = null;
    popupMode = null;
  }

  function showPopup(cell: RepresentedWorldHexCell, mode: "hover" | "focus" | "tap") {
    cancelClose();
    activeCell = cell;
    popupMode = mode;
  }

  function scheduleHoverClose() {
    if (popupMode !== "hover") return;
    cancelClose();
    closeTimer = setTimeout(() => {
      if (popupMode === "hover") dismissPopup();
    }, 150);
  }

  function togglePopup(cell: RepresentedWorldHexCell) {
    if (activeCell === cell && popupMode === "tap") dismissPopup();
    else showPopup(cell, "tap");
  }

  function handleOutsidePointer(event: PointerEvent) {
    const target = event.target;
    if (target instanceof Element && container?.contains(target) &&
      target.closest(".hex-cell, .country-tooltip")) return;
    dismissPopup();
  }

  function handleCellKeydown(
    event: KeyboardEvent,
    cells: RepresentedWorldHexCell[],
    index: number,
    group: RawWorldHex["group"],
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePopup(cells[index]);
    } else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const nextIndex = getNextWorldHexCellIndex(cells, index, event.key);
      focusedIndices[group] = nextIndex;
      container.querySelector<SVGPolygonElement>(
        `[data-world-group="${group}"] [data-hex-index="${nextIndex}"]`,
      )?.focus({ preventScroll: true });
    }
  }
</script>

<svelte:window
  on:pointerdown={handleOutsidePointer}
  on:keydown={(event) => { if (event.key === "Escape") dismissPopup(); }}
/>

<div
  class="world-hex-panels"
  bind:this={container}
  bind:clientWidth={width}
  bind:clientHeight={height}
>
<svg
  {width}
  {height}
  role="group"
  aria-labelledby="world-hex-map-title world-hex-map-description"
>
  <title id="world-hex-map-title">
    World hex maps on both sides of Edinburgh
  </title>
  <desc id="world-hex-map-description">
    The Americas appear on the left with detached Pacific islands omitted.
    The remaining world appears on the right with detached western outliers
    and islands east of Australia omitted; Iceland and New Zealand are retained.
    Selected remote territories are also omitted.
    New Zealand's island spacing is adjusted schematically.
    Hawaii is represented by two schematic hexagons in the Americas panel.
    Scotland, England, Wales, and Northern Ireland each have one UK hexagon.
    Both panels use the same
    hexagon size and a Natural Earth projection. Coastlines are approximate
    at this grid resolution. Higher opacity means more related event records
    in the current festival selection, using a logarithmic scale. UK nations
    have separate counts; unspecified UK records are listed separately.
    Hover, focus, or tap a hexagon for its name and exact count. The country
    representation table provides the counts without using the map.
    Use Tab to enter each panel, arrow keys to move between hexagons, and Escape
    to dismiss the popup. Tap outside a hexagon to dismiss a popup on touch screens.
  </desc>
  {#if displayLayout}
    {#each displayLayout.panels as layout (layout.group)}
    <g
      role="group"
      aria-labelledby={`world-hex-${layout.group}-title`}
      data-world-group={layout.group}
    >
      <title id={`world-hex-${layout.group}-title`}>
        {layout.group === "americas" ? "Americas" : "Rest of the world"}:
        {layout.cells.length} hexagons, using the same scale as the opposite panel.
      </title>
    <g class="hex-cells">
      {#each layout.cells as cell, index}
        <polygon
          class="hex-cell"
          class:active={activeCell === cell}
          points={cell.points}
          fill-opacity={cell.fillOpacity}
          role="button"
          tabindex={focusedIndices[layout.group] === index ? 0 : -1}
          aria-label={cell.accessibleLabel}
          aria-describedby={activeCell === cell ? "world-hex-tooltip" : undefined}
          data-hex-index={index}
          data-country-id={cell.countryId ?? cell.countryName}
          data-country-name={cell.countryName}
          data-event-count={cell.eventCount}
          on:pointerenter={(event) => {
            if (event.pointerType !== "touch") showPopup(cell, "hover");
          }}
          on:pointerleave={scheduleHoverClose}
          on:focus={() => {
            focusedIndices[layout.group] = index;
            showPopup(cell, "focus");
          }}
          on:blur={() => { if (activeCell === cell && popupMode === "focus") dismissPopup(); }}
          on:click={() => togglePopup(cell)}
          on:keydown={(event) => handleCellKeydown(event, layout.cells, index, layout.group)}
        />
      {/each}
    </g>
    {#if !layout.cells.length}
      <text
        class="empty-message"
        x={layout.panel.x + layout.panel.width / 2}
        y={height / 2}
        text-anchor="middle"
      >No hexagons are available.</text>
    {/if}
    </g>
    {/each}
  {/if}
</svg>
{#if activeCell && displayLayout}
  <div
    id="world-hex-tooltip"
    class="country-tooltip"
    role="tooltip"
    bind:clientWidth={tooltipWidth}
    bind:clientHeight={tooltipHeight}
    style:left={`${tooltipPosition.x}px`}
    style:top={`${tooltipPosition.y}px`}
    on:pointerenter={cancelClose}
    on:pointerleave={scheduleHoverClose}
  >
    <strong>{activeCell.countryName}</strong>
    <span class="tooltip-count">{activeCell.eventCountLabel}</span>
  </div>
{/if}
<p class="visually-hidden" aria-live="polite">{countryDescription}</p>
<details class="country-key">
  <summary>
    <span>{scope} · Country counts</span>
    <span class="key-hint">
      {#if countryStatus === "error" || status === "error"}
        Country counts are unavailable
      {:else if !representation}
        Loading country counts…
      {:else}
        Darker hexagons mean more event records
      {/if}
    </span>
  </summary>
  <div class="country-counts" style:max-height={`${Math.max(120, height * 0.45)}px`}>
    {#if countryStatus === "error"}
      <p role="status">Country counts could not be loaded: {countryError}</p>
    {:else if status === "error"}
      <p role="status">Country matching is unavailable while the world map could not be loaded.</p>
    {:else if !representation}
      <p role="status">Loading country counts…</p>
    {:else}
      <p>{countryDescription}</p>
      <p>
        Counts use the Country column, with one count per listed country per
        event record. Multi-country records count toward each listed country.
        A logarithmic opacity scale separates smaller counts and rescales for
        each festival selection. Faint hexagons have zero
        related records. Unspecified UK entries are not assigned to UK nations.
      </p>
      {#if countryRows.length}
        <table>
          <caption>Related event records · {scope}</caption>
          <thead><tr><th scope="col">Country or UK nation</th><th scope="col">Records</th></tr></thead>
          <tbody>
            {#each countryRows as country (country.key)}
              <tr><th scope="row">{country.name}</th><td>{country.eventCount.toLocaleString("en-US")}</td></tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p>No country associations are available for these event records.</p>
      {/if}
      {#if representation.unmatchedValues.length}
        <p>Unmatched source values:</p>
        <ul>
          {#each representation.unmatchedValues as unmatched (unmatched.value)}
            <li>{unmatched.value}: {unmatched.eventCount} event records</li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
</details>
{#if status !== "ready"}
  <p
    class="data-status"
    role="status"
    style:left={`${statusPanel.x}px`}
    style:top={`${height / 2}px`}
    style:width={`${statusPanel.width}px`}
  >
    {#if status === "loading"}
      Loading world maps…
    {:else if status === "empty"}
      No world hexagons are available.
    {:else}
      World maps could not be loaded: {error}
    {/if}
  </p>
{/if}
</div>

<style>
  .world-hex-panels {
    position: absolute;
    z-index: 2;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .hex-cells {
    fill: #000000;
    stroke: #f8f7f4;
    stroke-width: 1px;
    stroke-linejoin: round;
  }

  .hex-cell {
    pointer-events: auto;
    cursor: help;
  }

  .hex-cell.active,
  .hex-cell:focus-visible {
    stroke: #252525;
    stroke-width: 2px;
    outline: none;
  }

  .country-tooltip {
    position: absolute;
    z-index: 1;
    box-sizing: border-box;
    max-width: calc(100% - 16px);
    padding: 0.5rem 0.75rem;
    border: 1px solid #252525;
    border-radius: 0.25rem;
    background: #f8f7f4;
    color: #252525;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.4;
    overflow-wrap: anywhere;
    box-shadow: 0 2px 8px #25252526;
    pointer-events: auto;
  }

  .tooltip-count {
    display: block;
    margin-top: 0.25rem;
    font-weight: 400;
  }

  .country-key {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: max-content;
    max-width: min(32rem, calc(100% - 2rem));
    border: 1px solid #252525;
    border-radius: 0.25rem;
    background: #f8f7f4;
    color: #252525;
    font-size: 0.75rem;
    pointer-events: auto;
  }

  .country-key summary {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-weight: 600;
  }

  .country-key summary:focus-visible {
    outline: 2px solid #252525;
    outline-offset: 2px;
  }

  .key-hint {
    display: block;
    margin-top: 0.125rem;
    font-weight: 400;
  }

  .country-counts {
    overflow: auto;
    padding: 0 0.75rem 0.75rem;
    overflow-wrap: anywhere;
  }

  .country-counts p {
    margin: 0.5rem 0;
    line-height: 1.5;
  }

  .country-counts table {
    width: 100%;
    border-collapse: collapse;
  }

  .country-counts caption {
    padding: 0.5rem 0;
    text-align: left;
    font-weight: 700;
  }

  .country-counts th,
  .country-counts td {
    padding: 0.375rem;
    border-bottom: 1px solid #d9d9d9;
    text-align: left;
  }

  .country-counts td {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (max-width: 42rem) {
    .country-key {
      top: 4rem;
      right: 0.5rem;
      max-width: min(32rem, calc(100% - 1rem));
    }
  }

  svg {
    display: block;
  }

  .data-status {
    position: absolute;
    margin: 0;
    padding: 0.5rem;
    font-size: 0.875rem;
    text-align: center;
    overflow-wrap: anywhere;
    transform: translateY(-50%);
  }

  .empty-message {
    fill: #252525;
    font-size: 9px;
    font-weight: 700;
    paint-order: stroke;
    stroke: #f8f7f4;
    stroke-linejoin: round;
    stroke-width: 3px;
  }
</style>
