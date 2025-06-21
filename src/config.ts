export const CONFIG = {
  // Server configuration
  SERVER: {
    NAME: "SoloditMCPServer",
    VERSION: "0.2.0",
    DEFAULT_PORT: 3000,
    DESCRIPTION: "MCP server for searching and retrieving vulnerability reports from Solodit",
  },

  // API configuration
  API: {
    BASE_URL: "https://solodit.cyfrin.io/api/trpc",
    ENDPOINTS: {
      SEARCH: "/findings.get",
      GET_BY_SLUG: "/findings.getFindingBySlug",
    },
    HEADERS: {
      'accept': '*/*',
      'cache-control': 'no-cache',
      'content-type': 'application/json',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    },
  },

  // Cache configuration
  CACHE: {
    DEFAULT_TTL: 300, // 5 minutes
    FINDINGS_TTL: 300, // 5 minutes
    INDIVIDUAL_FINDING_TTL: 600, // 10 minutes
    STATS_TTL: 900, // 15 minutes
  },

  // Retry configuration
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2,
  },

  // Validation limits
  LIMITS: {
    MAX_KEYWORDS_LENGTH: 500,
    MAX_SLUG_LENGTH: 200,
    MAX_PAGE_NUMBER: 1000,
    MAX_RESULTS_LIMIT: 100,
    MIN_QUALITY_SCORE: 0,
    MAX_QUALITY_SCORE: 10,
    DEFAULT_RESULTS_LIMIT: 20,
    MAX_STATS_PAGES: 10,
  },

  // Impact levels
  IMPACT_LEVELS: ["HIGH", "MEDIUM", "LOW"] as const,

  // Sort options
  SORT_OPTIONS: {
    FIELDS: ["quality_score", "report_date", "impact"] as const,
    DIRECTIONS: ["asc", "desc"] as const,
  },

  // Feature flags
  FEATURES: {
    CACHING_ENABLED: true,
    VALIDATION_ENABLED: true,
    DETAILED_LOGGING: process.env.NODE_ENV === "development",
  },
} as const;

export type ImpactLevel = typeof CONFIG.IMPACT_LEVELS[number];
export type SortField = typeof CONFIG.SORT_OPTIONS.FIELDS[number];
export type SortDirection = typeof CONFIG.SORT_OPTIONS.DIRECTIONS[number]; 