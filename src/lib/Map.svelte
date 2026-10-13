<script lang="ts">
  import { onMount } from "svelte";
  import * as d3 from "d3";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import { festivals } from "../../utils.js";

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

  let mapElement: HTMLDivElement;
  let map: L.Map | undefined;
  let width = 0;
  let height = 0;
  let circleX = 0;
  let circleY = 0;
  let circleRadius = 0;
  let festivalArcs: FestivalArc[] = [];

  $: circleX = width / 2;
  $: circleY = height / 2;
  $: circleRadius = Math.max(
    0,
    Math.min(width / 2 - 40, height / 2 - 50),
  );
  $: festivalArcs = createFestivalArcs(circleRadius);

  $: if (map && width > 0 && height > 0) {
    map.invalidateSize({ animate: false });
  }

  onMount(() => {
    map = L.map(mapElement, {
      center: [55.9533, -3.1883],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.invalidateSize({ animate: false });

    return () => map?.remove();
  });

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

<section class="map" aria-labelledby="map-title">
  <h2 id="map-title" class="visually-hidden">Map of Edinburgh</h2>
  <p class="visually-hidden">
    An interactive map of Edinburgh using OpenStreetMap base data is visible
    through a circular window. A timeline around that window shows each
    festival's 2026 date range. Use your keyboard, mouse, trackpad, or touch
    screen to navigate the map.
  </p>
  <ul class="visually-hidden" aria-label="Festival date ranges in 2026">
    {#each festivals as festival}
      <li>{festival.name}: {festival.start} to {festival.end}</li>
    {/each}
  </ul>
  <div
    class="map-canvas"
    bind:this={mapElement}
    bind:clientWidth={width}
    bind:clientHeight={height}
  ></div>
  <svg
    class="panel-overlay"
    aria-hidden="true"
    {width}
    {height}
  >
    <defs>
      <mask
        id="map-window-mask"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        {width}
        {height}
      >
        <rect {width} {height} fill="white" />
        <circle cx={circleX} cy={circleY} r={circleRadius} fill="black" />
      </mask>
    </defs>
    <rect {width} {height} fill="#fff" mask="url(#map-window-mask)" />
    <g transform={`translate(${circleX} ${circleY})`}>
      {#each festivalArcs as festival}
        <path
          class="festival-arc"
          d={festival.path ?? ""}
          data-festival={festival.name}
        />
        <text
          class="festival-label"
          x={festival.labelX -5}
          y={festival.labelY}
          text-anchor={festival.labelAnchor}
          dominant-baseline="center"
          transform={`rotate(${festival.labelRotation} ${festival.labelX} ${festival.labelY})`}
        >{festival.name}</text>
      {/each}
    </g>
  </svg>
</section>

<style>
  .map,
  .map-canvas {
    width: 100%;
    height: 100%;
  }

  .map {
    position: relative;
  }

  .map-canvas {
    position: relative;
    z-index: 0;
  }

  .panel-overlay {
    position: absolute;
    z-index: 1;
    inset: 0;
    display: block;
    pointer-events: none;
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
    stroke: #fff;
    stroke-linejoin: round;
    stroke-width: 4px;
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
