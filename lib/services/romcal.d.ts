declare module "romcal" {
  interface RomcalSeasonData {
    key: string;
    value: string;
  }

  interface RomcalLiturgicalColor {
    key: string;
    value: string;
  }

  interface RomcalMeta {
    liturgicalColor: RomcalLiturgicalColor;
    titles: string[];
    psalterWeek: { key: number; value: string };
    cycle: { key: number; value: string };
  }

  interface RomcalCalendarData {
    weeks: number;
    week: number;
    day: number;
  }

  interface RomcalDateData {
    season: RomcalSeasonData;
    meta: RomcalMeta;
    calendar: RomcalCalendarData;
    prioritized?: boolean;
  }

  interface RomcalDate {
    moment: string;
    type: string;
    name: string;
    key: string;
    source: string;
    data: RomcalDateData;
  }

  interface CalendarOptions {
    year?: number;
    country?: string;
    locale?: string;
    type?: string;
  }

  function calendarFor(options?: CalendarOptions): RomcalDate[];

  const romcal: {
    calendarFor: typeof calendarFor;
  };

  export default romcal;
}
