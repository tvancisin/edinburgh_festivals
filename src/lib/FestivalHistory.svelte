<script lang="ts">
  import * as d3 from "d3";
  import {
    calculateFestivalHistoryHorizontalMargin,
    calculateFestivalHistoryVerticalLayout,
    eventsDataCoverageIntervals,
    sortFestivalsByFoundation,
  } from "./utils/festivalHistory";

  const timelines = sortFestivalsByFoundation();
  const earliestFoundationYear =
    d3.min(timelines, (timeline) => timeline.foundation) ?? 0;
  const currentYear = new Date().getFullYear();
  const eventDataStartYear = 2012;
  const eventDataEndYear = 2026;
  const pandemicYear = 2020;
  const pandemicEndYear = 2021;
  const pandemicExceptionFestival = "Book";
  const dataBarHeight = 12;
  const timelineEndYear = Math.max(currentYear, eventDataEndYear) + 1;
  const randomPointPosition = d3.randomUniform(0.08, 0.92);
  const randomPointOffset = d3.randomUniform(-0.3, 0.3);
  const handwrittenTimelinePoints = timelines.map(() =>
    createHandWrittenTimelinePoints(),
  );

  let width = 0;
  let height = 0;
  let pandemicIndicatorSegments: { height: number; y: number }[] = [];

  $: verticalLayout = calculateFestivalHistoryVerticalLayout(
    height,
    timelines.length,
    width,
  );
  // Keep the SVG at its measured size; scale all of its drawing elements
  // together while the year scale still spans the available horizontal space.
  $: drawingScale = verticalLayout.elementScale || 1;
  $: drawingWidth = width / drawingScale;
  $: horizontalMargin = calculateFestivalHistoryHorizontalMargin(width) / drawingScale;
  $: timelineLeadingSpace = 36;
  $: timelineGroupHeight = verticalLayout.timelineGroupHeight / drawingScale;
  $: timelineGroupStart = verticalLayout.timelineGroupStart / drawingScale;
  $: pandemicIndicatorTop = Math.max(16, timelineGroupStart - 50);
  $: pandemicIndicatorBottom = timelineGroupStart + timelineGroupHeight + 19;
  $: timelineX = d3
    .scaleLinear()
    .domain([earliestFoundationYear, timelineEndYear])
    .range([
      horizontalMargin + timelineLeadingSpace,
      Math.max(
        horizontalMargin + timelineLeadingSpace,
        drawingWidth - horizontalMargin,
      ),
    ]);
  $: timelineY = d3
    .scaleLinear()
    .domain([0, Math.max(1, timelines.length - 1)])
    .range([timelineGroupStart, timelineGroupStart + timelineGroupHeight]);
  $: fullTimelineWidth =
    timelineX(timelineEndYear) - timelineX(earliestFoundationYear);
  $: timelineRows = timelines.map((timeline, index) => ({
    ...timeline,
    endX: timelineX(timelineEndYear),
    eventDataRectangles: eventsDataCoverageIntervals.map((interval) => ({
      width:
        timelineX(interval.endYearExclusive) - timelineX(interval.startYear),
      x: timelineX(interval.startYear),
    })),
    startX: timelineX(timeline.foundation),
    ticketingDataRectangles: timeline.ticketingDataIntervals.map(
      (interval) => ({
        width:
          timelineX(interval.endYearExclusive) - timelineX(interval.startYear),
        x: timelineX(interval.startYear),
      }),
    ),
    timelinePath: createHandWrittenTimelinePath(
      timelineX(timeline.foundation),
      timelineX(timelineEndYear),
      timelineY(index),
      handwrittenTimelinePoints[index] ?? [],
      fullTimelineWidth,
    ),
    y: timelineY(index),
  }));
  $: dataPeriodLabelY = timelineRows[0]
    ? timelineRows[0].y - (dataBarHeight + 1) + dataBarHeight / 2
    : 0;
  $: topTimelineY = timelineRows[0] ? timelineRows[0].y : 0;
  $: pandemicExceptionIndex = timelineRows.findIndex(
    (timeline) => timeline.name === pandemicExceptionFestival,
  );
  $: pandemicExceptionPreviousTimeline =
    pandemicExceptionIndex > 0
      ? timelineRows[pandemicExceptionIndex - 1]
      : undefined;
  $: pandemicExceptionNextTimeline =
    pandemicExceptionIndex >= 0 &&
    pandemicExceptionIndex < timelineRows.length - 1
      ? timelineRows[pandemicExceptionIndex + 1]
      : undefined;
  $: pandemicExceptionTop = pandemicExceptionPreviousTimeline
    ? Math.min(
        pandemicIndicatorBottom,
        pandemicExceptionPreviousTimeline.y + 20,
      )
    : pandemicIndicatorBottom;
  $: pandemicExceptionBottom = pandemicExceptionNextTimeline
    ? Math.max(
        pandemicIndicatorTop,
        pandemicExceptionNextTimeline.y - dataBarHeight - 16,
      )
    : pandemicIndicatorTop;
  $: pandemicIndicatorSegments = [
    {
      height: Math.max(0, pandemicExceptionTop - pandemicIndicatorTop),
      y: pandemicIndicatorTop,
    },
    {
      height: Math.max(0, pandemicIndicatorBottom - pandemicExceptionBottom),
      y: pandemicExceptionBottom,
    },
  ].filter((segment) => segment.height > 0);

  type HandWrittenTimelinePoint = {
    offset: number;
    position: number;
  };

  function createHandWrittenTimelinePoints(): HandWrittenTimelinePoint[] {
    return d3
      .range(6)
      .map(() => ({
        offset: randomPointOffset(),
        position: randomPointPosition(),
      }))
      .sort((first, second) => first.position - second.position);
  }

  function createHandWrittenTimelinePath(
    startX: number,
    endX: number,
    y: number,
    handwrittenPoints: HandWrittenTimelinePoint[],
    fullTimelineWidth: number,
  ): string {
    const width = endX - startX;
    const relativeWidth = fullTimelineWidth > 0 ? width / fullTimelineWidth : 1;
    const variationScale = Math.max(1, Math.min(1, relativeWidth));
    const pointCount = Math.max(
      2,
      Math.round(handwrittenPoints.length * variationScale),
    );
    const pointStep = Math.ceil(handwrittenPoints.length / pointCount);
    const selectedPoints = handwrittenPoints
      .filter((_, index) => index % pointStep === 0)
      .slice(0, pointCount);
    const points: [number, number][] = [
      [startX, y],
      ...selectedPoints.map(
        ({ offset, position }) =>
          [startX + width * position, y + offset * variationScale] as [
            number,
            number,
          ],
      ),
      [endX, y],
    ];

    return (
      d3.line<[number, number]>().curve(d3.curveCatmullRom.alpha(0.5))(
        points,
      ) ?? ""
    );
  }
</script>

<div
  class="festival-history"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  <svg
    {width}
    {height}
    aria-describedby="festival-history-description"
    aria-label="Edinburgh festival foundation timelines"
    role="img"
  >
    <defs>
      <marker
        id="foundation-year-arrow"
        markerWidth="5"
        markerHeight="5"
        refX="4"
        refY="2.5"
        orient="auto"
      >
        <path d="M 0 0 L 5 2.5 L 0 5 z" fill="#252525" />
      </marker>
    </defs>
    <desc id="festival-history-description">
      Eleven horizontal timelines, ordered from the 1947 Edinburgh International
      Festival to the 2004 Edinburgh Art Festival. Each line begins at the
      festival's foundation year and extends through {currentYear}. Bars above
      every timeline show that events data is available from 2012 to 2026. A
      background-colour band spanning 2020 identifies the COVID pandemic, with a
      gap for the Book Festival because its timeline and events data continue in
      2020. Dashed lines mark the pandemic start and end. Outlined bars below
      those show ticketing data availability: Fringe in 2019 and 2021 to 2026,
      International in 2022 to 2026, Tattoo in 2024 to 2026, and Book in 2024 to
      2025. Labels on the top festival row identify the foundation year, events
      data, and ticketing data encodings. Labels mark the events data period
      from 2012 to 2026.
    </desc>
    <g transform={`scale(${drawingScale})`}>
    {#each timelineRows as timeline, index}
      <g class="timeline-row">
        <path class="timeline-line" d={timeline.timelinePath} />
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
          text-anchor="start">{timeline.fullName}</text
        >
        <text
          class="foundation-year"
          x={timeline.startX - 8}
          y={timeline.y}
          dominant-baseline="middle"
          text-anchor="end">{timeline.foundation}</text
        >
        <g class="event-data-indicator">
          {#each timeline.eventDataRectangles as eventDataRectangle}
            <rect
              class="event-data-bar"
              x={eventDataRectangle.x}
              y={timeline.y - (dataBarHeight + 1)}
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
              y={timeline.y - (dataBarHeight * 2 + 1)}
              width={Math.max(0, ticketingDataRectangle.width)}
              height={dataBarHeight}
            />
          {/each}
        </g>
        {#if index === 0}
          <text
            class="data-legend-label"
            x={timeline.startX}
            y={timeline.y - 28}
            text-anchor="middle">Foundation years</text
          >
          <line
            class="foundation-legend-arrow"
            x1={timeline.startX}
            x2={timeline.startX}
            y1={timeline.y - 23}
            y2={timeline.y - 5}
            marker-end="url(#foundation-year-arrow)"
          />
          <text
            class="data-legend-label"
            x={timeline.eventDataRectangles[0].x}
            y={timeline.y - (dataBarHeight + 19)}
            text-anchor="start">Events Data</text
          >
          <line
            class="data-legend-arrow"
            x1={timeline.eventDataRectangles[0].x + 4}
            x2={timeline.eventDataRectangles[0].x + 4}
            y1={timeline.y - (dataBarHeight + 14)}
            y2={timeline.y - (dataBarHeight + 3)}
            marker-end="url(#foundation-year-arrow)"
          />
          <text
            class="data-legend-label"
            x={timeline.ticketingDataRectangles[0].x}
            y={timeline.y - (dataBarHeight * 2 + 19)}
            text-anchor="start">Tickets Data</text
          >
          <line
            class="data-legend-arrow"
            x1={timeline.ticketingDataRectangles[0].x + 4}
            x2={timeline.ticketingDataRectangles[0].x + 4}
            y1={timeline.y - (dataBarHeight * 2 + 14)}
            y2={timeline.y - (dataBarHeight * 2 + 3)}
            marker-end="url(#foundation-year-arrow)"
          />
        {/if}
      </g>
    {/each}
    <g class="data-period-ticks">
      <text
        class="data-period-tick-label"
        x={timelineX(eventDataStartYear) - 6}
        y={dataPeriodLabelY}
        dominant-baseline="middle"
        text-anchor="end">2012</text
      >
      <text
        class="data-period-tick-label"
        x={timelineX(eventDataEndYear + 1) + 6}
        y={topTimelineY}
        dominant-baseline="middle"
        text-anchor="start">2026</text
      >
    </g>
    <g class="pandemic-indicator">
      {#each pandemicIndicatorSegments as segment}
        <rect
          x={timelineX(pandemicYear)}
          y={segment.y}
          width={timelineX(pandemicEndYear) - timelineX(pandemicYear)}
          height={segment.height}
        />
        <line
          x1={timelineX(pandemicYear)}
          x2={timelineX(pandemicYear)}
          y1={segment.y}
          y2={segment.y + segment.height}
        />
        <line
          x1={timelineX(pandemicEndYear)}
          x2={timelineX(pandemicEndYear)}
          y1={segment.y}
          y2={segment.y + segment.height}
        />
      {/each}
      <text
        x={timelineX(pandemicYear) + 6}
        y={pandemicIndicatorBottom + 20}
        text-anchor="middle">COVID</text
      >
    </g>
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
    fill: none;
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
    font-size: 16px;
    font-weight: 700;
  }

  .foundation-year {
    font-size: 20px;
    font-weight: 700;
  }

  .data-legend-label {
    fill: #252525;
    font-family: inherit;
    font-size: 16px;
    letter-spacing: -0.02em;
  }

  .foundation-legend-arrow {
    stroke: #252525;
    stroke-width: 0.75;
  }

  .data-legend-arrow {
    stroke: #252525;
    stroke-width: 0.75;
  }

  .event-data-bar {
    fill: #006b63;
  }

  .data-period-tick-label {
    fill: #252525;
    font-family: inherit;
    font-size: 16px;
    letter-spacing: -0.02em;
    font-weight: 700;
  }

  .pandemic-indicator {
    fill: #252525;
    font-family: inherit;
    font-size: 12px;
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
