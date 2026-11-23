import * as d3 from "d3";

/** The supplied visitor export covers only this festival. */
export const ticketDataFestival = "Royal Edinburgh Military Tattoo";

/** Raw fields from the supplied 2025 Edinburgh Tattoo ticket export. */
export type RawTicketData = {
  UK_POSTCODE: string;
  TOWN: string;
  IATA_CODE: string;
  COUNTRY: string;
  ISO_ALPHA3: string;
  PURCHASE_ORDER_DATE: string;
  PRODUCT: string;
  PRODUCT_DATE_TIME: string;
  LOGICAL_SEAT_CATEGORY: string;
  " GROSS_UNIT_PRICE ": string;
  ORDER_QUANTITY: string;
  " GROSS_TOTAL_AMOUNT ": string;
  NOTE: string;
  FLAG: string;
};

/** A parsed ticket order row. Blank or malformed numeric and date values are null. */
export type TicketData = {
  ukPostcode: string;
  town: string;
  iataCode: string;
  country: string;
  isoAlpha3: string;
  purchaseOrderDate: Date | null;
  product: string;
  productDateTime: Date | null;
  logicalSeatCategory: string;
  grossUnitPrice: number | null;
  grossTotalAmount: number | null;
  note: string;
  flag: string;
  raw: RawTicketData;
};

const ticketDataCsvPath = `${import.meta.env.BASE_URL}data/tickets_data/tattoo_2025_tickets.csv`;
const parsePurchaseOrderDate = d3.timeParse("%d/%m/%Y");
const parseProductDateTime = d3.timeParse("%d/%m/%Y %H:%M");

let rawTicketDataPromise: Promise<RawTicketData[]> | undefined;
let ticketDataPromise: Promise<TicketData[]> | undefined;

/** Load the unmodified CSV rows. Failed loads are cleared so a later request can retry. */
export function loadRawTicketData(): Promise<RawTicketData[]> {
  if (!rawTicketDataPromise) {
    rawTicketDataPromise = d3
      .csv<RawTicketData>(ticketDataCsvPath, parseRawTicketData)
      .catch((error: unknown) => {
        rawTicketDataPromise = undefined;
        throw error;
      });
  }

  return rawTicketDataPromise;
}

/** Load parsed ticket rows while retaining every source row on its derived record. */
export function loadTicketData(): Promise<TicketData[]> {
  if (!ticketDataPromise) {
    ticketDataPromise = loadRawTicketData()
      .then((rows) => rows.map(toTicketData))
      .catch((error: unknown) => {
        ticketDataPromise = undefined;
        throw error;
      });
  }

  return ticketDataPromise;
}

/** Convert a raw CSV row without changing the retained source values. */
export function toTicketData(raw: RawTicketData): TicketData {
  return {
    ukPostcode: raw.UK_POSTCODE,
    town: raw.TOWN,
    iataCode: raw.IATA_CODE,
    country: raw.COUNTRY,
    isoAlpha3: raw.ISO_ALPHA3,
    purchaseOrderDate: parseOptionalDate(
      raw.PURCHASE_ORDER_DATE,
      parsePurchaseOrderDate,
    ),
    product: raw.PRODUCT,
    productDateTime: parseOptionalDate(
      raw.PRODUCT_DATE_TIME,
      parseProductDateTime,
    ),
    logicalSeatCategory: raw.LOGICAL_SEAT_CATEGORY,
    grossUnitPrice: parseOptionalCurrency(raw[" GROSS_UNIT_PRICE "]),
    grossTotalAmount: parseOptionalCurrency(raw[" GROSS_TOTAL_AMOUNT "]),
    note: raw.NOTE,
    flag: raw.FLAG,
    raw,
  };
}

function parseRawTicketData(row: d3.DSVRowString<string>): RawTicketData {
  return {
    UK_POSTCODE: row.UK_POSTCODE ?? "",
    TOWN: row.TOWN ?? "",
    IATA_CODE: row.IATA_CODE ?? "",
    COUNTRY: row.COUNTRY ?? "",
    ISO_ALPHA3: row.ISO_ALPHA3 ?? "",
    PURCHASE_ORDER_DATE: row.PURCHASE_ORDER_DATE ?? "",
    PRODUCT: row.PRODUCT ?? "",
    PRODUCT_DATE_TIME: row.PRODUCT_DATE_TIME ?? "",
    LOGICAL_SEAT_CATEGORY: row.LOGICAL_SEAT_CATEGORY ?? "",
    " GROSS_UNIT_PRICE ": row[" GROSS_UNIT_PRICE "] ?? "",
    ORDER_QUANTITY: row.ORDER_QUANTITY ?? "",
    " GROSS_TOTAL_AMOUNT ": row[" GROSS_TOTAL_AMOUNT "] ?? "",
    NOTE: row.NOTE ?? "",
    FLAG: row.FLAG ?? "",
  };
}

function parseOptionalDate(
  value: string,
  parser: (value: string) => Date | null,
): Date | null {
  return value.trim() ? parser(value.trim()) : null;
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseOptionalCurrency(value: string): number | null {
  const normalized = value.trim().replace(/[^0-9,.-]/g, "").replace(/,/g, "");
  return parseOptionalNumber(normalized);
}
