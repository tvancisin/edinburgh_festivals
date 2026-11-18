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

  export let data: CountryStripData | undefined;
  export let representation: CountryRepresentation | undefined;

  let width = 0;
  let height = 0;

  const continentStripWidth = 30;
  const countryStripWidth = 20;
  const stripLabelHeight = 28;
  const stripWidth = 60;

  $: countries = addCountryRepresentationToStrip(
    createCountryStrip(data, Math.max(0, height - stripLabelHeight - 4)),
    representation,
  ).map((country) => ({ ...country, x: country.x + stripLabelHeight + 2 }));
  $: continents = createContinentStrip(countries);
</script>

<div
  class="country-strip"
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
          x={continentStripWidth}
          y={country.x}
          width={countryStripWidth}
          height={country.width}
          fill-opacity={country.fillOpacity}
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
  {countries.length} country rectangles from the supplied world hex map are
  arranged in six continent groups down the left edge of the map.
</p>

<style>
  .country-strip {
    position: absolute;
    z-index: 3;
    left: 2px;
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
