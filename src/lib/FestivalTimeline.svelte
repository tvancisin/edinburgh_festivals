<script lang="ts">
  import * as d3 from "d3";
  import { festivals } from "../../utils.js";

  export let circleX = 0;
  export let circleY = 0;
  export let circleRadius = 0;

  const arcThickness = 12;
  const arcGap = 5;
  const circleGap = 5;
  const defaultLabelGap = 3;
  const topLabelGap = 10;

  type Festival = (typeof festivals)[number];
  type FestivalArc = Festival & {
    path: string | null;
    stack: number;
    labelX: number;
    labelY: number;
    labelRotation: number;
    labelAnchor: "start" | "end";
  };

  let festivalArcs: FestivalArc[] = [];

  $: festivalArcs = createFestivalArcs(circleRadius);

  function createFestivalArc(
    festival: Festival,
    mapRadius: number,
    stack: number,
  ): FestivalArc {
    const innerRadius =
      mapRadius + circleGap + stack * (arcThickness + arcGap);
    const outerRadius = innerRadius + arcThickness;
    const labelRadius = innerRadius + arcThickness / 2;
    const labelAngle =
      ((festival.endRad * 180) / Math.PI + 360) % 360;
    const shouldFlipLabel = labelAngle > 90 && labelAngle < 270;
    const labelGap =
      labelAngle >= 270 || labelAngle <= 45
        ? topLabelGap
        : defaultLabelGap;

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
</script>

<g transform={`translate(${circleX} ${circleY})`}>
  {#each festivalArcs as festival}
    <path
      class="festival-arc"
      d={festival.path ?? ""}
      data-festival={festival.name}
    />
    <text
      class="festival-label"
      x={festival.labelX - 5}
      y={festival.labelY}
      text-anchor={festival.labelAnchor}
      dominant-baseline="center"
      transform={`rotate(${festival.labelRotation} ${festival.labelX} ${festival.labelY})`}
    >{festival.name}</text>
  {/each}
</g>

<style>
  .festival-arc {
    fill: #006b63;
  }

  .festival-label {
    fill: #252525;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    paint-order: stroke;
    stroke: #F8F7F4;
    stroke-linejoin: round;
    stroke-width: 4px;
  }
</style>
