<script lang="ts">
  import * as d3 from "d3";
  import {
    calculateFestivalHistoryHorizontalMargin,
    calculateFestivalHistoryVerticalLayout,
    eventsDataCoverageIntervals,
    sortFestivalsByFoundation,
  } from "./utils/festivalHistory";

  const timelines = sortFestivalsByFoundation();
  const earliestFoundationYear = d3.min(timelines, (timeline) => timeline.foundation) ?? 0;
  const currentYear = new Date().getFullYear();
  const eventDataEndYear = 2026;
  const pandemicYear = 2020;
  const pandemicEndYear = 2021;
  const dataBarHeight = 12;
  const timelineEndYear = Math.max(currentYear, eventDataEndYear) + 1;

  let width = 0;
  let height = 0;

  $: horizontalMargin = calculateFestivalHistoryHorizontalMargin(width);
  $: timelineLeadingSpace = 36;
  $: verticalLayout = calculateFestivalHistoryVerticalLayout(
    height,
    timelines.length,
  );
  $: timelineGroupHeight = verticalLayout.timelineGroupHeight;
  $: timelineGroupStart = verticalLayout.timelineGroupStart;
  $: pandemicIndicatorTop = Math.max(16, timelineGroupStart - 50);
  $: timelineX = d3
    .scaleLinear()
    .domain([earliestFoundationYear, timelineEndYear])
    .range([
      horizontalMargin + timelineLeadingSpace,
      Math.max(horizontalMargin + timelineLeadingSpace, width - horizontalMargin),
    ]);
  $: timelineY = d3
    .scaleLinear()
    .domain([0, Math.max(1, timelines.length - 1)])
    .range([timelineGroupStart, timelineGroupStart + timelineGroupHeight]);
  $: timelineRows = timelines.map((timeline, index) => ({
    ...timeline,
    endX: timelineX(timelineEndYear),
    eventDataRectangles: eventsDataCoverageIntervals.map((interval) => ({
      width: timelineX(interval.endYearExclusive) - timelineX(interval.startYear),
      x: timelineX(interval.startYear),
    })),
    startX: timelineX(timeline.foundation),
    ticketingDataRectangles: timeline.ticketingDataIntervals.map(
      (interval) => ({
        width: timelineX(interval.endYearExclusive) - timelineX(interval.startYear),
        x: timelineX(interval.startYear),
      }),
    ),
    y: timelineY(index),
  }));
</script>

<div
  class="festival-history"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <svg
    {width}
    {height}
    aria-labelledby="festival-history-title festival-history-description"
    role="img"
  >
    <title id="festival-history-title">Edinburgh festival foundation timelines</title>
    <desc id="festival-history-description">
      Eleven horizontal timelines, ordered from the 1947 Edinburgh International
      Festival to the 2004 Edinburgh Art Festival. Each line begins at the
      festival's foundation year and extends through {currentYear}. Bars above
      every timeline show that events data is available from 2012 to 2026. A
      background-colour band spanning 2020 identifies the COVID pandemic, with
      dashed lines marking its start and end.
      Outlined bars below those show ticketing data availability: Fringe in
      2019 and 2021 to 2026, International in 2022 to 2026, Tattoo in 2024 to
      2026, and Book in 2024 to 2025.
    </desc>
    {#each timelineRows as timeline}
      <g class="timeline-row">
        <line
          class="timeline-line"
          x1={timeline.startX}
          x2={timeline.endX}
          y1={timeline.y}
          y2={timeline.y}
        />
        <circle
          class="foundation-marker"
          cx={timeline.startX}
          cy={timeline.y}
          r="4"
        />
        <text
          class="festival-name"
          x={timeline.startX + 5}
          y={timeline.y + 15}
          text-anchor="start"
        >{timeline.fullName}</text>
        <text
          class="foundation-year"
          x={timeline.startX - 8}
          y={timeline.y}
          dominant-baseline="middle"
          text-anchor="end"
        >{timeline.foundation}</text>
        <g class="event-data-indicator">
          {#each timeline.eventDataRectangles as eventDataRectangle}
            <rect
              class="event-data-bar"
              x={eventDataRectangle.x}
              y={timeline.y - (dataBarHeight + 2)}
              width={Math.max(0, eventDataRectangle.width)}
              height={dataBarHeight}
            />
          {/each}
        </g>
        <g class="ticketing-data-indicator">
          {#each timeline.ticketingDataRectangles as ticketingDataRectangle}
            <rect
              class="ticketing-data-bar"
              x={ticketingDataRectangle.x}
              y={timeline.y + 2}
              width={Math.max(0, ticketingDataRectangle.width)}
              height={dataBarHeight}
            />
          {/each}
        </g>
      </g>
    {/each}
    <g class="pandemic-indicator">
      <rect
        x={timelineX(pandemicYear)}
        y={pandemicIndicatorTop}
        width={timelineX(pandemicEndYear) - timelineX(pandemicYear)}
        height={timelineGroupStart + timelineGroupHeight + 19 - pandemicIndicatorTop}
      />
      <line
        x1={timelineX(pandemicYear)}
        x2={timelineX(pandemicYear)}
        y1={pandemicIndicatorTop}
        y2={timelineGroupStart + timelineGroupHeight + 19}
      />
      <line
        x1={timelineX(pandemicEndYear)}
        x2={timelineX(pandemicEndYear)}
        y1={pandemicIndicatorTop}
        y2={timelineGroupStart + timelineGroupHeight + 19}
      />
      <text
        x={timelineX(pandemicYear) - 6}
        y={pandemicIndicatorTop}
        text-anchor="end">COVID pandemic</text
      >
    </g>
  </svg>
</div>

<style>
  .festival-history {
    width: 100%;
    height: 100%;
  }

  svg {
    display: block;
    overflow: visible;
  }

  .timeline-line {
    stroke: #252525;
    stroke-width: 2;
  }

  .foundation-marker {
    fill: #006b63;
  }

  .festival-name,
  .foundation-year {
    fill: #252525;
    font-family: inherit;
    letter-spacing: -0.03em;
  }

  .festival-name {
    font-size: clamp(0.75rem, 1.8vw, 1rem);
    font-weight: 700;
  }

  .foundation-year {
    font-size: clamp(0.6875rem, 1.6vw, 0.875rem);
  }

  .event-data-bar {
    fill: #006b63;
  }

  .pandemic-indicator {
    fill: #252525;
    font-family: inherit;
    font-size: clamp(0.625rem, 1.4vw, 0.75rem);
    letter-spacing: -0.02em;
    pointer-events: none;
  }

  .pandemic-indicator rect {
    fill: #f8f7f4;
  }

  .pandemic-indicator line {
    stroke: #252525;
    stroke-dasharray: 4 4;
  }

  .ticketing-data-bar {
    fill: #000000;
    stroke-width: 1;
  }

</style>
