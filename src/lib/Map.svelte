<script lang="ts">
  import { onMount } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import FestivalTimeline from "./FestivalTimeline.svelte";
  import { festivals } from "../../utils.js";

  let mapElement: HTMLDivElement;
  let map: L.Map | undefined;
  let width = 0;
  let height = 0;
  let circleX = 0;
  let circleY = 0;
  let circleRadius = 0;

  $: circleX = width / 2;
  $: circleY = height / 2;
  $: circleRadius = Math.max(
    0,
    Math.min(width / 2 - 40, height / 2 - 50),
  );

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
    <rect {width} {height} fill="#F8F7F4" mask="url(#map-window-mask)" />
    <FestivalTimeline {circleX} {circleY} {circleRadius} />
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
