<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import VenueActivityChart from "./VenueActivityChart.svelte";
  import { venueActivityYearRangeLabel, type VenueActivityData } from "./utils/venueActivity";
  import { filterVenueActivityByConnections } from "./utils/venueActivityFilters";

  export let data: VenueActivityData | undefined = undefined;
  export let status: "loading" | "ready" | "empty" | "error" = "loading";
  export let error = "";

  const dispatch = createEventDispatcher<{ close: void; retry: void }>();
  let width = 0;
  let height = 0;
  let backButton: HTMLButtonElement;
  let dialog: HTMLDivElement;
  let minimumYears = 1;
  let continuousOnly = false;

  $: filtered = data ? filterVenueActivityByConnections(data, minimumYears, continuousOnly) : undefined;

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
          <label for="venue-minimum-years">
            Minimum {continuousOnly ? "consecutive" : "recorded"} years:
            <output for="venue-minimum-years">{minimumYears}</output>
          </label>
          <input
            id="venue-minimum-years" type="range" min="1" max={filtered.maximumYears} step="1"
            bind:value={minimumYears}
            aria-valuetext={filtered.sliderValueText}
            aria-describedby="venue-filter-note"
          />
          <div class="range-labels" aria-hidden="true"><span>1</span><span>{filtered.maximumYears}</span></div>
        </div>
        <label class="continuity-filter">
          <input type="checkbox" bind:checked={continuousOnly} aria-describedby="venue-filter-note" />
          Continuous years only
        </label>
        <p id="venue-filter-note" class="visually-hidden">
          2020 is shown but not counted. 2019 and 2021 count as consecutive.
          Gaps are allowed when the checkbox is unchecked.
        </p>
      </div>
    {/if}
    <button
      type="button"
      bind:this={backButton}
      use:focusBackButton
      on:click={() => dispatch("close")}
    >Back to intro</button>
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
        <VenueActivityChart data={filtered.data} filterDescription={filtered.description} />
      {:else}
        <p class="view-state">No venue groups match. Lower the minimum or allow gaps.</p>
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
                  <th scope="row">{venue.venueName}</th>
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
    display: flex;
    flex-shrink: 0;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 1rem;
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
    flex: 1;
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

  .year-filter label {
    display: block;
    font-weight: 600;
  }

  input {
    accent-color: #252525;
    cursor: pointer;
    pointer-events: auto;
  }

  input[type="range"] {
    display: block;
    width: 100%;
    min-height: 2.75rem;
    margin: 0;
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    margin-top: -0.5rem;
    color: #595959;
    font-size: 0.75rem;
  }

  .continuity-filter {
    display: inline-flex;
    min-height: 2.75rem;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .continuity-filter input {
    width: 1.125rem;
    height: 1.125rem;
    margin: 0;
  }

  @media (max-width: 40rem) {
    .venue-header {
      flex-wrap: wrap;
    }

    .venue-header > button {
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
