<script lang="ts">
  import {
    createContinentStrip,
    createCountryStrip,
    type CountryStripData,
  } from "./utils/countryStripData";
  import {
    addCountryRepresentationToStrip,
    type CountryRepresentation,
  } from "./utils/festivalCountries";

  // Ticket-country data will be supplied once its source is available.
  export let data: CountryStripData | undefined = undefined;
  export let representation: CountryRepresentation | undefined = undefined;

  let width = 0;
  let height = 0;

  const continentStripWidth = 30;
  const countryStripWidth = 20;
  const stripLabelHeight = 28;
  const stripContentOffset = 10;
  const stripWidth = continentStripWidth + countryStripWidth + stripContentOffset;

  $: countries = addCountryRepresentationToStrip(
    createCountryStrip(data, Math.max(0, height - stripLabelHeight - 4)),
    representation,
  ).map((country) => ({ ...country, x: country.x + stripLabelHeight + 2 }));
  $: continents = createContinentStrip(countries);
</script>

<div
  class="ticket-country-strip"
  style:width={`${stripWidth}px`}
  bind:clientWidth={width}
  bind:clientHeight={height}
  aria-hidden="true"
>
  {#if countries.length}
    <svg {width} {height}>
      <text class="strip-title" x={stripWidth / 2} y="19" text-anchor="middle">Visitors</text>
      {#each countries as country (country.countryKey)}
        <rect
          x={stripContentOffset}
          y={country.x}
          width={countryStripWidth}
          height={country.width}
          fill-opacity={country.fillOpacity}
        />
      {/each}
      {#each continents as continent (continent.continent)}
        <rect
          class="continent"
          x={stripContentOffset + countryStripWidth}
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
          transform={`translate(${stripContentOffset + countryStripWidth + continentStripWidth / 1.5} ${continent.x + 2}) rotate(90)`}
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
  {countries.length} ticket-country rectangles will be arranged in six
  continent groups down the right edge of the map when ticket-country data is available.
</p>

<style>
  .ticket-country-strip {
    position: absolute;
    z-index: 3;
    right: 2px;
    top: 0;
    height: 100%;
    pointer-events: none;
  }

  svg {
    display: block;
  }

  rect {
    fill: #252525;
  }

  rect.continent {
    fill: #b8b7b2;
    stroke: none;
  }

  .continent-label {
    fill: #252525;
    font-size: 11px;
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
