<script lang="ts">
  import type { CountryStripData } from "./utils/countryStripData";
  import {
    createTicketCountryStrip,
    type TicketCountryRepresentation,
  } from "./utils/ticketCountries";
  import { createTicketCountryConnections } from "./utils/ticketCountryConnections";
  import { createVisitorCountrySummaries } from "./utils/countrySummary";
  import { createCountryConnectionLabels } from "./utils/countryConnectionLabels";

  export let data: CountryStripData | undefined;
  export let representation: TicketCountryRepresentation | undefined;
  export let status: "loading" | "ready" | "empty" | "error" = "loading";
  export let error = "";
  export let circleRadius: number;

  let width = 0;
  let height = 0;

  $: countries = createTicketCountryStrip(data, representation, height);
  $: connections = createTicketCountryConnections(
    countries,
    width,
    height,
    circleRadius,
  );
  $: labels = createCountryConnectionLabels(
    createVisitorCountrySummaries(countries, representation), connections, "right", width,
  );
</script>

<div
  class="ticket-country-connections"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <svg {width} {height} aria-hidden="true">
    {#each connections as connection (connection.countryKey)}
      <path
        d={connection.path}
        stroke-width={connection.strokeWidth}
      />
    {/each}
  </svg>

  {#each labels as label (label.continent)}
    <div
      class="country-label"
      style:right={`${width - label.labelX}px`}
      style:top={`${label.labelY - 7.5}px`}
      style:max-width={`${label.availableWidth}px`}
      aria-hidden="true"
    >
      {label.countryName}<span>{label.countNumberLabel}</span>
    </div>
  {/each}

  <div class="visually-hidden" aria-live="polite" aria-atomic="true">
    {#if status === "loading"}
      <p>Visitor-country connections are loading.</p>
    {:else if status === "error"}
      <p>Visitor-country connections are unavailable: {error}</p>
    {:else if status === "empty"}
      <p>Visitor-country connections are unavailable because no visitor data is available.</p>
    {:else if !data || !representation}
      <p>Visitor-country connections are unavailable while country data is loading or unavailable.</p>
    {:else if connections.length === 0}
      <p>No countries with visitors are connected.</p>
    {:else}
      <p>
        {connections.length} countries with visitors connect from the
        right-hand Visitors strip with horizontal lines toward the central circle.
        Connections are solid black. Line length is proportional to visitors from
        that country; the longest stops midway between the Visitors strip and the
        circle edge. Line width matches the country rectangle height.
        Labels to the left of each continent's longest line show its country
        and count. Ties use the first country in strip order.
      </p>
      <ul aria-label="Highest visitor counts by continent">
        {#each labels as label (label.continent)}
          <li>{label.continent}: {label.countryName}, {label.countLabel}</li>
        {/each}
      </ul>
      <p>Connected countries and exact counts:</p>
      <ul>
        {#each connections as connection (connection.countryKey)}
          <li>{connection.countryName}: {connection.purchaseRecordCountLabel}</li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .ticket-country-connections {
    position: absolute;
    z-index: 2;
    inset: 0;
    pointer-events: none;
  }

  svg {
    display: block;
  }

  path {
    fill: none;
    stroke: #000;
  }

  .country-label {
    position: absolute;
    color: #252525;
    font-size: 12px;
    line-height: 15px;
    text-align: right;
    overflow-wrap: anywhere;
    background: #f8f7f4;
  }

  .country-label span {
    display: block;
    white-space: nowrap;
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
