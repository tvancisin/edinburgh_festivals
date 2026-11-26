<script lang="ts">
  import type { CountryStripData } from "./utils/countryStripData";
  import type { CountryRepresentation } from "./utils/festivalCountries";
  import { createEventCountryStrip } from "./utils/eventCountryStrip";
  import { createEventCountryConnections } from "./utils/eventCountryConnections";
  import { createEventCountrySummaries } from "./utils/countrySummary";
  import { createCountryConnectionLabels } from "./utils/countryConnectionLabels";

  export let data: CountryStripData | undefined;
  export let representation: CountryRepresentation | undefined;
  export let scope = "All festivals";
  export let circleRadius: number;

  let width = 0;
  let height = 0;

  $: countries = createEventCountryStrip(data, representation, height);
  $: connections = createEventCountryConnections(countries, width, height, circleRadius);
  $: labels = createCountryConnectionLabels(
    createEventCountrySummaries(countries), connections, "left", width,
  );
</script>

<div
  class="event-country-connections"
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
      style:left={`${label.labelX}px`}
      style:top={`${label.labelY - 7.5}px`}
      style:max-width={`${label.availableWidth}px`}
      aria-hidden="true"
    >
      {label.countryName}<span>{label.countNumberLabel}</span>
    </div>
  {/each}

  <div class="visually-hidden" aria-live="polite" aria-atomic="true">
    {#if !data || !representation}
      <p>Country connections are unavailable while country or event data is loading or unavailable.</p>
    {:else if connections.length === 0}
      <p>{scope}: no highlighted country rectangles to connect.</p>
    {:else}
      <p>
        {scope}: {connections.length} highlighted country rectangles connect to
        horizontal lines that extend toward the central circle.
        Within each continent, countries and their connections run from most
        to fewest related event records for this selection.
        Country rectangles use opacity to indicate event-count bands. Connections
        are solid black.
        Line length is proportional to related event records; the longest line
        stops midway between the Events strip and the circle edge. Line width
        matches the country rectangle height.
        Labels to the right of each continent's longest line show its country
        and count. Ties use the first country in strip order.
      </p>
      <ul aria-label="Highest event-record counts by continent">
        {#each labels as label (label.continent)}
          <li>{label.continent}: {label.countryName}, {label.countLabel}</li>
        {/each}
      </ul>
      <p>
        Connected countries and exact counts:
      </p>
      <ul>
        {#each connections as connection (connection.countryKey)}
          <li>{connection.countryName}: {connection.eventCountLabel}</li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .event-country-connections {
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
