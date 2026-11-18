<script lang="ts">
  import { createEventDispatcher } from "svelte";
  export let stage: "hidden" | "central" | "world" = "hidden";
  export let circleX = 0;
  export let circleY = 0;
  export let circleRadius = 0;

  const dispatch = createEventDispatcher<{ next: void; dismiss: void }>();
  const centralGuidePadding = 58;
  const edgePadding = 8;

  type GuideBox = { x: number; y: number; width: number; height: number };

  let width = 0;
  let height = 0;
  let centralBox: GuideBox = { x: 0, y: 0, width: 0, height: 0 };
  let americasBox: GuideBox = { x: 0, y: 0, width: 0, height: 0 };
  let restBox: GuideBox = { x: 0, y: 0, width: 0, height: 0 };

  $: centralBox = getCentralGuideBox(width, height, circleX, circleY, circleRadius);
  $: americasBox = { x: 2, y: 2, width: Math.max(0, circleX - circleRadius - 2), height: Math.max(0, height - 4) };
  $: restBox = {
    x: Math.min(width, circleX + circleRadius),
    y: 2,
    width: Math.max(0, width - circleX - circleRadius - 2),
    height: Math.max(0, height - 4),
  };

  function getCentralGuideBox(
    containerWidth: number,
    containerHeight: number,
    centerX: number,
    centerY: number,
    radius: number,
  ): GuideBox {
    const left = Math.max(edgePadding, centerX - radius - centralGuidePadding);
    const top = Math.max(edgePadding, centerY - radius - centralGuidePadding);
    const right = Math.min(containerWidth - edgePadding, centerX + radius + centralGuidePadding);
    const bottom = Math.min(containerHeight - edgePadding, centerY + radius + centralGuidePadding);
    return {
      x: left,
      y: top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

  function frameStyle(box: GuideBox): string {
    return `left:${box.x}px;top:${box.y}px;width:${box.width}px;height:${box.height}px;`;
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
  {#if stage === "central" && centralBox.width > 0 && centralBox.height > 0}
    <div class="guide-frame central-guide" style={frameStyle(centralBox)}>
      <button
        class="guide-next"
        type="button"
        aria-label="Show world map guides"
        on:click={() => dispatch("next")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  {:else if stage === "world"}
    <div class="guide-frame" style={frameStyle(americasBox)} aria-hidden="true"></div>
    <div class="guide-frame world-guide" style={frameStyle(restBox)}>
      <button
        class="guide-next"
        type="button"
        aria-label="Dismiss world map guides"
        on:click={() => dispatch("dismiss")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  .legend-guide {
    position: absolute;
    z-index: 4;
    inset: 0;
    pointer-events: none;
  }

  .legend-guide.active {
    pointer-events: auto;
  }

  .guide-frame {
    position: absolute;
    border: 1px solid rgb(37 37 37 / 0.7);
    background: rgb(248 247 244 / 0.4);
    pointer-events: none;
    border-radius: 0.25rem;
  }

  .world-guide {
    pointer-events: auto;
  }

  .guide-next {
    position: absolute;
    right: 0.75rem;
    bottom: 0.75rem;
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

  .guide-next svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2;
  }

  @media (max-width: 42rem) {
    .guide-next {
      right: 0.5rem;
      bottom: 0.5rem;
    }
  }
</style>
