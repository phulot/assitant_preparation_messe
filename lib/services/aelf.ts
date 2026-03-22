const AELF_API_BASE = "https://api.aelf.org/v1/messes";

export interface Reading {
  titre: string | null;
  contenu: string;
  ref: string;
}

export interface DailyReadings {
  premiere_lecture: Reading;
  psaume: Reading;
  deuxieme_lecture: Reading | null;
  evangile: Reading;
}

interface AelfLecture {
  type: string;
  titre: string | null;
  contenu: string;
  ref: string;
}

interface AelfMesse {
  nom: string;
  lectures: AelfLecture[];
}

interface AelfResponse {
  informations: Record<string, unknown>;
  messes: AelfMesse[];
}

const readingsCache = new Map<string, DailyReadings>();

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isAelfResponse(data: unknown): data is AelfResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.messes);
}

function extractReadings(messe: AelfMesse): DailyReadings | null {
  const lectures = messe.lectures;
  if (!Array.isArray(lectures)) return null;

  const lecture1 = lectures.find((l) => l.type === "lecture_1");
  const psaume = lectures.find((l) => l.type === "psaume");
  const evangile = lectures.find((l) => l.type === "evangile");
  const lecture2 = lectures.find((l) => l.type === "lecture_2") ?? null;

  if (!lecture1 || !psaume || !evangile) return null;

  return {
    premiere_lecture: {
      titre: lecture1.titre,
      contenu: lecture1.contenu,
      ref: lecture1.ref,
    },
    psaume: {
      titre: psaume.titre,
      contenu: psaume.contenu,
      ref: psaume.ref,
    },
    deuxieme_lecture: lecture2
      ? {
          titre: lecture2.titre,
          contenu: lecture2.contenu,
          ref: lecture2.ref,
        }
      : null,
    evangile: {
      titre: evangile.titre,
      contenu: evangile.contenu,
      ref: evangile.ref,
    },
  };
}

/**
 * Fetches daily readings from the AELF API for a given date.
 * Returns structured readings or null if the API is unavailable or response is malformed.
 * Results are cached in-memory by date to avoid repeated calls.
 */
export async function fetchDailyReadings(
  date: Date,
): Promise<DailyReadings | null> {
  const dateStr = formatDate(date);

  const cached = readingsCache.get(dateStr);
  if (cached) return cached;

  let response: Response;
  try {
    response = await fetch(`${AELF_API_BASE}/${dateStr}`);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      return null;
    }
    return null;
  }

  if (!response.ok) return null;

  let data: unknown;
  try {
    data = await response.json();
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return null;
    }
    return null;
  }

  if (!isAelfResponse(data)) return null;
  if (data.messes.length === 0) return null;

  // Use the last messe (typically "Messe du jour")
  const messe = data.messes[data.messes.length - 1];
  const readings = extractReadings(messe);

  if (!readings) return null;

  readingsCache.set(dateStr, readings);
  return readings;
}

/**
 * Clears the in-memory readings cache. Useful for testing.
 */
export function clearReadingsCache(): void {
  readingsCache.clear();
}
