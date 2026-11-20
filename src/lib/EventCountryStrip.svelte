<script lang="ts">
  import {
    createContinentStrip,
    type CountryStripData,
  } from "./utils/countryStripData";
  import {
    type CountryRepresentation,
  } from "./utils/festivalCountries";
  import { createEventCountryStrip, eventCountryStripLayout } from "./utils/eventCountryStrip";

  export let data: CountryStripData | undefined;
  export let representation: CountryRepresentation | undefined;

  let width = 0;
  let height = 0;

  const continentStripWidth = eventCountryStripLayout.continentWidth;
  const countryStripWidth = eventCountryStripLayout.countryWidth;
  const stripWidth = eventCountryStripLayout.titleWidth;

  $: countries = createEventCountryStrip(data, representation, height);
  $: continents = createContinentStrip(countries);
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
      <text class="strip-title" x={stripWidth / 2} y="19" text-anchor="middle">Events</text>
      {#each countries as country (country.countryKey)}
        <rect
          class:has-record={country.hasEventData}
          class:without-record={!country.hasEventData}
          x={continentStripWidth}
          y={country.x}
          width={countryStripWidth}
          height={country.width}
        />
      {/each}
      {#each continents as continent (continent.continent)}
        <rect
          class="continent"
          x="0"
          y={continent.x}
          width={continentStripWidth}
          height={continent.width}
        >
          <title>{continent.continent}</title>
        </rect>
        <text
          class="continent-label"
          text-anchor="start"
          dominant-baseline="middle"
          transform={`translate(${continentStripWidth / 1.5} ${continent.x + 2}) rotate(90)`}
        >{#if continent.continent === "North America" || continent.continent === "South America"}
          <tspan x="0">{continent.continent === "North America" ? "North" : "South"}</tspan>
          <tspan x="0" dy="1em">America</tspan>
        {:else}
          {continent.continent}
        {/if}</text>
      {/each}
    </svg>
  {/if}
</div>

<p class="visually-hidden">
  {countries.length} country rectangles from the curated country list are
  arranged in six continent groups down the left edge of the map. Within each
  continent, countries are ordered from most to fewest related event records
  for the active festival selection. Countries with one or more events are dark
  gray; countries without events are light gray. Unavailable counts follow known
  counts.
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
  }

  rect {
    fill: #d6d6d6;
  }

  rect.has-record {
    fill: #9b9b9b;
  }

  rect.continent {
    fill: #b8b7b2;
    stroke: none;
  }

  .continent-label {
    fill: #252525;
    font-size: 10px;
    font-weight: 700;
    pointer-events: none;
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
