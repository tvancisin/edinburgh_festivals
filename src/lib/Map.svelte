<script lang="ts">
  import { onMount } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import FestivalTimeline from "./FestivalTimeline.svelte";
  import type {
    FestivalDataByFestival,
    FestivalDataGroup,
    FestivalDataWithCoordinates,
  } from "./utils/festivalData";
  import { filterFestivalDataWithCoordinates } from "./utils/festivalData";
  import { festivals } from "./utils/festivals.js";

  export let festivalData: FestivalDataByFestival | undefined;

  let mapElement: HTMLDivElement;
  let map: L.Map | undefined;
  let width = 0;
  let height = 0;
  let circleX = 0;
  let circleY = 0;
  let circleRadius = 0;
  let selectedFestivalData: FestivalDataGroup | undefined;
  let eventMarkerLayer: L.LayerGroup | undefined;
  let eventLocationCount = 0;

  $: circleX = width / 2;
  $: circleY = height / 2;
  $: circleRadius = Math.max(0, Math.min(width / 2 - 40, height / 2 - 50));
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

    eventMarkerLayer = L.layerGroup().addTo(map);

    if (selectedFestivalData) {
      renderEventMarkers(selectedFestivalData);
    }

    map.invalidateSize({ animate: false });

    return () => {
      eventMarkerLayer?.clearLayers();
      map?.remove();
    };
  });

  function handleFestivalSelect(event: CustomEvent<FestivalDataGroup>) {
    selectedFestivalData = event.detail;
    renderEventMarkers(selectedFestivalData);
  }

  function renderEventMarkers(festivalGroup: FestivalDataGroup) {
    const eventsWithCoordinates = filterFestivalDataWithCoordinates(
      festivalGroup.events,
    );

    eventLocationCount = eventsWithCoordinates.length;
    eventMarkerLayer?.clearLayers();

    const markerLayer = eventMarkerLayer;

    if (!markerLayer) {
      return;
    }

    eventsWithCoordinates.forEach((event) => {
      L.circleMarker([event.venue.latitude, event.venue.longitude], {
        radius: 4,
        fillColor: "#ffffff",
        fillOpacity: 0.55,
        color: "#020202",
        weight: 1,
      })
        .bindPopup(createEventPopupContent(event), {
          className: "event-popup-container",
          maxWidth: 240,
        })
        .addTo(markerLayer);
    });
  }

  function createEventPopupContent(event: FestivalDataWithCoordinates) {
    const title = event.title.trim() || "Untitled event";
    const details = [
      createPopupDetail("Venue", event.venue.name),
      createPopupDetail("Address", event.venue.address),
      createPopupDetail("Artist", event.artist),
      createPopupDetail("Genre", event.genre),
      createPopupDetail("Performances", event.performanceCount),
    ].join("");

    return `<section class="event-popup"><h3>${escapeHtml(title)}</h3><dl>${details}</dl></section>`;
  }

  function createPopupDetail(label: string, value: string | number | null) {
    const formattedValue =
      typeof value === "number"
        ? value.toLocaleString("en-GB")
        : value?.trim() ?? "";

    if (!formattedValue) {
      return "";
    }

    return `<dt>${label}</dt><dd>${escapeHtml(formattedValue)}</dd>`;
  }

  function escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      };

      return entities[character];
    });
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
  {#if selectedFestivalData}
    <p class="visually-hidden" aria-live="polite">
      {eventLocationCount} event locations shown for {selectedFestivalData.festival}.
    </p>
  {/if}
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
  <aside class="timeline-legend" aria-label="Festival timeline help">
    <p>Click a festival arc to explore the data.</p>
  </aside>
  <svg class="panel-overlay" role="group" aria-label="Festival timeline" {width} {height}>
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
    <FestivalTimeline
      {circleX}
      {circleY}
      {circleRadius}
      {festivalData}
      on:select={handleFestivalSelect}
    />
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

  .timeline-legend {
    position: absolute;
    z-index: 2;
    top: 1rem;
    right: 1rem;
    max-width: 14rem;
    padding: 0.75rem 1rem;
    border: 1px solid #252525;
    background: #f8f7f4;
    color: #252525;
    font-size: 0.875rem;
    font-weight: 700;
    pointer-events: none;
    border-radius: 0.25rem;
  }

  .timeline-legend p {
    margin: 0;
  }

  :global(.event-popup-container .leaflet-popup-content) {
    margin: 0.75rem 1rem;
  }

  :global(.event-popup) {
    color: #252525;
    font-size: 0.875rem;
  }

  :global(.event-popup h3) {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }

  :global(.event-popup dl) {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.5rem;
    margin: 0;
  }

  :global(.event-popup dt) {
    font-weight: 700;
  }

  :global(.event-popup dd) {
    margin: 0;
  }

  @media (max-width: 42rem) {
    .timeline-legend {
      top: calc(clamp(2.5rem, 8vw, 3.75rem) + 1rem);
      right: 0.5rem;
      max-width: min(13rem, calc(100% - 1rem));
      padding: 0.625rem 0.75rem;
      font-size: 0.75rem;
    }
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
