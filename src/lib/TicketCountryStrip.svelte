<script lang="ts">
  import {
    type CountryStripData,
  } from "./utils/countryStripData";
  import {
    createTicketCountryStrip,
    describeTicketCountryRepresentation,
    ticketCountryStripLayout,
    type TicketCountryRepresentation,
  } from "./utils/ticketCountries";
  import { createTicketContinentSummaries } from "./utils/continentSummary";
  import { createVisitorCountrySummaries } from "./utils/countrySummary";
  import CountryStripDetails from "./CountryStripDetails.svelte";

  export let data: CountryStripData | undefined = undefined;
  export let representation: TicketCountryRepresentation | undefined = undefined;
  export let status: "loading" | "ready" | "empty" | "error" = "loading";
  export let error = "";
  export let showData = true;

  let width = 0;
  let height = 0;


  const stripWidth = ticketCountryStripLayout.titleWidth;

  $: visibleRepresentation = showData ? representation : undefined;
  $: countries = createTicketCountryStrip(
    data,
    visibleRepresentation,
    height,
  );
  $: continents = createTicketContinentSummaries(countries, visibleRepresentation);
  $: countrySummaries = createVisitorCountrySummaries(countries, visibleRepresentation);
  $: scope = !showData ? "Visitor data is only available for Tattoo"
    : status === "loading" ? "Loading Tattoo visitor data"
    : status === "error" ? "Tattoo visitor data unavailable"
    : status === "empty" ? "No Tattoo visitor data available"
    : "Tattoo visitors (2025)";
  
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
      <text class="strip-title" x={width - 5} y="19" text-anchor="end"
        >Visitor Origins</text
      >
    </svg>
  {/if}
</div>

<CountryStripDetails
  summaries={continents}
  countries={countrySummaries}
  side="right"
  {scope}
  dataMessage={showData ? null : "No visitor data is available for this festival."}
/>

<p class="visually-hidden">
  {#if !showData}
    Visitor origins are available only for the Royal Edinburgh Military Tattoo.
    The strip remains visible with neutral country rectangles. No visitor counts
    or connecting lines are shown for the selected festival.
  {:else if status === "loading"}
    Loading visitor data.
  {:else if status === "error"}
    Visitor data could not be loaded: {error}
  {:else if status === "empty"}
    No visitor data is available.
  {:else}
    {#if representation}
      {describeTicketCountryRepresentation(representation)} The {countries.length}
      country rectangles are grouped by continent and ordered within each group by
      descending visitor count. Countries with one or more visitors are
      dark gray; countries without visitors are light gray. Hover, focus, or tap
      a continent to see how many of its displayed countries have visitors
      and how many have none. Hover, focus, or tap a country to see its visitor count.
      Each source row represents one unique visitor, as confirmed by the source
      definition. Ticket quantities are not counted.
    {:else}
      Visitor data is available but its country representation cannot be
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
