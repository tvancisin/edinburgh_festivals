import type { Map } from "leaflet";

export const FOV_DEG = 36.87;

/**
 * Estimates the altitude of a virtual, straight-down perspective camera from
 * Leaflet's current viewport scale. Leaflet itself has no camera.
 */
export function approxCameraAltitude(map: Map): number | null {
  const size = map.getSize();

  if (size.y <= 0) {
    return null;
  }

  const y = size.y / 2;
  const metersPerPixel =
    map.distance(
      map.containerPointToLatLng([0, y]),
      map.containerPointToLatLng([100, y]),
    ) / 100;
  const fieldOfViewRadians = (FOV_DEG * Math.PI) / 180;
  const altitude =
    (size.y * metersPerPixel) / 2 / Math.tan(fieldOfViewRadians / 2);

  return Number.isFinite(altitude) ? altitude : null;
}

export function formatApproxCameraAltitude(altitude: number | null) {
  if (altitude === null) {
    return "Camera unavailable";
  }

  if (altitude < 1000) {
    return `${Math.round(altitude).toLocaleString("en-GB")} m ASL`;
  }

  return `${(altitude / 1000).toFixed(1)} km ASL`;
}
