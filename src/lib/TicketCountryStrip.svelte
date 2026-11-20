<script lang="ts">
  import {
    createContinentStrip,
    type CountryStripData,
  } from "./utils/countryStripData";
  import {
    createTicketCountryStrip,
    describeTicketCountryRepresentation,
    ticketCountryStripLayout,
    type TicketCountryRepresentation,
  } from "./utils/ticketCountries";

  export let data: CountryStripData | undefined = undefined;
  export let representation: TicketCountryRepresentation | undefined = undefined;
  export let status: "loading" | "ready" | "empty" | "error" = "loading";
  export let error = "";

  let width = 0;
  let height = 0;


  const { continentWidth: continentStripWidth, countryWidth: countryStripWidth,
    contentOffset: stripContentOffset, titleWidth: stripWidth } = ticketCountryStripLayout;

  $: countries = createTicketCountryStrip(
    data,
    representation,
    height,
  );
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
      <text class="strip-title" x={stripWidth / 2} y="19" text-anchor="middle"
        >Tickets</text
      >
      {#each countries as country (country.countryKey)}
        <rect
          class:has-record={country.purchaseRecordCount > 0}
          class:without-record={country.purchaseRecordCount === 0}
          x={stripContentOffset}
          y={country.x}
          width={countryStripWidth}
          height={country.width}
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
            <tspan x="0"
              >{continent.continent === "North America"
                ? "North"
                : "South"}</tspan
            >
            <tspan x="0" dy="1em">America</tspan>
          {:else}
            {continent.continent}
          {/if}</text
        >
      {/each}
    </svg>
  {/if}
</div>

<p class="visually-hidden">
  {#if status === "loading"}
    Loading ticket purchase data.
  {:else if status === "error"}
    Ticket purchase data could not be loaded: {error}
  {:else if status === "empty"}
    No ticket purchase data is available.
  {:else}
    {#if representation}
      {describeTicketCountryRepresentation(representation)} The {countries.length}
      country rectangles are grouped by continent and ordered within each group by
      descending ticket-data entry count. Countries with one or more entries are
      dark gray; countries without entries are light gray.
    {:else}
      Ticket purchase data is available but its country representation cannot be
      created.
    {/if}
  {/if}
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
