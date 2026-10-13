<script lang="ts">
  import * as d3 from "d3";
  import { festivals } from "../../utils.js";

  export let circleX = 0;
  export let circleY = 0;
  export let circleRadius = 0;

  const arcThickness = 12;
  const arcGap = 5;
  const circleGap = 5;
  const defaultLabelGap = 5;
  const topLabelGap = 5;
  const yearStart = new Date(2026, 0, 1);
  const yearEnd = new Date(2027, 0, 1);
  const monthAngle = d3
    .scaleTime()
    .domain([yearStart, yearEnd])
    .range([0, Math.PI * 2]);
  const formatMonth = d3.timeFormat("%B");

  type Festival = (typeof festivals)[number];
  type FestivalArc = Festival & {
    path: string | null;
    stack: number;
    labelX: number;
    labelY: number;
    labelRotation: number;
    labelAnchor: "start" | "end";
  };
  type MonthTick = {
    angle: number;
    label: string;
    labelX: number;
    labelY: number;
    labelRotation: number;
  };

  let festivalArcs: FestivalArc[] = [];
  let monthTicks: MonthTick[] = [];

  $: festivalArcs = createFestivalArcs(circleRadius);
  $: monthTicks = createMonthTicks(circleRadius);

  function createFestivalArc(
    festival: Festival,
    mapRadius: number,
    stack: number,
  ): FestivalArc {
    const innerRadius = mapRadius + circleGap + stack * (arcThickness + arcGap);
    const outerRadius = innerRadius + arcThickness;
    const labelRadius = innerRadius + arcThickness / 2;
    const labelAngle = ((festival.endRad * 180) / Math.PI + 360) % 360;
    const shouldFlipLabel = labelAngle > 90 && labelAngle < 270;
    const labelGap =
      labelAngle >= 270 || labelAngle <= 45 ? topLabelGap : defaultLabelGap;

    return {
      ...festival,
      stack,
      path: d3.arc()({
        innerRadius,
        outerRadius,
        startAngle: festival.startRad,
        endAngle: festival.endRad,
      }),
      labelX:
        labelRadius * Math.sin(festival.endRad) +
        labelGap * Math.cos(festival.endRad),
      labelY:
        -labelRadius * Math.cos(festival.endRad) +
        labelGap * Math.sin(festival.endRad),
      labelRotation: shouldFlipLabel ? labelAngle + 180 : labelAngle,
      labelAnchor: shouldFlipLabel ? "end" : "start",
    };
  }

  function createFestivalArcs(mapRadius: number): FestivalArc[] {
    const assignedTracks = new Map<Festival, number>();

    return festivals.map((festival) => {
      const occupiedTracks = new Set(
        [...assignedTracks]
          .filter(([previousFestival]) =>
            festivalsOverlap(previousFestival, festival),
          )
          .map(([, track]) => track),
      );
      let stack = 0;

      while (occupiedTracks.has(stack)) {
        stack += 1;
      }

      assignedTracks.set(festival, stack);
      return createFestivalArc(festival, mapRadius, stack);
    });
  }

  function festivalsOverlap(first: Festival, second: Festival) {
    return first.start < second.end && second.start < first.end;
  }

  function createMonthTicks(mapRadius: number): MonthTick[] {
    const labelRadius = Math.max(0, mapRadius - 14);

    return d3.timeMonth.range(yearStart, yearEnd).map((date) => {
      const angle = monthAngle(date);
      const angleDegrees = ((angle * 180) / Math.PI + 360) % 360;
      const shouldFlipLabel = angleDegrees > 90 && angleDegrees < 270;

      return {
        angle,
        label: formatMonth(date),
        labelX: labelRadius * Math.sin(angle),
        labelY: -labelRadius * Math.cos(angle),
        labelRotation: shouldFlipLabel ? angleDegrees + 180 : angleDegrees,
      };
    });
  }
</script>

<g transform={`translate(${circleX} ${circleY})`}>
  <!-- axis -->
  <circle class="timeline-axis" r={circleRadius} />
  {#each monthTicks as tick}
    <line
      class="month-tick"
      x1="0"
      x2="0"
      y1={-circleRadius}
      y2={-(circleRadius + 7)}
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
  <!-- arcs -->
  {#each festivalArcs as festival}
    <path
      class="festival-arc"
      d={festival.path ?? ""}
      data-festival={festival.name}
    />
    <text
      class="festival-label"
      x={festival.labelX}
      y={festival.labelY}
      text-anchor={festival.labelAnchor}
      dominant-baseline="center"
      transform={`rotate(${festival.labelRotation} ${festival.labelX} ${festival.labelY})`}
      >{festival.name}</text
    >
  {/each}
</g>

<style>
  .timeline-axis,
  .month-tick {
    stroke: #252525;
    stroke-width: 1;
  }

  .timeline-axis {
    fill: none;
  }

  .month-label {
    fill: #252525;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 0.625rem;
    font-weight: 700;
    paint-order: stroke;
    stroke: #fff;
    stroke-linejoin: round;
    stroke-width: 3px;
  }

  .festival-arc {
    fill: #006b63;
  }

  .festival-label {
    fill: #252525;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    paint-order: stroke;
    stroke: #f8f7f4;
    stroke-linejoin: round;
    stroke-width: 4px;
  }
</style>
