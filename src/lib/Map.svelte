<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import WorldHexPanels from "./WorldHexPanels.svelte";
  import type {
    WorldHexData,
    WorldHexDataStatus,
  } from "./utils/worldHexMap";
  import FestivalTimeline from "./FestivalTimeline.svelte";
  import type {
    FestivalDataByFestival,
    FestivalDataGroup,
  } from "./utils/festivalData";
  import { filterFestivalDataWithCoordinates } from "./utils/festivalData";
  import {
    aggregateCountryRepresentation,
    createCountryCatalog,
    selectFestivalEvents,
  } from "./utils/festivalCountries";
  import {
    addHexagonalBinOpacities,
    createHexagonalFestivalBins,
    type HexagonalFestivalBin,
  } from "./utils/hexBins";
  import {
    approxCameraAltitude,
    formatApproxCameraAltitude,
  } from "./utils/mapAltitude";
  import { festivals } from "./utils/festivals.js";

  export let festivalData: FestivalDataByFestival | undefined;
  export let festivalDataStatus: WorldHexDataStatus = "loading";
  export let festivalDataError = "";
  export let worldHexData: WorldHexData | undefined;
  export let worldHexDataStatus: WorldHexDataStatus = "loading";
  export let worldHexDataError = "";

  const dispatch = createEventDispatcher<{ ready: void }>();

  const hexBinRadius = 16;

  let mapElement: HTMLDivElement;
  let map: L.Map | undefined;
  let width = 0;
  let height = 0;
  let circleX = 0;
  let circleY = 0;
  let circleRadius = 0;
  let selectedFestivalData: FestivalDataGroup | undefined;
  let previewFestivalData: FestivalDataGroup | undefined;
  let eventMarkerLayer: L.LayerGroup | undefined;
  let eventMarkerRenderer: L.Canvas | undefined;
  let displayedEvents: FestivalDataGroup["events"] | undefined;
  let eventLocationCount = 0;
  let cameraAltitude: number | null = null;
  let isLegendVisible = true;

  $: circleX = width / 2;
  $: circleY = height / 2;
  $: circleRadius = Math.max(0, Math.min(width / 2 - 40, height / 2 - 50));
  $: if (map && width > 0 && height > 0) {
    map.invalidateSize({ animate: false });
  }
  $: activeEvents = selectFestivalEvents(festivalData, selectedFestivalData, previewFestivalData);
  $: countryCatalog = worldHexData ? createCountryCatalog(worldHexData) : undefined;
  $: countryRepresentation = activeEvents && countryCatalog
    ? aggregateCountryRepresentation(activeEvents, countryCatalog)
    : undefined;
  $: countryScope = selectedFestivalData?.festival ?? previewFestivalData?.festival ?? "All festivals";
  $: if (eventMarkerLayer && activeEvents) renderEventHexBins(activeEvents);
  onMount(() => {
    map = L.map(mapElement, {
      center: [55.9533, -3.1883],
      zoom: 12,
      zoomControl: false,
    });

    const baseLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });
    baseLayer.once("load", () => dispatch("ready"));
    baseLayer.addTo(map);

    eventMarkerRenderer = L.canvas({ padding: 0.5 }).addTo(map);
    eventMarkerLayer = L.layerGroup().addTo(map);

    const updateEventHexBins = () => {
      if (displayedEvents) {
        renderEventHexBins(displayedEvents);
      }
    };
    const updateCameraAltitude = () => {
      cameraAltitude = approxCameraAltitude(map!);
    };
    map.on("zoomend", updateEventHexBins);
    map.on("move zoom", updateCameraAltitude);

    map.invalidateSize({ animate: false });
    updateCameraAltitude();

    return () => {
      map?.off("zoomend", updateEventHexBins);
      map?.off("move zoom", updateCameraAltitude);
      eventMarkerLayer?.clearLayers();
      map?.remove();
    };
  });

  function handleFestivalSelect(event: CustomEvent<FestivalDataGroup>) {
    previewFestivalData = undefined;
    selectedFestivalData = event.detail;
  }

  function handleFestivalPreview(
    event: CustomEvent<FestivalDataGroup | undefined>,
  ) {
    if (!selectedFestivalData) {
      previewFestivalData = event.detail;
    }
  }

  function resetFestivalSelection() {
    selectedFestivalData = undefined;
    previewFestivalData = undefined;
  }

  function renderEventHexBins(events: FestivalDataGroup["events"]) {
    const eventsWithCoordinates = filterFestivalDataWithCoordinates(events);

    eventLocationCount = eventsWithCoordinates.length;
    eventMarkerLayer?.clearLayers();

    const markerLayer = eventMarkerLayer;
    const markerRenderer = eventMarkerRenderer;
    const currentMap = map;

    if (!markerLayer || !markerRenderer || !currentMap) {
      return;
    }

    displayedEvents = events;
    const zoom = currentMap.getZoom();
    const bins = addHexagonalBinOpacities(
      createHexagonalFestivalBins(
        eventsWithCoordinates.map((event) => {
          const point = currentMap.project(
            [event.venue.latitude, event.venue.longitude],
            zoom,
          );

          return { event, x: point.x, y: point.y };
        }),
        hexBinRadius,
      ),
    );

    bins.forEach((bin) => {
      L.polygon(
        bin.vertices.map((vertex) =>
          currentMap.unproject([vertex.x, vertex.y], zoom),
        ),
        {
          color: "#252525",
          fillColor: "#006b63",
          fillOpacity: bin.fillOpacity,
          weight: 0.5,
          renderer: markerRenderer,
        },
      )
        .bindPopup(createHexBinPopupContent(bin), {
          className: "event-popup-container",
          maxWidth: 240,
        })
        .addTo(markerLayer);
    });
  }

  function createHexBinPopupContent(bin: HexagonalFestivalBin) {
    const visibleEvents = bin.events.slice(0, 10);
    const hiddenEventCount = bin.events.length - visibleEvents.length;
    const eventItems = visibleEvents
      .map((event) => {
        const title = event.title.trim() || "Untitled event";
        const venue = event.venue.name.trim();
        const venueDetail = venue ? `<br>${escapeHtml(venue)}` : "";

        return `<li><strong>${escapeHtml(title)}</strong>${venueDetail}</li>`;
      })
      .join("");
    const remainingEvents = hiddenEventCount
      ? `<p>${hiddenEventCount.toLocaleString("en-GB")} additional event records are in this bin.</p>`
      : "";

    return `<section class="event-popup"><h3>${bin.events.length.toLocaleString("en-GB")} event records in this area</h3><p>Shows are grouped by their map location at this zoom level.</p><ul>${eventItems}</ul>${remainingEvents}</section>`;
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
    through a circular window. Hexagons group festival venue locations, and
    their opacity indicates the number of source event records in each area.
    Arcs around that window show each festival's 2025 date range. Use your
    keyboard, mouse, trackpad, or touch screen to navigate the map.
  </p>
  <p class="visually-hidden">
    Hex maps derived from country polygons flank the Edinburgh map.
    The Americas appear on the left with detached Pacific islands omitted;
    the remaining world appears on the right with detached western outliers
    and islands east of Australia omitted; Iceland and New Zealand are retained.
    Selected remote territories are also omitted.
    New Zealand's island spacing is adjusted schematically.
    Hawaii is represented by two schematic hexagons in the Americas panel.
    Scotland, England, Wales, and Northern Ireland each have one UK hexagon.
    Both panels use the same hexagon size.
    Coastlines and gaps reflect the supplied Natural Earth grid.
    Higher opacity shows more event records associated with each country or
    UK nation in the Country column. Country counts follow the festival selection.
  </p>
  {#if festivalData}
    <p class="visually-hidden" aria-live="polite">
      {eventLocationCount} source event records grouped into hexagons
      {selectedFestivalData
        ? `for ${selectedFestivalData.festival}`
        : previewFestivalData
          ? `for ${previewFestivalData.festival} while previewing`
        : "across all festivals"}.
    </p>
  {/if}
  <ul class="visually-hidden" aria-label="Festival date ranges from 2025">
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
  {#if selectedFestivalData}
    <button
      class="selection-reset"
      type="button"
      on:click={resetFestivalSelection}
      aria-label="Return to all festivals"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 14-5-5 5-5" />
        <path d="M4 9h10a6 6 0 0 1 6 6v1" />
      </svg>
    </button>
  {/if}
  <!-- {#if isLegendVisible}
    <aside class="timeline-legend" aria-label="Festival timeline help">
      <button
        class="legend-dismiss"
        type="button"
        aria-label="Hide map legend"
        on:click={() => (isLegendVisible = false)}
      >
        ×
      </button>
      <div class="legend-item">
        <svg class="legend-symbol" width="21" height="21" aria-hidden="true">
          <polygon
            points="10.5,1 19.5,6 19.5,15 10.5,20 1.5,15 1.5,6"
            fill="#006b63"
            fill-opacity="0.5"
            stroke="#000000"
            stroke-width="0.5"
          />
        </svg>
        <span>Venue Locations</span>
      </div>
      <div class="legend-item">
        <svg class="legend-symbol" width="21" height="21" aria-hidden="true">
          <path
            d="M 3 18 A 15 15 0 0 1 18 3"
            fill="none"
            stroke="#006b63"
            stroke-width="5.5"
          />
        </svg>
        <span>Festival Periods</span>
      </div>
    </aside>
  {/if} -->
  <div
    class="camera-readout"
    title="Virtual camera altitude assuming a 36.87° vertical FOV and the current map viewport height. Leaflet has no real camera."
    aria-label={`Approximate virtual camera altitude: ${formatApproxCameraAltitude(cameraAltitude)}. Leaflet has no real camera.`}
  >
    {formatApproxCameraAltitude(cameraAltitude)}
  </div>
  <svg
    class="panel-overlay"
    role="group"
    aria-label="Festival timeline"
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
    <FestivalTimeline
      {circleX}
      {circleY}
      {circleRadius}
      {festivalData}
      selectedFestivalDataName={selectedFestivalData?.festival ?? null}
      on:select={handleFestivalSelect}
      on:preview={handleFestivalPreview}
    />
  </svg>
  <WorldHexPanels
    {circleX}
    {circleRadius}
    data={worldHexData}
    status={worldHexDataStatus}
    error={worldHexDataError}
    representation={countryRepresentation}
    scope={countryScope}
    countryStatus={festivalDataStatus}
    countryError={festivalDataError}
  />
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

  .selection-reset {
    position: absolute;
    z-index: 2;
    bottom: 1rem;
    left: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #006b63;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #004d47;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
  }

  .selection-reset svg {
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }

  .selection-reset:hover {
    background: #efeee9;
  }

  .selection-reset:focus-visible {
    outline: 3px solid #006b63;
    outline-offset: 3px;
  }

  .timeline-legend {
    position: absolute;
    z-index: 2;
    top: 1rem;
    right: 1rem;
    max-width: 15rem;
    padding: 0.4rem 1.8rem 0.4rem 0.8rem;
    border: 1px solid #d9d9d9;
    border-radius: 0.2rem;
    background: #ffffff;
    box-shadow: 0 2px 10px rgba(37, 37, 37, 0.086);
    color: #252525;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1;

    letter-spacing: -0.05em;
    pointer-events: auto;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-item + .legend-item {
    margin-top: 0.4rem;
  }

  .legend-dismiss {
    position: absolute;
    top: 0.15rem;
    right: 0.25rem;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: 0;
    border-radius: 0.125rem;
    background: transparent;
    color: #252525;
    font-size: 1.125rem;
    line-height: 1;
    cursor: pointer;
  }

  .legend-dismiss:hover {
    background: #efeee9;
  }

  .camera-readout {
    position: absolute;
    z-index: 2;
    right: 1rem;
    bottom: 1rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #dbdbdb;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #252525;
    font-size: 0.7rem;
    font-weight: 700;
    pointer-events: none;
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

  :global(.event-popup ul) {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
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
      padding: 0.625rem 1.75rem 0.625rem 0.75rem;
      font-size: 0.75rem;
    }

    .camera-readout {
      right: 0.5rem;
      bottom: 0.5rem;
    }

    .selection-reset {
      bottom: 0.5rem;
      left: 0.5rem;
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
