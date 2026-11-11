import { festivals } from "./festivals.js";

type FestivalConfiguration = (typeof festivals)[number];

export type DataCoverageInterval = {
  startYear: number;
  endYearExclusive: number;
};

export type FestivalHistoryVerticalLayout = {
  timelineGroupHeight: number;
  timelineGroupStart: number;
};

export const eventsDataCoverageIntervals: readonly DataCoverageInterval[] = [
  { startYear: 2012, endYearExclusive: 2027 },
];

export function calculateFestivalHistoryHorizontalMargin(width: number): number {
  return Math.min(96, Math.max(24, width * 0.08));
}

/**
 * Calculates responsive vertical spacing for the festival history timeline.
 */
export function calculateFestivalHistoryVerticalLayout(
  height: number,
  timelineCount: number,
): FestivalHistoryVerticalLayout {
  const rowCount = Math.max(1, timelineCount - 1);
  const maximumRowGap = Math.max(0, (height - 64) / rowCount);
  const rowGap = Math.min(58, maximumRowGap);
  const timelineGroupHeight = rowGap * rowCount;
  const availableVerticalSpace = Math.max(0, height - timelineGroupHeight);
  const verticalOffset = Math.min(32, availableVerticalSpace / 4);

  return {
    timelineGroupHeight,
    timelineGroupStart: availableVerticalSpace / 2 + verticalOffset,
  };
}

export type FestivalFoundationTimeline = Pick<
  FestivalConfiguration,
  "dataFestival" | "foundation" | "fullName" | "name"
> & {
  ticketingDataIntervals: DataCoverageInterval[];
};

const foundationTieBreakOrder = [
  "International",
  "Fringe",
  "Film",
  "Tattoo",
  "Jazz & Blues",
  "Book",
  "Storytelling",
  "Science",
  "Children's",
  "Hogmanay",
  "Art",
];

// Source: ticketing availability matrix supplied for this project on 2026-11-11.
const ticketingDataYearsByFestival: Record<
  FestivalConfiguration["name"],
  readonly number[]
> = {
  Hogmanay: [],
  Science: [],
  "Children's": [],
  "Jazz & Blues": [],
  Fringe: [2019, 2021, 2022, 2023, 2024, 2025, 2026],
  International: [2022, 2023, 2024, 2025, 2026],
  Tattoo: [2024, 2025, 2026],
  Art: [],
  Book: [2024, 2025],
  Film: [],
  Storytelling: [],
};

/**
 * Groups consecutive, already-ordered years into display intervals without
 * changing the supplied availability years.
 */
export function createTicketingDataIntervals(
  years: readonly number[],
): DataCoverageInterval[] {
  return years.reduce<DataCoverageInterval[]>((intervals, year) => {
    const previousInterval = intervals.at(-1);

    if (previousInterval && year === previousInterval.endYearExclusive) {
      previousInterval.endYearExclusive = year + 1;
    } else {
      intervals.push({ startYear: year, endYearExclusive: year + 1 });
    }

    return intervals;
  }, []);
}

/**
 * Returns a copy of the festival configuration ordered from oldest to newest.
 * Festivals founded in the same year retain the historical sequence used in
 * the timeline, beginning with the International Festival and the Fringe.
 */
export function sortFestivalsByFoundation(): FestivalFoundationTimeline[] {
  return festivals
    .map(({ dataFestival, foundation, fullName, name }) => ({
      dataFestival,
      foundation,
      fullName,
      name,
      ticketingDataIntervals: createTicketingDataIntervals(
        ticketingDataYearsByFestival[name],
      ),
    }))
    .sort((first, second) => {
      const foundationDifference = first.foundation - second.foundation;

      if (foundationDifference !== 0) {
        return foundationDifference;
      }

      return (
        foundationTieBreakOrder.indexOf(first.name) -
        foundationTieBreakOrder.indexOf(second.name)
      );
    });
}
