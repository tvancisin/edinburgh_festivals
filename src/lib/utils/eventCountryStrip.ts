import { createCountryStrip, type CountryStripData } from "./countryStripData";
import {
  addCountryRepresentationToStrip,
  type CountryRepresentation,
  type RepresentedWorldCountryStripCell,
} from "./festivalCountries";

/** Shared geometry keeps the Events rectangles and their connections aligned. */
export const eventCountryStripLayout = {
  leftInset: 2,
  continentWidth: 30,
  countryWidth: 20,
  titleHeight: 28,
  titleWidth: 60,
  verticalPadding: 2,
};

/** Share count-sorted continent groups and highlighting; reserve title space. */
export function createEventCountryStrip(
  data: CountryStripData | undefined,
  representation: CountryRepresentation | undefined,
  height: number,
): RepresentedWorldCountryStripCell[] {
  const { titleHeight, verticalPadding } = eventCountryStripLayout;
  return addCountryRepresentationToStrip(
    createCountryStrip(data, Math.max(0, height - titleHeight - verticalPadding * 2)),
    representation,
  ).map((country) => ({
    ...country,
    x: country.x + titleHeight + verticalPadding,
  }));
}
