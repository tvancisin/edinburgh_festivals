<script lang="ts">
  import { afterUpdate, onDestroy, onMount } from "svelte";
  import { venueActivityYearRangeLabel, type VenueActivityData } from "./utils/venueActivity";
  import { createVenueActivityLayout } from "./utils/venueActivityLayout";

  export let data: VenueActivityData;
  export let filterDescription = "";
  let width = 0;
  let height = 0;
  let plotSvg: SVGSVGElement | undefined;
  let measurementFrame = 0;
  let labelMeasurement: { width: number; height: number; data: VenueActivityData; value: number } | null = null;

  $: measuredLabelHeight = labelMeasurement?.width === width
    && labelMeasurement.height === height && labelMeasurement.data === data
      ? labelMeasurement.value : null;
  $: layout = createVenueActivityLayout(data, width, height, measuredLabelHeight);

  function scheduleLabelMeasurement() {
    if (!plotSvg?.isConnected) return;
    if (measurementFrame) cancelAnimationFrame(measurementFrame);
    measurementFrame = requestAnimationFrame(() => {
      if (!plotSvg?.isConnected) return;
      let maximum = 0;
      for (const label of plotSvg.querySelectorAll<SVGTextElement>(".venue-name")) {
        maximum = Math.max(maximum, label.getComputedTextLength());
      }
      if (measuredLabelHeight === null || Math.abs(maximum - measuredLabelHeight) > 0.25) {
        labelMeasurement = { width, height, data, value: maximum };
      }
    });
  }

  afterUpdate(scheduleLabelMeasurement);
  onMount(() => { void document.fonts.ready.then(scheduleLabelMeasurement); });
  onDestroy(() => { if (measurementFrame) cancelAnimationFrame(measurementFrame); });
</script>

<div
  class="venue-activity-chart"
  style:grid-template-columns={`${layout.axisWidth}px minmax(0, 1fr)`}
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <svg class="year-axis" width={layout.axisWidth} height={layout.svgHeight} aria-hidden="true">
    {#each layout.years as year (year.year)}
      <text class="year-label" x={layout.axisWidth - 10} y={year.y} text-anchor="end" font-size={layout.yearLabelFontSize} dominant-baseline="middle">{year.year}</text>
    {/each}
  </svg>
  <div class="venue-columns">
    <svg
      bind:this={plotSvg}
      width={layout.svgWidth} height={layout.svgHeight}
      role="img" aria-labelledby="venue-activity-title venue-activity-description"
    >
      <title id="venue-activity-title">Venue records, {venueActivityYearRangeLabel}</title>
      <desc id="venue-activity-description">
        {filterDescription}
        Every venue group fits across the chart, with its name written vertically above it.
        Original venue-code groups can combine using reviewed sites or matching addresses;
        they are never split. Conflicting locations prevent further merging, so a column
        can still contain different locations sharing one code. Original names, codes, and grouping evidence
        are retained in the screen-reader table.
        The years run from {data.years[0]} at the top to {data.years[data.years.length - 1]} at the bottom.
        Venues recorded in more years appear on the left; ties are alphabetical.
        A tiny circle marks at least one event record for that venue and year.
        Thin lines connect consecutive recorded years within the same venue group.
        A missing year breaks a line, except that 2019 connects to 2021 when
        2020 has no record, following the filter's continuity rule. A blank
        means no event record. The same information is available in the screen-reader table.
      </desc>
      {#each layout.columns as column (column.venue.venueKey)}
        <g role="img" aria-label={column.venue.accessibleLabel}>
          <title>{column.venue.accessibleLabel}</title>
          <text
            class="venue-name"
            x={column.x} y={layout.nameBaselineY}
            font-size={column.labelFontSize}
            dominant-baseline="middle"
            transform={`rotate(-90 ${column.x} ${layout.nameBaselineY})`}
          >{column.venue.venueName}</text>
          {#each column.connections as connection (connection.from.year)}
            <line
              class="venue-connection"
              x1={column.x} x2={column.x}
              y1={connection.y1} y2={connection.y2}
              stroke-width={layout.connectionStrokeWidth}
              aria-hidden="true"
            />
          {/each}
          {#each column.venue.presence as presence, index (presence.year)}
            {#if presence.isRecorded}
              <circle cx={column.x} cy={layout.years[index].y} r={layout.circleRadius} />
            {/if}
          {/each}
        </g>
      {/each}
    </svg>
  </div>
</div>

<style>
  .venue-activity-chart {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    flex: 1 1 0;
    height: 0;
    min-height: 0;
    width: 100%;
  }

  svg {
    display: block;
  }

  .venue-columns {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  text {
    fill: #252525;
  }

  .venue-name,
  .year-label {
    font-weight: 600;
  }

  circle {
    fill: #252525;
  }

  .venue-connection {
    stroke: #252525;
    stroke-linecap: round;
  }
</style>
