<script lang="ts">
  import {
    type CountryStripData,
  } from "./utils/countryStripData";
  import {
    type CountryRepresentation,
  } from "./utils/festivalCountries";
  import { createEventCountryStrip, eventCountryStripLayout } from "./utils/eventCountryStrip";
  import { createEventContinentSummaries } from "./utils/continentSummary";
  import { createEventCountrySummaries } from "./utils/countrySummary";
  import CountryStripDetails from "./CountryStripDetails.svelte";

  export let data: CountryStripData | undefined;
  export let representation: CountryRepresentation | undefined;
  export let scope = "All festivals";

  let width = 0;
  let height = 0;

  const stripWidth = eventCountryStripLayout.titleWidth;

  $: countries = createEventCountryStrip(data, representation, height);
  $: continents = createEventContinentSummaries(countries);
  $: countrySummaries = createEventCountrySummaries(countries);
</script>

<div
  class="country-strip"
  style:left={`${eventCountryStripLayout.leftInset}px`}
  style:width={`${stripWidth}px`}
  bind:clientWidth={width}
  bind:clientHeight={height}
  aria-hidden="true"
>
  {#if countries.length}
    <svg {width} {height}>
      <text class="strip-title" x="5" y="19" text-anchor="start">Event Origins</text>
    </svg>
  {/if}
</div>

<CountryStripDetails
  summaries={continents}
  countries={countrySummaries}
  side="left"
  {scope}
  on:mapPreview
/>

<p class="visually-hidden">
  {countries.length} country rectangles from the curated country list are
  arranged in six continent groups down the left edge of the map. Within each
  continent, countries are ordered from most to fewest related event records
  for the active festival selection. Countries with one or more events are dark
  gray; countries without events are light gray. Unavailable counts follow known
  counts. Hover, focus, or tap a continent to see how many of its displayed
  countries have event records and how many have none. The central map previews
  event records associated with that continent while its summary is open. Moving
  away or dismissing the summary restores the current festival selection.
  Hover, focus, or tap a country to see its exact event-record count and preview
  its associated event records on the map.
</p>

<style>
  .country-strip {
    position: absolute;
    z-index: 3;
    top: 0;
    height: 100%;
    pointer-events: none;
  }

  svg {
    display: block;
    overflow: visible;
  }

  .strip-title {
    fill: #252525;
    font-size: 14px;
    font-weight: 700;
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
