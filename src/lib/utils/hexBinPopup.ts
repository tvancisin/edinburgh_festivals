import * as d3 from "d3";
import type { FestivalDataWithCoordinates, RawFestivalData } from "./festivalData";
import type { HexagonalFestivalBin } from "./hexBins";

export type HexBinVenue = {
  venueName: string | null;
  events: FestivalDataWithCoordinates[];
  raw: RawFestivalData[];
};

/** List each exact venue name once within a bin, in first-seen order.
 * Trim surrounding whitespace; blank names share an unnamed entry. Case,
 * punctuation, and other name differences remain distinct. This groups display
 * names, not confirmed physical sites. Retain every contributing event and raw
 * row, including repeats; bin membership and event-count opacity are unchanged.
 */
export function groupHexBinEventsByVenue(bin: HexagonalFestivalBin): HexBinVenue[] {
  return d3.groups(bin.events, (event) => event.venue.name.trim() || null)
    .map(([venueName, events]) => ({
      venueName,
      events,
      raw: events.map((event) => event.raw),
    }));
}

/** Render the complete venue-name list for Leaflet's standard popup API. */
export function createHexBinPopupContent(bin: HexagonalFestivalBin): string {
  const venues = groupHexBinEventsByVenue(bin);
  const content = venues.length
    ? `<ul role="list">${venues.map((venue) => {
      const name = escapeHtml(venue.venueName ?? "Unnamed venue");
      return `<li><span class="venue-name">${name}</span><button class="venue-context" type="button" aria-haspopup="dialog" aria-label="Context for ${name}">Context</button></li>`;
    }).join("")}</ul>`
    : "<p>No venue names are available.</p>";
  return `<section class="event-popup" tabindex="0" aria-label="Venues"><h3>Venues</h3>${content}</section>`;
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  };
  return value.replace(/[&<>'"]/g, (character) => entities[character]);
}
