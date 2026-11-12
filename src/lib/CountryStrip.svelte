<script lang="ts">
  import {
    createWorldContinentStrip,
    createWorldCountryStrip,
    type WorldHexData,
  } from "./utils/worldHexMap";
  import {
    addCountryRepresentationToStrip,
    type CountryRepresentation,
  } from "./utils/festivalCountries";

  export let data: WorldHexData | undefined;
  export let representation: CountryRepresentation | undefined;

  let width = 0;
  let height = 0;

  $: countries = addCountryRepresentationToStrip(
    createWorldCountryStrip(data, Math.max(0, height - 4)),
    representation,
  ).map((country) => ({ ...country, x: country.x + 2 }));
  $: continents = createWorldContinentStrip(countries);
</script>

<div
  class="country-strip"
  bind:clientWidth={width}
  bind:clientHeight={height}
  aria-hidden="true"
>
  {#if countries.length}
    <svg {width} {height}>
      {#each countries as country (country.countryKey)}
        <rect
          x="15"
          y={country.x}
          width="10"
          height={country.width}
          fill-opacity={country.fillOpacity}
        />
      {/each}
      {#each continents as continent (continent.continent)}
        <rect
          class="continent"
          x="0"
          y={continent.x}
          width="15"
          height={continent.width}
        >
          <title>{continent.continent}</title>
        </rect>
        <text
          class="continent-label"
          text-anchor="start"
          dominant-baseline="middle"
          transform={`translate(7.5 ${continent.x + 2}) rotate(90)`}
        >{continent.continent === "North America"
          ? "N. America"
          : continent.continent === "South America"
            ? "S. America"
            : continent.continent}</text>
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
    left: 0;
    top: 0;
    width: 25px;
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
    stroke: #f8f7f4;
    stroke-width: 1px;
  }

  .continent-label {
    fill: #252525;
    font-size: 10px;
    font-weight: 700;
    pointer-events: none;
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
