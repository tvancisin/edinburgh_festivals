<script>
  import Map from "./lib/Map.svelte";

  let showExplorer = false;
  const basePath = import.meta.env.BASE_URL;
</script>

<svelte:head>
  <title>Edinburgh Festivals</title>
  <meta
    name="description"
    content="Explore data about Edinburgh's festivals from 2012 onward."
  />
</svelte:head>

<a class="logo" href={basePath} aria-label="Edinburgh Festivals home">
  <img
    src={`${basePath}/img/efi_dlm_logo_black.svg`}
    alt="Edinburgh Futures Institute logo"
  />
</a>

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
    <Map />
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

  .logo {
    position: fixed;
    z-index: 1100;
    top: 10px;
    left: 10px;
    display: block;
    height: 60px;
  }

  .logo img {
    display: block;
    width: auto;
    height: 60px;
  }

  .intro {
    max-width: 48rem;
    width: 100%;
    padding: clamp(4rem, 12vw, 9rem) clamp(1rem, 4vw, 2rem);
  }

  .eyebrow {
    margin: 0 0 1rem;
    color: #006b63;
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 10ch;
    margin: 0;
    font-family: Inter;
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
