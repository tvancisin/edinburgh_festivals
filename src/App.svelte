<script lang="ts">
  import { onMount } from "svelte";
  import { loadFestivalDataByFestival } from "./lib/utils/festivalData";
  import Map from "./lib/Map.svelte";

  // todo
  // same location circles spread

  type FestivalDataStatus = "loading" | "ready" | "empty" | "error";

  let showExplorer = false;
  let festivalData: Awaited<ReturnType<typeof loadFestivalDataByFestival>>;
  let festivalDataStatus: FestivalDataStatus = "loading";
  let festivalDataError = "";
  let isInitialScreenVisible = true;
  let isFestivalDataLoaded = false;
  let areFontsLoaded = false;
  let isInitialScreenReady = false;
  let loadingProgress = 0;
  const basePath = import.meta.env.BASE_URL;

  onMount(() => {
    void initialiseApp();
  });

  $: loadingProgress =
    (isFestivalDataLoaded ? 50 : 0) + (areFontsLoaded ? 50 : 0);

  async function initialiseApp() {
    await Promise.all([fetchFestivalData(), waitForDocumentFonts()]);
    isInitialScreenReady = true;
  }

  function dismissInitialScreen() {
    isInitialScreenVisible = false;
  }

  async function fetchFestivalData() {
    try {
      festivalDataStatus = "loading";
      festivalData = await loadFestivalDataByFestival();
      festivalDataStatus =
        Object.keys(festivalData).length > 0 ? "ready" : "empty";
    } catch (error) {
      festivalDataStatus = "error";
      festivalDataError =
        error instanceof Error ? error.message : "An unknown error occurred.";
    } finally {
      isFestivalDataLoaded = true;
    }
  }

  async function waitForDocumentFonts() {
    if ("fonts" in document) {
      await document.fonts.ready;
    }

    areFontsLoaded = true;
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
        {isInitialScreenReady ? "Loading Complete" : "Loading Data..."}
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
      {#if isInitialScreenReady}
        <button class="enter-button" type="button" on:click={dismissInitialScreen}>
          Enter
        </button>
      {/if}
    </div>
  </div>
{/if}

<a
  class="logo"
  class:compact={showExplorer}
  href={basePath}
  aria-label="Edinburgh Festivals home"
>
  <img
    src={`${basePath}/img/efi_dlm_logo_black.svg`}
    alt="Edinburgh Futures Institute logo"
  />
</a>

<p class="data-status" aria-live="polite">
  {#if festivalDataStatus === "loading"}
    Loading 2025 festival data.
  {:else if festivalDataStatus === "ready"}
    {Object.keys(festivalData ?? {}).length.toLocaleString()} 2025 festival groups
    loaded.
  {:else if festivalDataStatus === "empty"}
    No 2025 festival data is available.
  {:else}
    Festival data could not be loaded: {festivalDataError}
  {/if}
</p>

{#if !showExplorer}
  <main id="main-content" class="landing">
    <section class="intro" aria-labelledby="page-title">
      <!-- <p class="eyebrow">Festival data explorer</p> -->
      <h1 id="page-title">Edinburgh Festivals</h1>
      <button
        class="explore-button"
        type="button"
        on:click={() => (showExplorer = true)}
      >
        Explore the data
      </button>
    </section>
  </main>
{:else}
  <main id="main-content">
    <Map {festivalData} />
  </main>
{/if}

<style>
  #main-content {
    width: 100%;
    height: 100dvh;
    overflow: hidden;
  }

  .landing {
    display: flex;
    align-items: center;
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

  .logo.compact {
    height: clamp(1.75rem, 6vw, 2.75rem);
  }

  .intro {
    max-width: 48rem;
    width: 100%;
    padding: clamp(4rem, 12vw, 9rem) clamp(1rem, 4vw, 2rem);
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
    font-size: clamp(2.5rem, 8vw, 5.5rem);
    font-weight: 650;
    letter-spacing: -0.05em;
    line-height: 0.9;
  }

  .explore-button {
    text-transform: uppercase;
    margin-top: 2rem;
    padding: 0.75rem 1.125rem;
    border: 0;
    border-radius: 0.25rem;
    color: #fff;
    background: #006b63;
    font-weight: 700;
    cursor: pointer;
  }

  .explore-button:hover {
    background: #004f49;
  }
</style>
