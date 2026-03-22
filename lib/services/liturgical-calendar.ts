import romcal from "romcal";

interface RomcalDate {
  moment: string;
  type: string;
  name: string;
  key: string;
  source: string;
  data: {
    season: {
      key: string;
      value: string;
    };
    meta: {
      liturgicalColor: { key: string; value: string };
      titles: string[];
      psalterWeek: { key: number; value: string };
      cycle: { key: number; value: string };
    };
    calendar: {
      weeks: number;
      week: number;
      day: number;
    };
    prioritized?: boolean;
  };
}

export interface FeastInfo {
  name: string;
  type: string;
  key: string;
  season: string;
  liturgicalColor: string;
}

export interface CelebrationInfo {
  name: string;
  type: string;
  key: string;
  date: string;
  season: string;
  liturgicalColor: string;
}

const FEAST_TYPES = new Set([
  "SOLEMNITY",
  "FEAST",
  "SUNDAY",
  "MEMORIAL",
  "TRIDUUM",
]);

function getCalendarForYear(year: number): RomcalDate[] {
  return romcal.calendarFor({ year }) as RomcalDate[];
}

function findDateEntry(date: Date): RomcalDate | undefined {
  const year = date.getFullYear();
  const calendar = getCalendarForYear(year);
  const dateStr = date.toISOString().slice(0, 10);
  return calendar.find(
    (entry) => entry.moment && entry.moment.startsWith(dateStr),
  );
}

/**
 * Returns the liturgical season name for a given date.
 * Possible values: "Advent", "Christmastide", "Early Ordinary Time",
 * "Later Ordinary Time", "Lent", "Holy Week", "Easter"
 */
export function getLiturgicalSeason(date: Date): string {
  const entry = findDateEntry(date);
  if (!entry) {
    throw new Error(
      `No liturgical data found for date: ${date.toISOString().slice(0, 10)}`,
    );
  }
  return entry.data.season.key;
}

/**
 * Returns feast/solemnity info for a date, or null if the day is
 * not a feast or solemnity (i.e., it's a feria, optional memorial, or commemoration).
 */
export function getFeastOrSolemnity(date: Date): FeastInfo | null {
  const entry = findDateEntry(date);
  if (!entry) {
    return null;
  }
  const isFeast = entry.type === "SOLEMNITY" || entry.type === "FEAST";
  if (!isFeast) {
    return null;
  }
  return {
    name: entry.name,
    type: entry.type,
    key: entry.key,
    season: entry.data.season.key,
    liturgicalColor: entry.data.meta.liturgicalColor.key,
  };
}

/**
 * Lists upcoming celebrations (feasts, solemnities, sundays, memorials, triduum)
 * within the given date range [start, end] inclusive.
 * Results are sorted by date ascending.
 */
export function listUpcomingCelebrations(
  start: Date,
  end: Date,
): CelebrationInfo[] {
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  const allEntries: RomcalDate[] = [];
  for (let year = startYear; year <= endYear; year++) {
    allEntries.push(...getCalendarForYear(year));
  }

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const filtered = allEntries
    .filter((entry) => {
      const entryDate = entry.moment.slice(0, 10);
      return (
        entryDate >= startStr &&
        entryDate <= endStr &&
        FEAST_TYPES.has(entry.type)
      );
    })
    .sort((a, b) => a.moment.localeCompare(b.moment));

  return filtered.map((entry) => ({
    name: entry.name,
    type: entry.type,
    key: entry.key,
    date: entry.moment.slice(0, 10),
    season: entry.data.season.key,
    liturgicalColor: entry.data.meta.liturgicalColor.key,
  }));
}
