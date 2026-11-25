<script lang="ts">
  import { createEventDispatcher, onMount, tick } from "svelte";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import * as maplibregl from "maplibre-gl";
  import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
  import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
  import "maplibre-gl/dist/maplibre-gl.css";
  
  import LegendGuide from "./LegendGuide.svelte";
  import type { LegendStage } from "./utils/legendGuide";
  import EventCountryStrip from "./EventCountryStrip.svelte";
  import EventCountryConnections from "./EventCountryConnections.svelte";
  import TicketCountryStrip from "./TicketCountryStrip.svelte";
  import TicketCountryConnections from "./TicketCountryConnections.svelte";
  import type { CountryStripData } from "./utils/countryStripData";
  import type { StripDetail } from "./utils/countrySummary";
  import { filterEventRecordsByContinent } from "./utils/eventContinentFilter";
  import { filterEventRecordsByCountry } from "./utils/eventCountryFilter";
  import FestivalTimeline from "./FestivalTimeline.svelte";
  import type {
    FestivalData,
    FestivalDataset,
  } from "./utils/festivalData";
  import {
    combineFestivalMapDatasets,
    describeFestivalMapScope,
    filterFestivalDataWithCoordinates,
    groupFestivalMapEvents,
    listFestivalMapYears,
    selectFestivalMapEvents,
    selectFestivalMapYear,
    type FestivalYearSelection,
  } from "./utils/festivalMapData";
  import { ticketDataFestival, type TicketData } from "./utils/ticketData";
  import {
    aggregateTicketCountryRepresentation,
    createTicketCountryCatalog,
  } from "./utils/ticketCountries";
  import {
    aggregateCountryRepresentation,
    createCountryCatalog,
  } from "./utils/festivalCountries";
  import {
    addHexagonalBinOpacities,
    createHexagonalFestivalBins,
  } from "./utils/hexBins";
  import { createHexBinPopupContent, groupHexBinEventsByVenue, type HexBinVenue } from "./utils/hexBinPopup";
  import type { HexagonalFestivalBin } from "./utils/hexBins";
  import {
    approxCameraAltitude,
    formatApproxCameraAltitude,
  } from "./utils/mapAltitude";
  import { festivals } from "./utils/festivals.js";
  import { formatFestivalCalendarDate } from "./utils/festivalTimeline";
  import { observeBaseMapLoad, type BaseMapLoadState } from "./utils/baseMapLoad";

  export let baseFestivalDatasets: FestivalDataset[] | undefined;
  export let festivalDataStatus: "loading" | "ready" | "empty" | "error" = "loading";
  export let festivalDataError = "";
  export let countryStripData: CountryStripData | undefined;
  export let ticketData: TicketData[] | undefined;
  export let ticketDataStatus: "loading" | "ready" | "empty" | "error" =
    "loading";
  export let ticketDataError = "";
  export let legendStage: LegendStage = "hidden";

  const dispatch = createEventDispatcher<{
    loadStateChange: BaseMapLoadState;
    openVenueExplorer: { trigger: HTMLButtonElement; venue: HexBinVenue };
    retryFestivalData: void;
    legendNext: void;
    legendDismiss: void;
  }>();

  const hexBinRadius = 16;
  const mapCircleTimelineOffset = 5;
  const popupVenueByButton = new WeakMap<HTMLButtonElement, HexBinVenue>();

  // Vite serves the MapLibre worker from an explicit bundled asset URL.
  maplibregl.setWorkerUrl(maplibreWorkerUrl);

  let mapElement: HTMLDivElement;
  let map: L.Map | undefined;
  let width = 0;
  let height = 0;
  let circleX = 0;
  let circleY = 0;
  let circleRadius = 0;
  let selectedYear: FestivalYearSelection = "all";
  let selectedFestivalName: string | null = null;
  let mapPreview: StripDetail | null = null;
  let eventMarkerLayer: L.LayerGroup | undefined;
  let eventMarkerRenderer: L.Canvas | undefined;
  let displayedEvents: FestivalData[] | undefined;
  let eventLocationCount = 0;
  let baseMapError: string | null = null;
  let cameraAltitude: number | null = null;
  let isLegendVisible = true;

  $: circleX = width / 2;
  $: circleY = height / 2;
  $: circleRadius = Math.max(0, Math.min(width / 2 - 27, height / 2 - 57));
  $: filterRadius = Math.max(0, circleRadius - 12);
  $: filterWidth = Math.min(128, filterRadius * 1.5);
  // Inset the top corners along the circle's chord, keeping the whole panel
  // inside the map even when status text makes it taller than the selector.
  $: filterVerticalExtent = Math.sqrt(Math.max(0, filterRadius ** 2 - (filterWidth / 2) ** 2));
  $: if (map && width > 0 && height > 0) {
    map.invalidateSize({ animate: false });
  }
  $: allEvents = baseFestivalDatasets
    ? combineFestivalMapDatasets(baseFestivalDatasets)
    : undefined;
  $: availableYears = allEvents ? listFestivalMapYears(allEvents) : [];
  $: yearEvents = allEvents ? selectFestivalMapYear(allEvents, selectedYear) : undefined;
  $: festivalGroups = yearEvents ? groupFestivalMapEvents(yearEvents) : undefined;
  $: activeEvents = selectFestivalMapEvents(yearEvents, festivalGroups, selectedFestivalName);
  $: countryCatalog = countryStripData
    ? createCountryCatalog(countryStripData)
    : undefined;
  $: countryRepresentation =
    activeEvents && countryCatalog
      ? aggregateCountryRepresentation(activeEvents, countryCatalog)
      : undefined;
  $: mapEvents = mapPreview === null
    ? activeEvents
    : mapPreview.kind === "continent"
      ? filterEventRecordsByContinent(countryRepresentation, mapPreview.summary.continent)
      : filterEventRecordsByCountry(countryRepresentation, mapPreview.summary.raw);
  $: ticketCountryCatalog = countryStripData
    ? createTicketCountryCatalog(countryStripData)
    : undefined;
  $: ticketCountryRepresentation =
    ticketData && ticketCountryCatalog
      ? aggregateTicketCountryRepresentation(ticketData, ticketCountryCatalog)
      : undefined;
  $: countryScope = describeFestivalMapScope(selectedFestivalName, selectedYear);
  $: showVisitorData = selectedFestivalName === null
    || selectedFestivalName === ticketDataFestival;
  $: if (eventMarkerLayer && mapEvents) renderEventHexBins(mapEvents);
  onMount(() => {
    map = L.map(mapElement, {
      center: [55.9533, -3.1883],
      zoom: 12,
      zoomControl: false,
    });

    const baseLayer = maplibreGL({
      style: "https://tiles.openfreemap.org/styles/positron",
    });
    baseLayer.addTo(map);
    const stopObservingBaseMap = observeBaseMapLoad(baseLayer.getMaplibreMap(), (state) => {
      baseMapError = state.error;
      dispatch("loadStateChange", state);
    });

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
      stopObservingBaseMap();
      map?.off("zoomend", updateEventHexBins);
      map?.off("move zoom", updateCameraAltitude);
      eventMarkerLayer?.clearLayers();
      map?.remove();
    };
  });

  function handleFestivalSelect(event: CustomEvent<string>) {
    selectedFestivalName = event.detail;
  }

  function resetFestivalSelection() {
    selectedFestivalName = null;
  }

  async function dismissLegendGuide() {
    dispatch("legendDismiss");
    await tick();
    mapElement.focus({ preventScroll: true });
  }

  function handleVenueContextClick(event: MouseEvent) {
    const button = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>(".venue-context")
      : null;
    const venue = button ? popupVenueByButton.get(button) : undefined;
    if (button && venue) {
      event.stopPropagation();
      dispatch("openVenueExplorer", { trigger: button, venue });
    }
  }

  function handleHexBinPopupOpen(event: L.PopupEvent, bin: HexagonalFestivalBin) {
    const popupElement = event.popup.getElement();
    const venues = groupHexBinEventsByVenue(bin);
    popupElement?.querySelectorAll<HTMLButtonElement>(".venue-context").forEach((button, index) => {
      popupVenueByButton.set(button, venues[index]);
    });
    popupElement?.addEventListener("click", handleVenueContextClick);
  }

  function handleHexBinPopupClose(event: L.PopupEvent) {
    event.popup.getElement()?.removeEventListener("click", handleVenueContextClick);
  }

  function renderEventHexBins(events: FestivalData[]) {
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
          color: "#ffffff00",
          fillColor: "#006b63",
          fillOpacity: bin.fillOpacity,
          weight: 0.5,
          renderer: markerRenderer,
        },
      )
        .bindPopup(createHexBinPopupContent(bin), {
          className: "event-popup-container",
          maxWidth: 240,
          maxHeight: Math.max(80, Math.min(240, circleRadius)),
        })
        .on("popupopen", (event: L.PopupEvent) => handleHexBinPopupOpen(event, bin))
        .on("popupclose", handleHexBinPopupClose)
        .addTo(markerLayer);
    });
  }
</script>

<section class="map" aria-labelledby="map-title">
  <h2 id="map-title" class="visually-hidden">Map of Edinburgh</h2>
  <p class="visually-hidden">
    An interactive map of Edinburgh using OpenStreetMap base data is visible
    through a circular window. Hexagons group festival venue locations, and
    their opacity indicates the number of source event records in each area.
    Click or tap a hexagon to list the venue names recorded in that area.
    Arcs around that window show fixed festival calendar dates, independent of
    the event-year filter. Use your
    keyboard, mouse, trackpad, or touch screen to navigate the map.
  </p>
  <div
    class="map-filters"
    style:top={`${circleY - filterVerticalExtent}px`}
    style:left={`${circleX}px`}
    style:width={`${filterWidth}px`}
    style:max-height={`${filterVerticalExtent * 2}px`}
    inert={legendStage !== "hidden"}
  >
    <select
      id="festival-map-year"
      aria-label="Event year"
      bind:value={selectedYear}
      disabled={festivalDataStatus === "loading" || festivalDataStatus === "error"}
      aria-describedby="festival-year-note"
    >
      <option value="all">2012-2026</option>
      {#each availableYears as year}
        <option value={year}>{year}</option>
      {/each}
    </select>
    {#if baseMapError}
      <p class="map-data-status" role="status">{baseMapError}</p>
    {/if}
    <p id="festival-year-note" class="visually-hidden">
      Filters event locations and event origins. The fixed festival calendar
      and 2025 visitor data remain independent of this filter.
      All years includes records with an unknown year.
    </p>
    <p class="map-data-status" role="status">
      {#if festivalDataStatus === "loading"}
        Loading festival events.
      {:else if festivalDataStatus === "error"}
        Festival events could not be loaded: {festivalDataError}
      {:else if activeEvents?.length === 0}
        No event records for {countryScope}.
      {:else if mapEvents && eventLocationCount === 0}
        No event locations for this selection.
      {/if}
    </p>
    {#if festivalDataStatus === "error"}
      <button type="button" on:click={() => dispatch("retryFestivalData")}>Retry event loading</button>
    {/if}
  </div>
  {#if allEvents}
    <p class="visually-hidden" aria-live="polite">
      {eventLocationCount} source event records grouped into hexagons
      for {countryScope}{mapPreview?.kind === "continent"
        ? `, associated with countries in ${mapPreview.summary.continent}`
        : mapPreview?.kind === "country"
          ? `, associated with ${mapPreview.summary.countryName}`
          : ""}.
      {#if mapPreview !== null && mapEvents === undefined}
        Event data is unavailable.
      {:else if mapPreview !== null && eventLocationCount === 0}
        No event locations available.
      {/if}
    </p>
  {/if}
  <ul class="visually-hidden" aria-label="Fixed festival calendar dates">
    {#each festivals as festival}
      <li>{festival.name}: {formatFestivalCalendarDate(festival.start)} to {formatFestivalCalendarDate(festival.end)}</li>
    {/each}
  </ul>
  <div
    class="map-canvas"
    class:guide-highlighted={legendStage === "central"}
    style:clip-path={legendStage === "central"
      ? `circle(${circleRadius}px at ${circleX}px ${circleY}px)`
      : undefined}
    inert={legendStage !== "hidden"}
    bind:this={mapElement}
    bind:clientWidth={width}
    bind:clientHeight={height}
  ></div>
  {#if selectedFestivalName !== null}
    <button
      class="selection-reset"
      type="button"
      inert={legendStage !== "hidden"}
      on:click={resetFestivalSelection}
      aria-label="Return to all festivals"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 14-5-5 5-5" />
        <path d="M4 9h10a6 6 0 0 1 6 6v1" />
      </svg>
    </button>
  {/if}
  <!-- <div
    class="camera-readout"
    title="Virtual camera altitude assuming a 36.87° vertical FOV and the current map viewport height. Leaflet has no real camera."
    aria-label={`Approximate virtual camera altitude: ${formatApproxCameraAltitude(cameraAltitude)}. Leaflet has no real camera.`}
  >
    {formatApproxCameraAltitude(cameraAltitude)}
  </div> -->
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
  </svg>
  <div
    class="timeline-overlay"
    class:guide-highlighted={legendStage === "timeline"}
    inert={legendStage !== "hidden"}
  >
    <FestivalTimeline
      circleRadius={Math.max(0, circleRadius - mapCircleTimelineOffset)}
      selectedFestivalDataName={selectedFestivalName}
      on:select={handleFestivalSelect}
    />
  </div>
  <div
    class="country-layer"
    class:guide-highlighted={legendStage === "events"}
    inert={legendStage !== "hidden"}
  >
    <EventCountryConnections
      data={countryStripData}
      representation={countryRepresentation}
      scope={countryScope}
      {circleRadius}
    />
    <EventCountryStrip
      data={countryStripData}
      representation={countryRepresentation}
      scope={countryScope}
      on:mapPreview={(event) => (mapPreview = event.detail)}
    />
  </div>
  <div
    class="country-layer"
    class:guide-highlighted={legendStage === "tickets"}
    inert={legendStage !== "hidden"}
  >
    {#if showVisitorData}
      <TicketCountryConnections
        data={countryStripData}
        representation={ticketCountryRepresentation}
        status={ticketDataStatus}
        error={ticketDataError}
        {circleRadius}
      />
    {/if}
    <TicketCountryStrip
      data={countryStripData}
      representation={ticketCountryRepresentation}
      status={ticketDataStatus}
      error={ticketDataError}
      showData={showVisitorData}
    />
  </div>
  {#if legendStage !== "hidden"}
    <div class="guide-dimmer" aria-hidden="true"></div>
  {/if}
  <LegendGuide
    stage={legendStage}
    {circleX}
    {circleY}
    {circleRadius}
    on:next={() => dispatch("legendNext")}
    on:dismiss={dismissLegendGuide}
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

  .map-filters {
    position: absolute;
    z-index: 3;
    transform: translateX(-50%);
    padding: 0.2rem;
    border-radius: 0.25rem;
    overflow-y: auto;
  }

  .map-filters select,
  .map-filters button {
    width: 100%;
    min-height: 2.75rem;
    padding: 0.375rem;
    border: 1px solid #777777;
    border-radius: 0.2rem;
    background: #ffffff;
    color: #252525;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .map-filters select:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px #006b63;
  }

  .map-data-status {
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .map-data-status:empty {
    display: none;
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

  .timeline-overlay,
  .country-layer {
    position: absolute;
    z-index: 1;
    inset: 0;
    pointer-events: none;
  }

  .country-layer {
    /* Let continent tooltips sit above either strip without covering the map
       with an interactive full-size layer. The guide can still lift a group. */
    z-index: auto;
  }

  .guide-dimmer {
    position: absolute;
    z-index: 4;
    inset: 0;
    background: #ffffff;
    opacity: 0.7;
    pointer-events: none;
  }

  .guide-highlighted {
    z-index: 5;
  }

  .selection-reset {
    position: absolute;
    z-index: 2;
    bottom: 1rem;
    left: 6rem;
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
    overflow-wrap: anywhere;
  }

  :global(.event-popup h3) {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }

  :global(.event-popup:focus-visible) {
    outline: 2px solid #006b63;
    outline-offset: -2px;
  }

  :global(.event-popup dl) {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.5rem;
    margin: 0;
  }

  :global(.event-popup ul) {
    margin: 0.5rem 0;
    padding: 0;
    list-style: none;
  }

  :global(.event-popup li) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.event-popup li + li) {
    margin-top: 0.375rem;
  }

  :global(.event-popup .venue-name) {
    flex: 1;
    min-width: 0;
  }

  :global(.event-popup .venue-context) {
    flex: none;
    min-height: 1.5rem;
    padding: 0.125rem 0.375rem;
    border: 0;
    border-radius: 0.125rem;
    background: #e2e2e2;
    color: #252525;
    font-size: 0.75rem;
    cursor: pointer;
  }

  :global(.event-popup .venue-context:hover) {
    background: #d2d2d2;
  }

  :global(.event-popup .venue-context:focus-visible) {
    outline: 2px solid #006b63;
    outline-offset: -2px;
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
