<script lang="ts">
  import { createEventDispatcher, onDestroy } from "svelte";
  import type { ContinentCountrySummary } from "./utils/continentSummary";
  import {
    continentDetailKey, countryDetailKey, moveCountryFocus, selectStripDetail,
    selectTabCountry, type CountryRecordSummary, type StripDetail,
  } from "./utils/countrySummary";
  import { eventCountryStripLayout } from "./utils/eventCountryStrip";
  import { ticketCountryStripLayout } from "./utils/ticketCountries";

  export let summaries: ContinentCountrySummary[];
  export let countries: CountryRecordSummary[];
  export let side: "left" | "right";
  export let scope: string;

  const dispatch = createEventDispatcher<{ mapPreview: StripDetail | null }>();

  let width = 0;
  let height = 0;
  let tooltipHeight = 0;
  let container: HTMLDivElement;
  let activeKey: string | null = null;
  let hoveredKey: string | null = null;
  let focusedKey: string | null = null;
  let pinnedKey: string | null = null;
  let tabCountryKey: string | null = null;
  const countryElements = new Map<string, SVGRectElement>();
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  $: active = selectStripDetail(summaries, countries, activeKey);
  $: dispatch("mapPreview", active);
  $: tabCountry = selectTabCountry(countries, tabCountryKey);
  $: label = side === "left" ? "Event Origins" : "Visitor Origins";
  $: tooltipId = `strip-detail-${side}`;
  $: continentWidth = side === "left"
    ? eventCountryStripLayout.continentWidth
    : ticketCountryStripLayout.continentWidth;
  $: continentX = side === "left"
    ? eventCountryStripLayout.leftInset
    : width - ticketCountryStripLayout.rightInset - ticketCountryStripLayout.continentWidth;
  $: countryX = side === "left"
    ? eventCountryStripLayout.leftInset + eventCountryStripLayout.continentWidth
    : width - ticketCountryStripLayout.rightInset - ticketCountryStripLayout.titleWidth + ticketCountryStripLayout.contentOffset;
  $: countryWidth = side === "left"
    ? eventCountryStripLayout.countryWidth
    : ticketCountryStripLayout.countryWidth;
  $: countryInnerEdge = side === "left" ? countryX + countryWidth : countryX;
  $: stripEdge = side === "left"
    ? eventCountryStripLayout.leftInset + eventCountryStripLayout.titleWidth
    : ticketCountryStripLayout.rightInset + ticketCountryStripLayout.titleWidth;
  $: tooltipWidth = Math.max(0, Math.min(260, width - stripEdge - 24));
  $: tooltipLeft = side === "left" ? stripEdge + 12 : width - stripEdge - 12 - tooltipWidth;
  $: tooltipTop = Math.max(12, Math.min(
    height - tooltipHeight - 12,
    (active?.summary.x ?? 0) + (active?.summary.width ?? 0) / 2 - tooltipHeight / 2,
  ));

  function cancelClose() {
    clearTimeout(closeTimer);
  }

  function showOnHover(key: string) {
    cancelClose();
    hoveredKey = key;
    activeKey = key;
  }

  function closeWhenUnused() {
    cancelClose();
    // Allow the pointer to cross the small gap into the tooltip.
    closeTimer = setTimeout(() => {
      activeKey = hoveredKey ?? focusedKey ?? pinnedKey;
    }, 150);
  }

  function leaveHover() {
    hoveredKey = null;
    closeWhenUnused();
  }

  function focusTarget(key: string) {
    cancelClose();
    focusedKey = key;
    activeKey = key;
  }

  function blurTarget() {
    focusedKey = null;
    closeWhenUnused();
  }

  function toggleTarget(key: string) {
    cancelClose();
    if (pinnedKey === key) {
      dismiss();
    } else {
      pinnedKey = key;
      activeKey = key;
    }
  }

  function handleKeydown(event: KeyboardEvent, key: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleTarget(key);
    }
  }

  function registerCountry(element: SVGRectElement, key: string) {
    countryElements.set(key, element);
    return { destroy: () => countryElements.delete(key) };
  }

  function focusCountry(country: CountryRecordSummary) {
    tabCountryKey = country.countryKey;
    focusTarget(countryDetailKey(country.countryKey));
  }

  function handleCountryKeydown(event: KeyboardEvent, country: CountryRecordSummary) {
    const next = moveCountryFocus(countries, country.countryKey, event.key);
    if (next) {
      event.preventDefault();
      tabCountryKey = next.countryKey;
      countryElements.get(next.countryKey)?.focus();
    } else {
      handleKeydown(event, countryDetailKey(country.countryKey));
    }
  }

  function keepTooltipOpen() {
    if (activeKey !== null) showOnHover(activeKey);
  }

  function dismiss() {
    cancelClose();
    pinnedKey = null;
    hoveredKey = null;
    focusedKey = null;
    activeKey = null;
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === "Escape" && activeKey !== null) {
      event.preventDefault();
      dismiss();
    }
  }

  function handleOutsidePointer(event: PointerEvent) {
    if (event.target instanceof Node && !container.contains(event.target)) dismiss();
  }

  onDestroy(() => {
    cancelClose();
    dispatch("mapPreview", null);
  });
</script>

<svelte:window on:keydown={handleEscape} on:pointerdown={handleOutsidePointer} />

<div
  class="strip-details-layer"
  bind:this={container}
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <p id={`country-keyboard-help-${side}`} class="visually-hidden">
    Tab to a country, then use the Up and Down Arrow keys to move through countries.
    Home and End move to the first and last country. Press Escape to dismiss a tooltip.
  </p>
  <svg
    {width} {height} role="group" aria-label={`${label} by continent`}
    aria-describedby={`country-keyboard-help-${side}`}
  >
    {#each countries as country (country.countryKey)}
      <rect
        class="country-target"
        class:has-record={country.hasRecords}
        class:active={activeKey === countryDetailKey(country.countryKey)}
        x={countryX}
        y={country.x}
        width={countryWidth}
        height={country.width}
        role="button"
        tabindex={tabCountry?.countryKey === country.countryKey ? 0 : -1}
        aria-label={`${scope}. ${country.accessibleLabel}`}
        aria-expanded={activeKey === countryDetailKey(country.countryKey)}
        aria-controls={activeKey === countryDetailKey(country.countryKey) ? tooltipId : undefined}
        use:registerCountry={country.countryKey}
        on:mouseenter={() => showOnHover(countryDetailKey(country.countryKey))}
        on:mouseleave={leaveHover}
        on:focus={() => focusCountry(country)}
        on:blur={blurTarget}
        on:click={() => toggleTarget(countryDetailKey(country.countryKey))}
        on:keydown={(event) => handleCountryKeydown(event, country)}
      />
    {/each}
    {#each summaries as summary (summary.continent)}
      <g
        class="continent-target"
        class:active={activeKey === continentDetailKey(summary.continent)}
        role="button"
        tabindex="0"
        aria-label={`${label}. ${scope}. ${summary.accessibleLabel}`}
        aria-expanded={activeKey === continentDetailKey(summary.continent)}
        aria-controls={activeKey === continentDetailKey(summary.continent) ? tooltipId : undefined}
        on:mouseenter={() => showOnHover(continentDetailKey(summary.continent))}
        on:mouseleave={leaveHover}
        on:focus={() => focusTarget(continentDetailKey(summary.continent))}
        on:blur={blurTarget}
        on:click={() => toggleTarget(continentDetailKey(summary.continent))}
        on:keydown={(event) => handleKeydown(event, continentDetailKey(summary.continent))}
      >
        <rect
          x={continentX}
          y={summary.x}
          width={continentWidth}
          height={summary.width}
        />
        <text
          class="continent-label"
          text-anchor="start"
          dominant-baseline="middle"
          transform={`translate(${continentX + continentWidth / 1.5} ${summary.x + 2}) rotate(90)`}
          aria-hidden="true"
        >{#if summary.continent === "North America" || summary.continent === "South America"}
            <tspan x="0">{summary.continent === "North America" ? "North" : "South"}</tspan>
            <tspan x="0" dy="1em">America</tspan>
          {:else}
            {summary.continent}
          {/if}</text>
      </g>
    {/each}
  </svg>

  {#if active}
    <!-- Bridge only the empty gap: country rectangles remain available when
         moving from a continent to one of its countries. -->
    <div
      class="summary-hover-bridge"
      aria-hidden="true"
      style:left={`${side === "left" ? countryInnerEdge : tooltipLeft + tooltipWidth}px`}
      style:top={`${Math.min(active.summary.x, tooltipTop)}px`}
      style:width={`${Math.max(0, side === "left"
        ? tooltipLeft - countryInnerEdge
        : countryInnerEdge - tooltipLeft - tooltipWidth)}px`}
      style:height={`${Math.max(active.summary.x + active.summary.width, tooltipTop + tooltipHeight) - Math.min(active.summary.x, tooltipTop)}px`}
      on:mouseenter={keepTooltipOpen}
      on:mouseleave={leaveHover}
    ></div>
    <!-- The tooltip stays open while its text is hovered; its trigger provides
         the same full summary to keyboard and screen-reader users. -->
    <div
      id={tooltipId}
      class="summary-tooltip"
      role="tooltip"
      style:left={`${tooltipLeft}px`}
      style:top={`${tooltipTop}px`}
      style:width={`${tooltipWidth}px`}
      style:max-height={`${Math.max(0, height - 24)}px`}
      bind:clientHeight={tooltipHeight}
      on:mouseenter={keepTooltipOpen}
      on:mouseleave={leaveHover}
    >
      {#if active.kind === "country"}
        <h3>{active.summary.countryName}</h3>
        <p>{active.summary.countLabel}</p>
      {:else}
        <h3>{active.summary.continent} · {label}</h3>
        <p class="summary-scope">{scope}</p>
        <ul>
          <li>{active.summary.withRecordsLabel}</li>
          <li>{active.summary.withoutRecordsLabel}</li>
          {#if active.summary.countriesWithUnavailableCounts > 0}
            <li>{active.summary.unavailableLabel}</li>
          {/if}
        </ul>
        <p class="summary-note">{active.summary.totalLabel}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .strip-details-layer {
    position: absolute;
    z-index: 4;
    inset: 0;
    pointer-events: none;
  }

  svg {
    display: block;
  }

  .continent-target,
  .country-target {
    outline: none;
    cursor: pointer;
    pointer-events: all;
  }

  .country-target {
    fill: #d6d6d6;
  }

  .country-target.has-record {
    fill: #9b9b9b;
  }

  .country-target.active,
  .country-target:focus-visible {
    stroke: #252525;
    stroke-width: 1.5px;
  }

  .continent-target rect {
    fill: #b8b7b2;
    stroke: none;
    transform-box: fill-box;
    transform-origin: center;
  }

  .continent-target.active rect,
  .continent-target:focus-visible rect {
    fill: #a7a6a0;
    stroke: #252525;
    stroke-width: 1.5px;
    transform: scaleX(1.1);
  }

  .continent-label {
    fill: #252525;
    font-size: 10px;
    font-weight: 700;
    pointer-events: none;
  }

  .summary-hover-bridge {
    position: absolute;
    pointer-events: auto;
  }

  .summary-tooltip {
    position: absolute;
    box-sizing: border-box;
    overflow-y: auto;
    padding: 0.875rem;
    border: 1px solid #595959;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #252525;
    font-size: 0.875rem;
    line-height: 1.5;
    pointer-events: auto;
  }

  h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    line-height: 1.25;
  }

  p {
    margin: 0;
  }

  ul {
    margin: 0.75rem 0;
    padding-left: 1.125rem;
  }

  .summary-scope,
  .summary-note {
    color: #595959;
    font-size: 0.75rem;
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
