<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    hasFestivalEvents,
    loadFestivalDatasets,
    type FestivalDataset,
  } from "./lib/utils/festivalData";
  import {
    createVenueActivityData,
    type VenueActivityData,
  } from "./lib/utils/venueActivity";
  import {
    loadCountryStripData,
    type CountryStripData,
  } from "./lib/utils/countryStripData";
  import { loadTicketData, type TicketData } from "./lib/utils/ticketData";
  import Map from "./lib/Map.svelte";
  import type { BaseMapLoadState } from "./lib/utils/baseMapLoad";
  import { nextLegendStage, type LegendStage } from "./lib/utils/legendGuide";
  import FestivalHistory from "./lib/FestivalHistory.svelte";
  import VenueExplorer from "./lib/VenueExplorer.svelte";
  import type { HexBinVenue } from "./lib/utils/hexBinPopup";
  import { festivals } from "./lib/utils/festivals.js";
  import {
    calculateFestivalHistoryHorizontalMargin,
    calculateFestivalHistoryVerticalLayout,
    festivalHistorySpacing,
  } from "./lib/utils/festivalHistory";

  type FestivalDataStatus = "loading" | "ready" | "empty" | "error";
  type TicketDataStatus = FestivalDataStatus;

  let showExplorer = false;
  let showVenueExplorer = false;
  let venueExplorerButton: HTMLButtonElement | undefined;
  let venueExplorerReturnTarget: HTMLElement | null = null;
  let selectedVenueContext: HexBinVenue | null = null;
  let venueActivityData: VenueActivityData | undefined;
  let venueDataStatus: FestivalDataStatus = "loading";
  let venueDataError = "";
  let legendStage: LegendStage = "hidden";
  // Base collection of formatted API festivals data
  let baseFestivalDatasets: FestivalDataset[] | undefined;
  let festivalDataStatus: FestivalDataStatus = "loading";
  let festivalDataError = "";
  let countryStripData: CountryStripData | undefined;
  let ticketData: TicketData[] | undefined;
  let ticketDataStatus: TicketDataStatus = "loading";
  let ticketDataError = "";
  let isInitialScreenVisible = true;
  let isFestivalDataLoaded = false;
  let isTicketDataLoaded = false;
  let areFontsLoaded = false;
  let isMapLoaded = false;
  let mapLoadError: string | null = null;
  let isInitialScreenReady = false;
  let loadingProgress = 0;
  let mainHeight = 0;
  let mainWidth = 0;
  let logoElement: HTMLAnchorElement | undefined;
  let logoHeight = 0;
  let historyHeight = 0;
  const basePath = import.meta.env.BASE_URL;

  onMount(() => {
    void fetchFestivalData();
    void fetchTicketData();
    void fetchCountryStripData();
    void waitForDocumentFonts();
  });

  // get festivals API datasets
  async function fetchFestivalData() {
    try {
      festivalDataStatus = "loading";
      festivalDataError = "";
      baseFestivalDatasets = await loadFestivalDatasets();
      festivalDataStatus = hasFestivalEvents(baseFestivalDatasets)
        ? "ready"
        : "empty";
    } catch (error) {
      festivalDataStatus = "error";
      festivalDataError =
        error instanceof Error ? error.message : "An unknown error occurred.";
    } finally {
      isFestivalDataLoaded = true;
    }
  }

  $: console.log("base api data: ", baseFestivalDatasets);

  async function waitForDocumentFonts() {
    if ("fonts" in document) {
      await document.fonts.ready;
    }

    areFontsLoaded = true;
  }

  async function fetchCountryStripData() {
    try {
      countryStripData = await loadCountryStripData();
    } catch (error) {
      console.error("Unable to load country-strip data.", error);
    }
  }

  async function fetchTicketData() {
    try {
      ticketDataStatus = "loading";
      ticketData = await loadTicketData();
      ticketDataStatus = ticketData.length ? "ready" : "empty";
    } catch (error) {
      ticketDataStatus = "error";
      ticketDataError =
        error instanceof Error ? error.message : "An unknown error occurred.";
    } finally {
      isTicketDataLoaded = true;
    }
  }

  $: loadingProgress =
    (isFestivalDataLoaded ? 25 : 0) +
    (isTicketDataLoaded ? 25 : 0) +
    (areFontsLoaded ? 25 : 0) +
    (isMapLoaded ? 25 : 0);
  $: isInitialScreenReady =
    isFestivalDataLoaded && isTicketDataLoaded && areFontsLoaded && isMapLoaded;
  $: historyVerticalLayout = calculateFestivalHistoryVerticalLayout(
    historyHeight,
    festivals.length,
    mainWidth,
  );
  $: historyTopInset = mainWidth > 0 && logoElement
    ? Math.min(mainHeight, logoElement.offsetTop + logoHeight + festivalHistorySpacing.logoGap)
    : 0;
  $: introScale = Math.min(historyVerticalLayout.elementScale, mainWidth / 1280);
  $: introHorizontalPadding = Math.min(32, Math.max(16, mainWidth * 0.04));
  $: introLeftOffset = Math.max(
    0,
    calculateFestivalHistoryHorizontalMargin(mainWidth) -
      introHorizontalPadding,
  );
  $: introWidth = Math.max(0, mainWidth - introLeftOffset);
  $: introBottomOffset = Math.max(
    0,
    historyHeight -
      (historyVerticalLayout.timelineGroupStart +
        historyVerticalLayout.timelineGroupHeight),
  );

  function dismissInitialScreen() {
    if (!isInitialScreenReady) return;
    isInitialScreenVisible = false;
  }

  function showDataExplorer() {
    showExplorer = true;
    legendStage = "central";
  }

  async function closeVenueExplorer() {
    showVenueExplorer = false;
    await tick();
    const returnTarget = venueExplorerReturnTarget?.isConnected
      ? venueExplorerReturnTarget
      : venueExplorerButton?.isConnected
        ? venueExplorerButton
        : document.getElementById("festival-map-year");
    returnTarget?.focus({ preventScroll: true });
  }

  function openVenueExplorer(trigger: HTMLElement, venue: HexBinVenue | null = null) {
    venueExplorerReturnTarget = trigger;
    selectedVenueContext = venue;
    showVenueExplorer = true;
    if (!venueActivityData) void fetchVenueActivity();
  }

  async function fetchVenueActivity() {
    venueDataStatus = "loading";
    venueDataError = "";
    try {
      baseFestivalDatasets ??= await loadFestivalDatasets();
      venueActivityData = createVenueActivityData(baseFestivalDatasets);
      venueDataStatus = venueActivityData.venues.length > 0 ? "ready" : "empty";
    } catch (error) {
      venueDataStatus = "error";
      venueDataError =
        error instanceof Error ? error.message : "An unknown error occurred.";
    }
  }

  function handleMapLoadStateChange(event: CustomEvent<BaseMapLoadState>) {
    mapLoadError = event.detail.error;
    isMapLoaded = event.detail.status === "loaded";
  }
</script>

<svelte:head>
  <title>Edinburgh Festivals</title>
  <meta
    name="description"
    content="Explore data about Edinburgh's festivals from 2012 onward."
  />
</svelte:head>

{#if isInitialScreenVisible}
  <div class="initial-screen" aria-busy={!isInitialScreenReady}>
    <div class="loading-indicator">
      <p aria-live="polite">
        {mapLoadError
          ? "Map could not be loaded"
          : isInitialScreenReady ? "Loading Complete" : "Loading..."}
      </p>
      <div
        class="loading-bar"
        role="progressbar"
        aria-label="Preparing Edinburgh Festivals"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={loadingProgress}
      >
        <span aria-hidden="true" style:width={`${loadingProgress}%`}></span>
      </div>
      {#if mapLoadError}
        <p class="map-load-error" role="status">{mapLoadError}</p>
      {/if}
      {#if isInitialScreenReady}
        <button
          class="enter-button"
          type="button"
          on:click={dismissInitialScreen}
        >
          Enter
        </button>
      {/if}
    </div>
  </div>
{/if}

{#if !showExplorer}
  <nav aria-label="Exploration views" inert={isInitialScreenVisible || showVenueExplorer}>
    <a
      class="logo"
      href={basePath}
      aria-label="Edinburgh Festivals home"
      bind:this={logoElement}
      bind:clientHeight={logoHeight}
    >
      <img
        src={`${basePath}/img/efi_dlm_logo_black.svg`}
        alt="Edinburgh Futures Institute logo"
      />
    </a>
    <!-- <button
      class="venues-button"
      type="button"
      aria-haspopup="dialog"
      bind:this={venueExplorerButton}
      on:click={() => openVenueExplorer(venueExplorerButton)}>Venues</button
    > -->
  </nav>
{/if}

<p class="data-status" aria-live="polite">
  {#if festivalDataStatus === "loading"}
    Loading festival datasets from 2012 through 2026.
  {:else if festivalDataStatus === "ready"}
    {baseFestivalDatasets?.length ?? 0} festival datasets from 2012 through 2026
    loaded and formatted.
  {:else if festivalDataStatus === "empty"}
    No festival event records are available in the 2012 through 2026 datasets.
  {:else}
    Festival data could not be loaded: {festivalDataError}
  {/if}
</p>

<main
  id="main-content"
  class:landing={!showExplorer}
  inert={isInitialScreenVisible || showVenueExplorer}
  bind:clientHeight={mainHeight}
  bind:clientWidth={mainWidth}
>
  <div
    class="map-shell"
    class:map-hidden={!showExplorer}
    aria-hidden={!showExplorer}
  >
    <Map
      {baseFestivalDatasets}
      {festivalDataStatus}
      {festivalDataError}
      {countryStripData}
      {ticketData}
      {ticketDataStatus}
      {ticketDataError}
      {legendStage}
      on:loadStateChange={handleMapLoadStateChange}
      on:openVenueExplorer={(event) => openVenueExplorer(event.detail.trigger, event.detail.venue)}
      on:retryFestivalData={fetchFestivalData}
      on:legendNext={() => (legendStage = nextLegendStage(legendStage))}
      on:legendDismiss={() => (legendStage = "hidden")}
    />
  </div>
  {#if !showExplorer}
    <div
      class="history-shell"
      role="region"
      aria-label="Festival history and introduction"
      style:top={`${historyTopInset}px`}
      bind:clientHeight={historyHeight}
    >
      <FestivalHistory />
      <section
        class="intro"
        aria-labelledby="page-title"
        style:--intro-scale={introScale}
        style:bottom={`${introBottomOffset}px`}
        style:left={`${introLeftOffset}px`}
        style:width={`${introWidth}px`}
      >
        <h1 id="page-title">Edinburgh Festivals</h1>
        <button class="explore-button" type="button" on:click={showDataExplorer}>
          Explore the data
        </button>
      </section>
    </div>
  {/if}
</main>

{#if showVenueExplorer}
  <VenueExplorer
    data={venueActivityData}
    status={venueDataStatus}
    error={venueDataError}
    backLabel={showExplorer ? "Back to map" : "Back to intro"}
    selectedVenue={selectedVenueContext}
    on:reset={() => (selectedVenueContext = null)}
    on:close={closeVenueExplorer}
    on:retry={fetchVenueActivity}
  />
{/if}

<style>
  #main-content {
    position: relative;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
  }

  .landing {
    display: flex;
    align-items: flex-end;
  }

  .map-shell {
    position: absolute;
    inset: 0;
  }

  .map-hidden {
    visibility: hidden;
    pointer-events: none;
  }

  .history-shell {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .initial-screen {
    position: fixed;
    z-index: 2000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    background: #f8f7f4;
  }

  .loading-indicator {
    position: relative;
    width: min(20rem, 100%);
    color: #252525;
  }

  .loading-indicator p {
    margin: 0 0 0.5rem;
    font-weight: 700;
    text-align: center;
    letter-spacing: -0.05em;
  }

  .loading-indicator .map-load-error {
    margin: 0.75rem 0 0;
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.5;
    text-align: left;
    letter-spacing: normal;
  }

  .loading-bar {
    height: 0.5rem;
    overflow: hidden;
    border: 1px solid #252525;
    border-radius: 999px;
  }

  .loading-bar span {
    display: block;
    height: 100%;
    background: #006b63;
  }

  .enter-button {
    position: absolute;
    top: 100%;
    left: 50%;
    margin-top: 1rem;
    padding: 0.75rem 1.125rem;
    border: 0;
    border-radius: 0.25rem;
    color: #fff;
    background: #006b63;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    transform: translateX(-50%);
  }

  .enter-button:hover {
    background: #004f49;
  }

  .logo {
    position: fixed;
    z-index: 1100;
    top: clamp(0.5rem, 2vw, 0.625rem);
    left: clamp(0.5rem, 2vw, 0.625rem);
    display: block;
    height: clamp(2.5rem, 8vw, 3.75rem);
  }

  .logo img {
    display: block;
    width: auto;
    height: 100%;
  }

  .venues-button {
    position: fixed;
    z-index: 1100;
    top: clamp(0.5rem, 2vw, 0.625rem);
    right: clamp(0.5rem, 2vw, 0.625rem);
    min-height: 2.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid #252525;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #252525;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .venues-button:hover {
    background: #efeee9;
  }

  .intro {
    position: absolute;
    z-index: 1;
    max-width: 48rem;
    width: 100%;
    padding: 0 clamp(1rem, 4vw, 2rem);
    bottom: 0;
    left: 0;
  }

  .data-status {
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

  h1 {
    max-width: 10ch;
    margin: 0;
    font-size: calc(5.5rem * var(--intro-scale));
    font-weight: 650;
    letter-spacing: -0.05em;
    line-height: 0.9;
  }

  .explore-button {
    text-transform: uppercase;
    margin-top: calc(2rem * var(--intro-scale));
    min-height: 2.75rem;
    padding: calc(0.75rem * var(--intro-scale)) calc(1.125rem * var(--intro-scale));
    border: 0;
    border-radius: 0.25rem;
    color: #fff;
    background: #006b63;
    font-weight: 700;
    font-size: max(0.75rem, calc(1rem * var(--intro-scale)));
    cursor: pointer;
  }

  .explore-button:hover {
    background: #004f49;
  }
</style>
