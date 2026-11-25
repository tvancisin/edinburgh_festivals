<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import VenueActivityChart from "./VenueActivityChart.svelte";
  import { venueActivityYearRangeLabel, type VenueActivityData } from "./utils/venueActivity";
  import { filterVenueActivityByConnections } from "./utils/venueActivityFilters";
  import type { HexBinVenue } from "./utils/hexBinPopup";
  import { describeVenueActivityContext, findVenueActivityContext } from "./utils/venueActivityContext";

  export let data: VenueActivityData | undefined = undefined;
  export let status: "loading" | "ready" | "empty" | "error" = "loading";
  export let error = "";
  export let backLabel = "Back to intro";
  export let selectedVenue: HexBinVenue | null = null;

  const dispatch = createEventDispatcher<{ close: void; retry: void; reset: void }>();
  let width = 0;
  let height = 0;
  let backButton: HTMLButtonElement;
  let dialog: HTMLDivElement;
  let minimumYears = 1;
  let chartResetVersion = 0;

  $: filtered = data ? filterVenueActivityByConnections(data, minimumYears) : undefined;
  $: highlightedVenues = findVenueActivityContext(data, selectedVenue);
  $: selectionDescription = describeVenueActivityContext(selectedVenue, highlightedVenues, filtered?.data);
  $: sliderThumbPosition = filtered && filtered.maximumYears > 1
    ? (minimumYears - 1) / (filtered.maximumYears - 1) * 100
    : 50;

  function focusBackButton(button: HTMLButtonElement) {
    button.focus({ preventScroll: true });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      dispatch("close");
    } else if (event.key === "Tab") {
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), summary, [tabindex="0"]',
      )).filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }

  function retry() {
    dispatch("retry");
    backButton.focus({ preventScroll: true });
  }

  function resetView() {
    minimumYears = 1;
    selectedVenue = null;
    chartResetVersion += 1;
    dispatch("reset");
  }
</script>

<div
  class="venue-explorer"
  role="dialog"
  aria-modal="true"
  aria-label={`Venue records, ${venueActivityYearRangeLabel}`}
  tabindex="-1"
  bind:this={dialog}
  style:--content-padding={`${Math.max(12, Math.min(24, width * 0.025))}px`}
  style:--content-gap={`${Math.max(12, Math.min(24, height * 0.025))}px`}
  bind:clientWidth={width}
  bind:clientHeight={height}
  on:keydown={handleKeydown}
>
  <div class="venue-header">
    {#if status === "ready" && data && filtered}
      <div class="venue-filters">
        <div class="year-filter">
          <label for="venue-minimum-years" class="visually-hidden">Minimum recorded years</label>
          <div class="range-control">
            <div class="range-labels">
              <span class="range-min" class:is-current={minimumYears === 1} aria-hidden="true">1</span>
              <output for="venue-minimum-years" style:left={`${sliderThumbPosition}%`}>{minimumYears}</output>
              <span class="range-max" class:is-current={minimumYears === filtered.maximumYears} aria-hidden="true">{filtered.maximumYears}</span>
            </div>
            <input
              id="venue-minimum-years" type="range" min="1" max={filtered.maximumYears} step="1"
              title="Minimum recorded years"
              bind:value={minimumYears}
              aria-valuetext={filtered.sliderValueText}
              aria-describedby="venue-filter-note"
            />
          </div>
        </div>
        <p id="venue-filter-note" class="visually-hidden">
          2020 is shown but not counted. Gaps between recorded years are allowed.
        </p>
      </div>
    {/if}
    <div class="venue-actions">
      <button type="button" disabled={status !== "ready"} on:click={resetView}>Reset</button>
      <button
        type="button"
        bind:this={backButton}
        use:focusBackButton
        on:click={() => dispatch("close")}
      >{backLabel}</button>
    </div>
  </div>
  <div class="venue-body" aria-busy={status === "loading"}>
    {#if status === "loading"}
      <p class="view-state" role="status">Loading venue records for {venueActivityYearRangeLabel}…</p>
    {:else if status === "error"}
      <div class="view-state" role="alert">
        <p>Venue records could not be loaded: {error}</p>
        <button type="button" on:click={retry}>Try again</button>
      </div>
    {:else if status === "empty" || !data}
      <p class="view-state" role="status">No venue records are available for {venueActivityYearRangeLabel}.</p>
    {:else if filtered}
      <p class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{filtered.statusLabel}</p>
      {#if filtered.data.venues.length > 0}
        {#key chartResetVersion}
          <VenueActivityChart data={filtered.data} filterDescription={filtered.description} {highlightedVenues} {selectionDescription} />
        {/key}
      {:else}
        <p class="view-state">No venue groups match. Lower the minimum number of recorded years.</p>
      {/if}
      {#if data.unassignedYearRecordCount > 0}
        <p class="data-note">
          {data.unassignedYearRecordCount} records have an unknown or other year and have no year marker.
        </p>
      {/if}
      <div class="visually-hidden">
          <table>
            <caption>Event-record presence by venue site and year, with original names, codes, and grouping evidence. {filtered.description} {filtered.statusLabel}</caption>
            <thead>
              <tr>
                <th scope="col">Site or separate source venue</th>
                <th scope="col">Original venue names</th>
                <th scope="col">Original codes</th>
                <th scope="col">Grouping evidence</th>
                {#each data.years as year (year)}<th scope="col">{year}</th>{/each}
              </tr>
            </thead>
            <tbody>
              {#each filtered.data.venues as venue (venue.venueKey)}
                <tr>
                  <th scope="row">{venue.venueName}{highlightedVenues.includes(venue) ? " (selected)" : ""}</th>
                  <td>{#each venue.venueNames as name, index}{index > 0 ? "; " : ""}{name || "Unnamed venue"}{/each}</td>
                  <td>{venue.codeLabel}</td>
                  <td>{venue.site.matchExplanation}</td>
                  {#each venue.presence as presence (presence.year)}
                    <td>{presence.isRecorded ? "Recorded" : "Not recorded"}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
      </div>
    {/if}
  </div>
</div>

<style>
  .venue-explorer {
    position: fixed;
    z-index: 1500;
    inset: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    background: #f8f7f4;
    color: #252525;
  }

  .venue-header {
    --toolbar-gap: 0.5rem;
    display: flex;
    flex-shrink: 0;
    align-items: flex-start;
    justify-content: flex-end;
    gap: var(--toolbar-gap);
    padding: 8px var(--content-padding) 4px;
  }

  button {
    flex-shrink: 0;
    min-height: 2.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid #252525;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #252525;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
  }

  button:hover {
    background: #efeee9;
  }

  .venue-actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--toolbar-gap);
  }

  button:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .venue-body {
    display: flex;
    flex-direction: column;
    gap: var(--content-gap);
    min-height: 0;
    overflow: hidden;
    padding: 0 var(--content-padding) 4px;
  }

  p {
    flex-shrink: 0;
    margin: 0;
    line-height: 1.5;
  }

  .data-note {
    max-width: 55rem;
    color: #595959;
    font-size: 0.75rem;
  }

  .venue-filters {
    display: flex;
    flex: 0 1 20rem;
    min-width: 0;
    flex-wrap: wrap;
    align-items: center;
    column-gap: 1.5rem;
    row-gap: 0.25rem;
    font-size: 0.875rem;
  }

  .year-filter {
    flex: 0 1 20rem;
    min-width: 0;
    width: 100%;
  }

  .range-control {
    position: relative;
    min-height: 2.75rem;
  }

  input[type="range"] {
    appearance: none;
    -webkit-appearance: none;
    display: block;
    width: 100%;
    height: 2.75rem;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  input[type="range"]::-webkit-slider-runnable-track {
    height: 1px;
    border: 0;
    background: #252525;
  }

  input[type="range"]::-moz-range-track,
  input[type="range"]::-moz-range-progress {
    height: 1px;
    border: 0;
    background: #252525;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -6.5px;
    border: 0;
    border-radius: 50%;
    background: #252525;
  }

  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: 0;
    border-radius: 50%;
    background: #252525;
  }

  input[type="range"]:focus-visible {
    outline: none;
  }

  input[type="range"]:focus-visible::-webkit-slider-thumb {
    outline: 2px solid #006b63;
    outline-offset: 2px;
  }

  input[type="range"]:focus-visible::-moz-range-thumb {
    outline: 2px solid #006b63;
    outline-offset: 2px;
  }

  .range-labels {
    position: absolute;
    top: -0.125rem;
    right: 7px;
    left: 7px;
    height: 0.875rem;
    color: #595959;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    pointer-events: none;
  }

  .range-min,
  .range-max,
  .range-labels output {
    position: absolute;
    top: 0;
  }

  .range-min {
    left: 0;
    transform: translateX(-50%);
  }

  .range-max {
    right: 0;
    transform: translateX(50%);
  }

  .range-labels output {
    color: #252525;
    font-weight: 700;
    transform: translateX(-50%);
  }

  .range-labels .is-current {
    visibility: hidden;
  }

  @media (forced-colors: active) {
    input[type="range"]::-webkit-slider-runnable-track,
    input[type="range"]::-webkit-slider-thumb {
      background: CanvasText;
    }

    input[type="range"]::-moz-range-track,
    input[type="range"]::-moz-range-progress,
    input[type="range"]::-moz-range-thumb {
      background: CanvasText;
    }

    input[type="range"]:focus-visible::-webkit-slider-thumb {
      outline-color: Highlight;
    }

    input[type="range"]:focus-visible::-moz-range-thumb {
      outline-color: Highlight;
    }
  }

  @media (max-width: 40rem) {
    .venue-header {
      flex-wrap: wrap;
    }

    .venue-actions {
      order: -1;
      margin-left: auto;
    }

    .venue-filters {
      flex-basis: 100%;
    }
  }

  .view-state {
    padding: 1rem 0;
  }

  .view-state button {
    margin-top: 1rem;
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
