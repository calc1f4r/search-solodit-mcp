import type { VulnerabilityReport } from "./types";
import { withRetry } from "./retry";
import { withCache } from "./utils/cache";
import { validateSlug, sanitizeVulnerabilityReport } from "./utils/validators";

export default async function getFinding(slug: string) {
  // Validate and sanitize slug
  if (!validateSlug(slug)) {
    throw new Error("Invalid slug provided");
  }

  const cacheKey = `finding:${slug}`;
  
  return withCache(cacheKey, async () => {
    return withRetry(async () => {
      const inputURL = `{"0":"[{\\"slug\\":1},\\"${slug}\\"]"}`;
      const url = `https://solodit.cyfrin.io/api/trpc/findings.getFindingBySlug?batch=1&input=${encodeURIComponent(inputURL)}`;

      console.log('Fetching finding for slug:', slug);
      const response = await fetch(url, {
        headers: {
          'accept': '*/*',
          'cache-control': 'no-cache',
          'content-type': 'application/json',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const contentResult = json[0].result.data;
      const obj = eval(`(${contentResult})`);
      
      // Sanitize the result before returning
      return sanitizeVulnerabilityReport(obj as VulnerabilityReport);
    });
  }, 600); // Cache for 10 minutes (individual findings change less frequently)
}

