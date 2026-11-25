<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    createFestivalArcs,
    createMonthTicks,
    createTodayIndicator,
    mapToTimelineGap,
    type FestivalArc,
  } from "./utils/festivalTimeline";

  export let circleRadius = 0;
  export let selectedFestivalDataName: string | null = null;

  const dispatch = createEventDispatcher<{ select: string }>();
  const today = new Date();
  let width = 0;
  let height = 0;

  $: mapRadius = Math.min(circleRadius, width / 2, height / 2);
  $: festivalArcs = createFestivalArcs(mapRadius);
  $: monthTicks = createMonthTicks(mapRadius);
  $: todayIndicator = createTodayIndicator(mapRadius, today);

  function handleFestivalArcClick(festival: FestivalArc) {
    dispatch("select", festival.dataFestival);
  }

  function handleFestivalArcKeydown(event: KeyboardEvent, festival: FestivalArc) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleFestivalArcClick(festival);
    }
  }
</script>

<svg
  class="festival-timeline"
  role="group"
  aria-label="Fixed festival calendar and festival filters"
  {width}
  {height}
  bind:clientWidth={width}
  bind:clientHeight={height}
>
<g transform={`translate(${width / 2} ${height / 2})`}>
  <circle class="timeline-axis" r={mapRadius + mapToTimelineGap} />
  {#each monthTicks as tick}
    <line
      class="month-tick"
      x1="0"
      x2="0"
      y1={-(mapRadius + mapToTimelineGap)}
      y2={-(mapRadius + mapToTimelineGap - 7)}
      transform={`rotate(${(tick.angle * 180) / Math.PI})`}
    />
    <text
      class="month-label"
      x={tick.labelX}
      y={tick.labelY}
      text-anchor="middle"
      dominant-baseline="middle"
      transform={`rotate(${tick.labelRotation} ${tick.labelX} ${tick.labelY})`}
      >{tick.label}</text
    >
  {/each}
  <g
    class="today-indicator"
    role="img"
    aria-label={`Today: ${todayIndicator.label}`}
  >
    <line
      x1="0"
      x2="0"
      y1={-(mapRadius + mapToTimelineGap)}
      y2={-(mapRadius + mapToTimelineGap + 40)}
      transform={`rotate(${(todayIndicator.angle * 180) / Math.PI})`}
    />
    <text
      x={todayIndicator.labelX}
      y={todayIndicator.labelY}
      dominant-baseline="middle"
      transform={`rotate(${todayIndicator.labelRotation} ${todayIndicator.labelX} ${todayIndicator.labelY})`}
      >Today</text
    >
  </g>
  {#each festivalArcs as festival}
    <path
      class="festival-arc"
      d={festival.path ?? ""}
      data-festival={festival.name}
      role="button"
      tabindex="0"
      aria-label={`Filter map to ${festival.name} festival data`}
      aria-pressed={selectedFestivalDataName === festival.dataFestival}
      class:selected={selectedFestivalDataName === festival.dataFestival}
      on:click={() => handleFestivalArcClick(festival)}
      on:keydown={(event) => handleFestivalArcKeydown(event, festival)}
    />
    <text
      class="festival-label"
      x={festival.labelX}
      y={festival.labelY}
      text-anchor={festival.labelAnchor}
      dominant-baseline="middle"
      transform={`rotate(${festival.labelRotation} ${festival.labelX} ${festival.labelY})`}
      >{festival.name}</text
    >
  {/each}
</g>
</svg>

<style>
  .festival-timeline {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .timeline-axis,
  .month-tick {
    stroke: #c0c0c0;
    stroke-width: 1;
  }

  .timeline-axis {
    fill: none;
  }

  .month-label {
    fill: #797979;
    letter-spacing: -0.05em;
    font-size: 12px;
    font-weight: 700;
  }

  .today-indicator {
    fill: #666666;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.05em;
  }

  .today-indicator line {
    stroke: #777777;
    stroke-width: 2px;
  }

  .festival-arc {
    fill: #006b63;
    cursor: pointer;
    outline: none;
    pointer-events: visiblePainted;
  }

  .festival-arc:hover,
  .festival-arc:focus-visible,
  .festival-arc.selected {
    fill: #252525;
  }

  .festival-label {
    fill: #666666;
    letter-spacing: -0.05em;
    font-size: 12px;
    font-weight: 700;
    paint-order: stroke;
    stroke: #f8f7f4;
    stroke-linejoin: round;
    stroke-width: 4px;
  }
</style>
