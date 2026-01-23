import { Elysia, t } from "elysia";

// Types for Tempo API response (RTE public API)
interface RteTempoResponse {
  values: Record<string, string>; // { "2024-01-15": "BLUE", "2024-01-16": "WHITE", ... }
}

// Types for Tarifs API response (data.gouv.fr)
interface TarifGouvResponse {
  data: Array<{
    __id: number;
    DATE_DEBUT: string;
    DATE_FIN: string | null;
    PART_VARIABLE_HCBleu_TTC: string;
    PART_VARIABLE_HPBleu_TTC: string;
    PART_VARIABLE_HCBlanc_TTC: string;
    PART_VARIABLE_HPBlanc_TTC: string;
    PART_VARIABLE_HCRouge_TTC: string;
    PART_VARIABLE_HPRouge_TTC: string;
  }>;
}

interface TempoTarifs {
  blue: { hc: number; hp: number };
  white: { hc: number; hp: number };
  red: { hc: number; hp: number };
  dateDebut: string;
}

interface TempoData {
  today: {
    date: string;
    color: "BLUE" | "WHITE" | "RED" | null;
  };
  tomorrow: {
    date: string;
    color: "BLUE" | "WHITE" | "RED" | null;
  };
  tarifs: TempoTarifs | null;
  lastUpdated: string;
}

// Cache for Tempo data (recommended to call API a few times per day)
let tempoCache: TempoData | null = null;
let lastFetchTime: Date | null = null;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes cache

// Tarifs cache (updated once per day)
let tarifsCache: TempoTarifs | null = null;
let lastTarifsFetchTime: Date | null = null;
const TARIFS_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours cache

// RTE public API (no authentication needed!)
const RTE_PUBLIC_API = "https://www.services-rte.com/cms/open_data/v1/tempo";
const RTE_WEBPAGE_URL =
  "https://www.services-rte.com/fr/visualisez-les-donnees-publiees-par-rte/calendrier-des-offres-de-fourniture-de-type-tempo.html";

// data.gouv.fr API for tariffs
const TARIFS_API_URL =
  "https://tabular-api.data.gouv.fr/api/resources/0c3d1d36-c412-4620-8566-e5cbb4fa2b5a/data/?page_size=1&P_SOUSCRITE__exact=6&__id__sort=desc";

/**
 * Get the current Tempo season (e.g., "2024-2025" for dates between Sept 2024 and Aug 2025)
 */
function getCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // Tempo season runs from September to August
  if (month >= 9) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

/**
 * Fetch Tempo tariffs from data.gouv.fr
 */
async function fetchTarifs(): Promise<TempoTarifs | null> {
  // Check cache first
  if (tarifsCache && lastTarifsFetchTime) {
    const timeSinceLastFetch = Date.now() - lastTarifsFetchTime.getTime();
    if (timeSinceLastFetch < TARIFS_CACHE_DURATION_MS) {
      console.log("💶 Returning cached Tempo tarifs");
      return tarifsCache;
    }
  }

  console.log("💶 Fetching Tempo tarifs from data.gouv.fr...");

  try {
    const response = await fetch(TARIFS_API_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CatMonitor/1.0",
      },
    });

    if (!response.ok) {
      console.error(`❌ Failed to fetch tarifs: ${response.status}`);
      return tarifsCache; // Return cached data if available
    }

    const data = (await response.json()) as TarifGouvResponse;

    if (!data.data || data.data.length === 0) {
      console.error("❌ No tariff data available");
      return tarifsCache;
    }

    const tarifGouv = data.data[0];

    // Check if tariff is expired
    if (
      tarifGouv.DATE_FIN &&
      tarifGouv.DATE_FIN < new Date().toISOString().slice(0, 10)
    ) {
      console.error("❌ Tariff is expired");
      return tarifsCache;
    }

    // Fix date format bug in source data (YYYY-DD-MM instead of YYYY-MM-DD)
    let dateDebut = tarifGouv.DATE_DEBUT;
    const dateMatch = dateDebut.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      // Check if day > 12 (definitely wrong format)
      if (parseInt(dateMatch[2]) > 12) {
        dateDebut = `${dateMatch[1]}-${dateMatch[3]}-${dateMatch[2]}`;
      }
    }

    tarifsCache = {
      blue: {
        hc: parseFloat(tarifGouv.PART_VARIABLE_HCBleu_TTC),
        hp: parseFloat(tarifGouv.PART_VARIABLE_HPBleu_TTC),
      },
      white: {
        hc: parseFloat(tarifGouv.PART_VARIABLE_HCBlanc_TTC),
        hp: parseFloat(tarifGouv.PART_VARIABLE_HPBlanc_TTC),
      },
      red: {
        hc: parseFloat(tarifGouv.PART_VARIABLE_HCRouge_TTC),
        hp: parseFloat(tarifGouv.PART_VARIABLE_HPRouge_TTC),
      },
      dateDebut,
    };

    lastTarifsFetchTime = new Date();
    console.log("💶 Tempo tarifs fetched successfully");

    return tarifsCache;
  } catch (error) {
    console.error("❌ Error fetching tarifs:", error);
    return tarifsCache; // Return cached data if available
  }
}

/**
 * Fetch Tempo calendar data from RTE public API (no authentication needed!)
 */
async function fetchTempoData(): Promise<TempoData> {
  // Check cache first
  if (tempoCache && lastFetchTime) {
    const timeSinceLastFetch = Date.now() - lastFetchTime.getTime();
    if (timeSinceLastFetch < CACHE_DURATION_MS) {
      console.log("📅 Returning cached Tempo data");
      return tempoCache;
    }
  }

  console.log("📅 Fetching Tempo data from RTE public API...");

  const season = getCurrentSeason();
  const url = `${RTE_PUBLIC_API}?season=${season}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      DNT: "1",
      Host: "www.services-rte.com",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0",
      Referer: RTE_WEBPAGE_URL,
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to fetch Tempo data: ${response.status} - ${error}`,
    );
  }

  const data = (await response.json()) as RteTempoResponse;

  // Get today and tomorrow dates in French timezone (YYYY-MM-DD format)
  const now = new Date();
  const parisFormatter = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayStr = parisFormatter.format(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = parisFormatter.format(tomorrow);

  // Extract colors from the response
  const todayColor = data.values?.[todayStr] as
    | "BLUE"
    | "WHITE"
    | "RED"
    | undefined;
  const tomorrowColor = data.values?.[tomorrowStr] as
    | "BLUE"
    | "WHITE"
    | "RED"
    | undefined;

  // Fetch tariffs in parallel
  const tarifs = await fetchTarifs();

  tempoCache = {
    today: {
      date: todayStr,
      color: todayColor || null,
    },
    tomorrow: {
      date: tomorrowStr,
      color: tomorrowColor || null,
    },
    tarifs,
    lastUpdated: new Date().toISOString(),
  };

  lastFetchTime = new Date();

  console.log(
    `📅 Tempo data fetched: Today=${todayColor || "unknown"}, Tomorrow=${tomorrowColor || "unknown"}`,
  );

  return tempoCache;
}

/**
 * Create Tempo routes
 */
export function createTempoRoutes() {
  return (
    new Elysia({ prefix: "/tempo", tags: ["tempo"] })

      // 📅 Get current Tempo colors (today and tomorrow) + tariffs
      .get(
        "/",
        async ({ set }) => {
          try {
            const data = await fetchTempoData();
            return {
              success: true,
              ...data,
              message: "Tempo data retrieved successfully",
            };
          } catch (error) {
            console.error("❌ Tempo API error:", error);

            // Return cached data if available, even if expired
            if (tempoCache) {
              return {
                success: true,
                ...tempoCache,
                cached: true,
                message: "Returning cached Tempo data (API unavailable)",
              };
            }

            set.status = 503;
            return {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to fetch Tempo data",
              message: "Tempo service unavailable",
            };
          }
        },
        {
          response: t.Object({
            success: t.Boolean(),
            today: t.Optional(
              t.Object({
                date: t.String(),
                color: t.Union([
                  t.Literal("BLUE"),
                  t.Literal("WHITE"),
                  t.Literal("RED"),
                  t.Null(),
                ]),
              }),
            ),
            tomorrow: t.Optional(
              t.Object({
                date: t.String(),
                color: t.Union([
                  t.Literal("BLUE"),
                  t.Literal("WHITE"),
                  t.Literal("RED"),
                  t.Null(),
                ]),
              }),
            ),
            tarifs: t.Optional(
              t.Union([
                t.Object({
                  blue: t.Object({ hc: t.Number(), hp: t.Number() }),
                  white: t.Object({ hc: t.Number(), hp: t.Number() }),
                  red: t.Object({ hc: t.Number(), hp: t.Number() }),
                  dateDebut: t.String(),
                }),
                t.Null(),
              ]),
            ),
            lastUpdated: t.Optional(t.String()),
            cached: t.Optional(t.Boolean()),
            error: t.Optional(t.String()),
            message: t.String(),
          }),
        },
      )

      // 🔄 Force refresh Tempo data (clears cache)
      .post(
        "/refresh",
        async ({ set }) => {
          try {
            // Clear cache to force refresh
            tempoCache = null;
            lastFetchTime = null;
            tarifsCache = null;
            lastTarifsFetchTime = null;

            const data = await fetchTempoData();
            return {
              success: true,
              ...data,
              message: "Tempo data refreshed successfully",
            };
          } catch (error) {
            console.error("❌ Tempo refresh error:", error);
            set.status = 503;
            return {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to refresh Tempo data",
              message: "Tempo service unavailable",
            };
          }
        },
        {
          response: t.Object({
            success: t.Boolean(),
            today: t.Optional(
              t.Object({
                date: t.String(),
                color: t.Union([
                  t.Literal("BLUE"),
                  t.Literal("WHITE"),
                  t.Literal("RED"),
                  t.Null(),
                ]),
              }),
            ),
            tomorrow: t.Optional(
              t.Object({
                date: t.String(),
                color: t.Union([
                  t.Literal("BLUE"),
                  t.Literal("WHITE"),
                  t.Literal("RED"),
                  t.Null(),
                ]),
              }),
            ),
            tarifs: t.Optional(
              t.Union([
                t.Object({
                  blue: t.Object({ hc: t.Number(), hp: t.Number() }),
                  white: t.Object({ hc: t.Number(), hp: t.Number() }),
                  red: t.Object({ hc: t.Number(), hp: t.Number() }),
                  dateDebut: t.String(),
                }),
                t.Null(),
              ]),
            ),
            lastUpdated: t.Optional(t.String()),
            error: t.Optional(t.String()),
            message: t.String(),
          }),
        },
      )
  );
}
