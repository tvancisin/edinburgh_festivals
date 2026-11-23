<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { calculateLegendGuideLayout, type LegendStage } from "./utils/legendGuide";

  export let stage: LegendStage = "hidden";
  export let circleX = 0;
  export let circleY = 0;
  export let circleRadius = 0;

  const dispatch = createEventDispatcher<{ next: void; dismiss: void }>();
  const steps = {
    central: {
      number: 1,
      title: "Edinburgh venues",
      description: "Explore festival venue locations in Edinburgh. Darker hexagons show more event records in that area.",
      nextLabel: "Show the festival timeline: step 2 of 4",
    },
    timeline: {
      number: 2,
      title: "Festival calendar",
      description: "A year of Edinburgh festivals in 2025. Each arc marks when a festival takes place.",
      nextLabel: "Show event origins: step 3 of 4",
    },
    events: {
      number: 3,
      title: "Event origins",
      description: "Countries associated with events, grouped by continent. Each dark segment marks one represented country; longer black lines show more event records.",
      nextLabel: "Show visitor origins: step 4 of 4",
    },
    tickets: {
      number: 4,
      title: "Visitor origins",
      description: "Visitor countries, grouped by continent. Each dark segment marks one represented country; longer black lines show more visitors.",
      nextLabel: "Finish the visualization guide",
    },
  };

  let width = 0;
  let height = 0;
  let cardHeight = 0;

  $: step = stage === "hidden" ? null : steps[stage];
  $: layout = calculateLegendGuideLayout(
    stage, width, height, circleX, circleY, circleRadius, cardHeight,
  );

  function focusNext(button: HTMLButtonElement) {
    button.focus({ preventScroll: true });
  }

</script>

<div
  class="legend-guide"
  class:active={stage !== "hidden"}
  role="group"
  aria-label="Data exploration guide"
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  {#if step}
    <div
      class="guide-card"
      style:left={`${layout.left}px`}
      style:top={`${layout.top}px`}
      style:width={`${layout.width}px`}
      style:max-height={`${Math.max(0, height - 24)}px`}
      bind:clientHeight={cardHeight}
    >
      <div class="guide-copy" aria-live="polite" aria-atomic="true">
        <p class="guide-step">{step.number} of 4</p>
        <h3>{step.title}</h3>
        <p id="legend-guide-description">{step.description}</p>
      </div>
      <div class="guide-controls">
        <button
          class="guide-next"
          type="button"
          use:focusNext
          aria-label={step.nextLabel}
          aria-describedby="legend-guide-description"
          on:click={() => stage === "tickets" ? dispatch("dismiss") : dispatch("next")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .legend-guide {
    position: absolute;
    z-index: 6;
    inset: 0;
    pointer-events: none;
  }

  .legend-guide.active {
    pointer-events: auto;
  }

  .guide-card {
    position: absolute;
    box-sizing: border-box;
    overflow-y: auto;
    padding: 1rem;
    border: 1px solid #d4d3cf;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #252525;
    pointer-events: auto;
  }

  .guide-copy p {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .guide-copy .guide-step {
    margin-bottom: 0.5rem;
    color: #595959;
    font-size: 0.75rem;
    font-weight: 600;
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    line-height: 1.25;
  }

  .guide-controls {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.75rem;
  }

  .guide-next {
    display: grid;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    place-items: center;
    border: 1px solid #252525;
    border-radius: 50%;
    background: #f8f7f4;
    color: #252525;
    cursor: pointer;
    pointer-events: auto;
  }

  .guide-next:hover {
    background: #efeee9;
  }

  .guide-next:focus-visible {
    outline: 3px solid #006b63;
    outline-offset: 3px;
  }

  .guide-next svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }

</style>
