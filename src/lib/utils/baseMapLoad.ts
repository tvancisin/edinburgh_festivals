import type { Map as MapLibreMap } from "maplibre-gl";

export type BaseMapLoadState =
  | { status: "loaded"; error: null }
  | { status: "error"; error: string };

export const baseMapErrorMessage =
  "The background map could not be fully loaded. Check your connection or content blocker, then reload to continue.";

/** Report background-map success and failure separately. An error must never
 * count as a successful load or release the app's initial loading screen.
 * Keep failures visible even if MapLibre later emits load with missing resources.
 * Reloading starts a fresh observation after the failed request is resolved.
 */
export function observeBaseMapLoad(
  map: Pick<MapLibreMap, "on" | "off">,
  onStateChange: (state: BaseMapLoadState) => void,
): () => void {
  let hasLoaded = false;
  let hasFailed = false;

  function handleLoad() {
    if (hasLoaded || hasFailed) return;
    hasLoaded = true;
    onStateChange({ status: "loaded", error: null });
  }

  function handleError() {
    if (hasFailed) return;
    hasFailed = true;
    onStateChange({ status: "error", error: baseMapErrorMessage });
  }

  map.on("load", handleLoad);
  map.on("error", handleError);

  return () => {
    map.off("load", handleLoad);
    map.off("error", handleError);
  };
}
