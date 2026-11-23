import * as d3 from "d3";
import type { FestivalData, RawFestivalData } from "./festivalData";

export type VenueSiteMatchMethod = "reviewed-site" | "address-match" | "virtual" | "venue-code";

export type VenueSiteAlias = {
  name: string;
  code: string;
  festival: string;
  address: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  events: FestivalData[];
  raw: RawFestivalData[];
};

export type VenueSite = {
  siteId: string;
  siteName: string;
  matchMethod: VenueSiteMatchMethod;
  matchExplanation: string;
  aliases: VenueSiteAlias[];
  events: FestivalData[];
  raw: RawFestivalData[];
};

export type ReviewedVenueSite = {
  siteId: string;
  siteName: string;
  postcode: string;
  addresses: string[];
  evidence: string;
};

/** Reviewed against the venue fields in the local 2021–2026 CSVs on
 * November 23, 2026. These are analytical site mappings, not source IDs.
 * Exact normalized addresses AND postcodes are required. No name-only rules.
 * Virtual records are excluded before these rules are applied.
 */
export const reviewedVenueSites: ReviewedVenueSite[] = [
  {
    siteId: "site:scottish-storytelling-centre", siteName: "Scottish Storytelling Centre",
    postcode: "EH1 1SR",
    addresses: ["43-45 High Street", "Scottish Storytelling Centre, 43-45 High Street"],
    evidence: "The Centre, Netherbow Theatre, Storytelling Court, training venue, library, and addressed meeting point share 43-45 High Street and EH1 1SR; source coordinates differ by about 27 meters.",
  },
  {
    siteId: "site:edinburgh-futures-institute", siteName: "Edinburgh Futures Institute",
    postcode: "EH3 9EF",
    addresses: ["1 Lauriston Place", "Edinburgh Futures Institute, 1 Lauriston Place",
      "Edinburgh Futures Institute, The University of Edinburgh, 1 Lauriston Place",
      "Edinburgh Futures Institute, Lauriston Place"],
    evidence: "EFI and the Book Festival's named rooms share the EFI building address and EH3 9EF. Reviewed despite an approximately 160-meter coordinate discrepancy in the 2024–2025 EFI records. Nightingale Way is excluded.",
  },
  {
    siteId: "site:royal-scots-club", siteName: "Royal Scots Club",
    postcode: "EH3 6QE", addresses: ["29-31 Abercromby Place"],
    evidence: "The Club, Speakeasy, and Forces at the Fringe records share 29-31 Abercromby Place and EH3 6QE. Reviewed despite the 2024 Speakeasy coordinate outlier. The online venue is excluded.",
  },
  {
    siteId: "site:assembly-roxy", siteName: "Assembly Roxy",
    postcode: "EH8 9SU", addresses: ["2 Roxburgh Place"],
    evidence: "Assembly Roxy records across festivals share 2 Roxburgh Place and EH8 9SU, despite different codes. Digital venues reusing code 4 are excluded.",
  },
  {
    siteId: "site:studio-potterrow", siteName: "The Studio, 22 Potterrow",
    postcode: "EH8 9BL", addresses: ["22 Potterrow", "22 Potterrow, (not Nicolson Street)"],
    evidence: "The Studio, Studio Theatre, and Festival Theatre/Capital Theatres Studio aliases share 22 Potterrow and matching coordinates.",
  },
  {
    siteId: "site:dovecot-studios", siteName: "Dovecot Studios",
    postcode: "EH1 1LT", addresses: ["10 Infirmary Street"],
    evidence: "Dovecot Studios and ZOO Dovecot records share 10 Infirmary Street and EH1 1LT across code and address abbreviation changes.",
  },
  {
    siteId: "site:traverse-theatre", siteName: "Traverse Theatre",
    postcode: "EH1 2ED", addresses: ["10 Cambridge Street"],
    evidence: "Addressed Traverse Theatre, Traverse 1, Traverse 2, bar, and outside meeting-point records share 10 Cambridge Street. Unaddressed and online records are excluded.",
  },
  {
    siteId: "site:dance-base", siteName: "Dance Base",
    postcode: "EH1 2JU", addresses: ["14-16 Grassmarket"],
    evidence: "Dance Base and Assembly at Dance Base share 14-16 Grassmarket and EH1 2JU. Offsite meeting points and ZOOTV are excluded.",
  },
  {
    siteId: "site:whistlebinkies", siteName: "Whistlebinkies",
    postcode: "EH1 1LL", addresses: ["4-6 South Bridge"],
    evidence: "Whistlebinkies and PBH's Free Fringe at Whistlebinkies share 4-6 South Bridge and EH1 1LL. Codes 158a and 158 change across years. Reviewed despite an approximately 93-meter coordinate discrepancy in the 2023–2024 Whistlebinkies records.",
  },
  {
    siteId: "site:summerhall", siteName: "Summerhall",
    postcode: "EH9 1PL", addresses: ["1 Summerhall", "1 Summerhall Place", "Summerhall Place", "1 Summerhall Newington"],
    evidence: "Summerhall, EIFF at Summerhall, and ROUNDABOUT records use variants of the Summerhall site address and EH9 1PL. Offsite and online venues are excluded.",
  },
];

/** Normalize comparison text only; originals remain on aliases and raw rows. */
export function normalizeVenueSiteText(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[‘’']/g, "").replace(/[‐‑‒–—−]/g, "-")
    .replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
}

const postcodePattern = /\b([a-z]{1,2}\d[a-z\d]?)\s*(\d[a-z]{2})\b/i;

/** Accept a literal UK postcode from its field, or from the address if the
 * field is blank. Invalid or contradictory postcode evidence stays null.
 */
export function normalizeVenueSitePostcode(postcode: string, address = ""): string | null {
  const field = postcode.trim();
  const explicit = field.match(new RegExp(`^${postcodePattern.source}$`, "i"));
  const embedded = address.match(postcodePattern);
  if (field && !explicit) return null;
  const format = (match: RegExpMatchArray) => `${match[1]}${match[2]}`.toUpperCase();
  if (explicit && embedded && format(explicit) !== format(embedded)) return null;
  return explicit ? format(explicit) : embedded ? format(embedded) : null;
}

/** Normalize punctuation/locality suffixes and road abbreviations at the end
 * of the address only. Building/room prefixes and street numbers are retained.
 * In particular, St in St Giles is never expanded to Street.
 */
export function normalizeVenueSiteAddress(address: string): string {
  return normalizeVenueSiteText(address).replace(postcodePattern, " ")
    .replace(/[,.]/g, " ").replace(/\s+/g, " ").trim()
    .replace(/(?:\s+(?:edinburgh|scotland|uk|united kingdom))+$/, "").trim()
    .replace(/\bst$/, "street").replace(/\bpl$/, "place")
    .replace(/\brd$/, "road").replace(/\bave$/, "avenue");
}

/** Explicit virtual labels take precedence over apparently physical addresses.
 * Traverse 3's administrative Fringe address is a reviewed virtual exception.
 */
export function isExplicitlyVirtualVenue(event: FestivalData): boolean {
  const name = normalizeVenueSiteText(event.venue.name);
  const address = normalizeVenueSiteText(event.venue.address);
  return /\b(online|digital|virtual|livestream|live stream|on demand|zootv|showcatcher|fringe player|minecraft|discord)\b/.test(`${name} ${address}`)
    || (name === "traverse 3" && normalizeVenueSiteAddress(address) === "180 high street");
}

/** A multi-site source label is not evidence for one building, even when the
 * export gives it one address. Includes the explicitly named three-bar entry
 * reviewed in the local data; no event is allocated between its named sites.
 */
export function isMultiSiteVenueDescription(event: FestivalData): boolean {
  const name = normalizeVenueSiteText(event.venue.name);
  return /\b(various|multiple|several) (venues|locations|sites)\b/.test(name)
    || name === "la belle angele, sneaky petes and bannermans bar"
    || name.startsWith("scottish storytelling centre & museum of ");
}

/** Retain each distinct source venue description, including literal codes,
 * coordinates and festival context. Repeated event rows are never removed.
 */
export function groupVenueSiteAliases(events: FestivalData[]): VenueSiteAlias[] {
  return d3.groups(events, (event) => JSON.stringify([event.venue, event.festival]))
    .map(([, records]) => ({
      name: records[0].venue.name, code: records[0].venue.code,
      festival: records[0].festival, address: records[0].venue.address,
      postcode: records[0].venue.postcode, latitude: records[0].venue.latitude,
      longitude: records[0].venue.longitude, events: records,
      raw: records.map((event) => event.raw),
    }));
}

/** A deterministic compact label; original aliases stay available separately. */
export function selectVenueSiteDisplayName(events: FestivalData[]): string {
  const names = [...new Set(events.map((event) => event.venue.name.trim()).filter(Boolean))];
  return names.sort((a, b) => a.length - b.length || a.localeCompare(b, "en-US"))[0] || "Unnamed venue";
}

export type VenueCodeGroupEvidence = {
  code: string;
  mergeKey: string | null;
  reviewedSite: ReviewedVenueSite | null;
  hasLocationConflict: boolean;
  isVirtual: boolean;
  events: FestivalData[];
  raw: RawFestivalData[];
};

/** Assess an existing exact-code group as a whole. It must have one consistent
 * physical address/site before it can join another code. Missing location
 * fields are retained and provide no match evidence. Coordinate, festival,
 * or name changes never split a code group. Conflicting known addresses,
 * postcodes, virtual/physical mixtures, and multi-site entries block merging.
 * A missing postcode can coexist with matching addressed records but is never
 * filled in. Blank codes retain their original group and cannot bridge sites.
 */
export function assessVenueCodeGroup(events: FestivalData[]): VenueCodeGroupEvidence {
  const code = events[0].venue.code;
  const descriptions = groupVenueSiteAliases(events).map((alias) => {
    const event = alias.events[0];
    const address = normalizeVenueSiteAddress(alias.address);
    const postcode = normalizeVenueSitePostcode(alias.postcode, alias.address);
    const invalidPostcode = alias.postcode.trim() !== "" && postcode === null;
    const virtual = isExplicitlyVirtualVenue(event);
    const multipleLocations = isMultiSiteVenueDescription(event);
    const reviewedSite = !virtual && !multipleLocations
      ? reviewedVenueSites.find((site) => normalizeVenueSitePostcode(site.postcode) === postcode
        && site.addresses.some((candidate) => normalizeVenueSiteAddress(candidate) === address)) ?? null
      : null;
    const numbered = /^\d+[a-z]?(?:-\d+[a-z]?)?\s+\S+/.test(address) && address !== "180 high street";
    return { address, postcode, invalidPostcode, virtual, multipleLocations, reviewedSite,
      key: reviewedSite?.siteId ?? (numbered && postcode ? `address:${JSON.stringify([postcode, address])}` : null),
    };
  });
  const isVirtual = descriptions.every((item) => item.virtual);
  const keys = [...new Set(descriptions.map((item) => item.key).filter((key) => key !== null))];
  const supported = descriptions.filter((item) => item.key !== null);
  const key = keys.length === 1 ? keys[0] : null;
  const hasLocationConflict = keys.length > 1
    || descriptions.some((item) => item.multipleLocations)
    || descriptions.some((item) => item.invalidPostcode)
    || (keys.length === 0 && new Set(descriptions.map((item) => item.address).filter(Boolean)).size > 1)
    || (descriptions.some((item) => item.virtual) && !isVirtual)
    || descriptions.some((item) => {
      if (item.key !== null || !supported.length) return false;
      // Known partial locations must agree with a supported description.
      // Malformed or contradictory nonblank postcodes cannot support a merge.
      if (!item.postcode && item.address && descriptions.every((other) => other.address !== item.address || other.key === null)) return true;
      return (item.address !== "" || item.postcode !== null)
        && !supported.some((other) => (!item.address || other.address === item.address)
          && (!item.postcode || other.postcode === item.postcode));
    });
  return {
    code, mergeKey: code.trim() && key && !hasLocationConflict && !descriptions.some((item) => item.virtual) ? key : null,
    reviewedSite: supported.find((item) => item.reviewedSite)?.reviewedSite ?? null,
    hasLocationConflict, isVirtual, events, raw: events.map((event) => event.raw),
  };
}

/** Merge existing code groups; NEVER split them. One consistent reviewed site
 * or complete numbered address + postcode can combine different codes. A code
 * reused at different locations stays in its original column and cannot bridge
 * those locations to other code groups. This guarantees the output has at most
 * as many columns as exact-code grouping, including the original blank-code
 * group. It does not assert that every retained code group is one building.
 *
 * Coordinates remain source evidence but do not control identity: missing or
 * drifting geocoding must not create extra columns. No coordinate-only, broad
 * street, or name-only joins are used. IDs use the shared match key, or the
 * literal original code when no merge is supported. All event/raw objects and
 * their input order within groups are preserved, with no deduplication.
 */
export function groupEventsByVenueSite(events: FestivalData[]): VenueSite[] {
  const codeGroups = d3.groups(events, (event) => event.venue.code)
    .map(([, records]) => assessVenueCodeGroup(records));
  const keyForCode = new Map(codeGroups.map((group) => [group.code, group.mergeKey ?? `code:${JSON.stringify(group.code)}`]));
  const evidenceForKey = d3.group(codeGroups, (group) => keyForCode.get(group.code)!);
  return d3.groups(events, (event) => keyForCode.get(event.venue.code)!).map(([siteId, siteEvents]) => {
    const evidence = evidenceForKey.get(siteId)!;
    const reviewedSite = evidence[0].mergeKey ? evidence[0].reviewedSite : null;
    const isVirtual = evidence.every((item) => item.isVirtual);
    const hasLocationConflict = evidence.some((item) => item.hasLocationConflict);
    const matchMethod: VenueSiteMatchMethod = reviewedSite ? "reviewed-site"
      : evidence[0].mergeKey ? "address-match" : isVirtual ? "virtual" : "venue-code";
    const matchExplanation = reviewedSite ? reviewedSite.evidence
      : matchMethod === "address-match" ? "Consistent complete numbered address and postcode across the original code groups. Inferred site match; source coordinates are retained without splitting the groups."
      : isVirtual ? "Original venue-code group for virtual venues; not merged with physical sites."
      : hasLocationConflict ? "Original venue-code group retained. Conflicting locations or mixed venue types prevent a cross-code merge; this column is not one confirmed physical site."
      : "Original venue-code group retained; insufficient consistent location evidence for a cross-code merge.";
    const name = selectVenueSiteDisplayName(siteEvents);
    return {
      siteId, siteName: reviewedSite?.siteName ?? (hasLocationConflict ? `${name} (code ${evidence[0].code || "not provided"}; location uncertain)` : name),
      matchMethod, matchExplanation, aliases: groupVenueSiteAliases(siteEvents),
      events: siteEvents, raw: siteEvents.map((event) => event.raw),
    };
  });
}
