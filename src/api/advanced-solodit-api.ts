import type { VulnerabilityReport } from "../types";
import { withRetry } from "../retry";
import { withCache } from "../utils/cache";
import { CONFIG } from "../config";

interface SoloditFilters {
  keywords?: string;
  firms?: string[];
  tags?: string[];
  forked?: string[];
  impact?: ("HIGH" | "MEDIUM" | "LOW" | "GAS")[];
  user?: string;
  protocol?: string;
  reported?: string;
  reportedAfter?: string;
  protocolCategory?: string[];
  minFinders?: number;
  maxFinders?: number;
  rarityScore?: number;
  qualityScore?: number;
  bookmarked?: boolean;
  read?: boolean;
  unread?: boolean;
  sortField?: "Recency" | "Quality" | "Impact";
  sortDirection?: "Asc" | "Desc";
  page?: number;
}

export class SoloditAPI {
  
  private buildTRPCInput(filters: SoloditFilters): string {
    // Build the parameter array - this is the key insight from your API calls!
    const params: (string | number | boolean | object)[] = [];
    let paramIndex = 0;
    
    // Build the filter object with references to array positions
    const filterObj: any = {
      filters: 1,
      page: filters.page || 1
    };
    
    // Keywords
    if (filters.keywords) {
      filterObj.keywords = paramIndex;
      params[paramIndex] = filters.keywords;
      paramIndex++;
    } else {
      filterObj.keywords = paramIndex;
      params[paramIndex] = "";
      paramIndex++;
    }
    
    // Firms array
    filterObj.firms = paramIndex;
    params[paramIndex] = filters.firms || [];
    paramIndex++;
    
    // Tags array - this needs to reference positions of tag objects
    filterObj.tags = paramIndex;
    const tagIndices: number[] = [];
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => {
        tagIndices.push(paramIndex);
        params[paramIndex] = {
          label: tag,
          value: tag,
          disabled: false
        };
        paramIndex++;
      });
    }
    params[filterObj.tags] = tagIndices;
    paramIndex++;
    
    // Forked array - similar to tags
    filterObj.forked = paramIndex;
    const forkedIndices: number[] = [];
    if (filters.forked && filters.forked.length > 0) {
      filters.forked.forEach(forked => {
        forkedIndices.push(paramIndex);
        params[paramIndex] = {
          label: forked,
          value: forked,
          disabled: false
        };
        paramIndex++;
      });
    }
    params[filterObj.forked] = forkedIndices;
    paramIndex++;
    
    // Impact array
    filterObj.impact = paramIndex;
    const impactIndices: number[] = [];
    const defaultImpacts = ["HIGH", "MEDIUM", "LOW", "GAS"];
    defaultImpacts.forEach(impact => {
      impactIndices.push(paramIndex);
      params[paramIndex] = impact;
      paramIndex++;
    });
    params[filterObj.impact] = impactIndices;
    paramIndex++;
    
    // User/Author
    if (filters.user) {
      filterObj.user = paramIndex;
      params[paramIndex] = filters.user;
      paramIndex++;
    } else {
      filterObj.user = -1;
    }
    
    // Protocol
    if (filters.protocol) {
      filterObj.protocol = paramIndex;
      params[paramIndex] = filters.protocol;
      paramIndex++;
    } else {
      filterObj.protocol = -1;
    }
    
    // Reported
    filterObj.reported = paramIndex;
    params[paramIndex] = {
      label: filters.reported || "All time",
      value: filters.reportedAfter || "alltime"
    };
    paramIndex++;
    
    // Other fields with defaults
    filterObj.reportedAfter = -1;
    filterObj.protocolCategory = paramIndex;
    params[paramIndex] = filters.protocolCategory || [];
    paramIndex++;
    
    filterObj.minFinders = paramIndex;
    params[paramIndex] = filters.minFinders?.toString() || "1";
    paramIndex++;
    
    filterObj.maxFinders = paramIndex;
    params[paramIndex] = filters.maxFinders?.toString() || "100";
    paramIndex++;
    
    filterObj.rarityScore = paramIndex;
    filterObj.qualityScore = paramIndex;
    params[paramIndex] = filters.rarityScore || 1;
    paramIndex++;
    
    filterObj.bookmarked = paramIndex;
    filterObj.read = paramIndex;
    filterObj.unread = paramIndex;
    params[paramIndex] = filters.bookmarked || true;
    paramIndex++;
    
    filterObj.sortField = paramIndex;
    params[paramIndex] = filters.sortField || "Recency";
    paramIndex++;
    
    filterObj.sortDirection = paramIndex;
    params[paramIndex] = filters.sortDirection || "Desc";
    paramIndex++;
    
    // Final page parameter
    params[paramIndex] = filters.page || 1;
    
    // Construct the final tRPC input
    const tRPCInput = {
      "0": JSON.stringify([filterObj, ...params])
    };
    
    return JSON.stringify(tRPCInput);
  }
  
  async searchWithFilters(filters: SoloditFilters): Promise<VulnerabilityReport[]> {
    const cacheKey = `advanced_search:${JSON.stringify(filters)}`;
    
    return withCache(cacheKey, async () => {
      return withRetry(async () => {
        const inputURL = this.buildTRPCInput(filters);
        const url = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.SEARCH}?batch=1&input=${encodeURIComponent(inputURL)}`;
        
        console.log('Advanced search with filters:', filters);
        console.log('Generated URL:', url);
        
        const response = await fetch(url, {
          headers: CONFIG.API.HEADERS
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const json = await response.json();
        const contentResult = json[0].result.data;
        const obj = eval('(' + contentResult + ')');
        return obj.findings as VulnerabilityReport[];
      });
    }, CONFIG.CACHE.FINDINGS_TTL);
  }
  
  // Convenience methods for specific filters
  
  async searchByAuthor(author: string, page = 1): Promise<VulnerabilityReport[]> {
    return this.searchWithFilters({ user: author, page });
  }
  
  async searchByProtocol(protocol: string, page = 1): Promise<VulnerabilityReport[]> {
    return this.searchWithFilters({ protocol, page });
  }
  
  async searchByTags(tags: string[], page = 1): Promise<VulnerabilityReport[]> {
    return this.searchWithFilters({ tags, page });
  }
  
  async searchByForked(forked: string[], page = 1): Promise<VulnerabilityReport[]> {
    return this.searchWithFilters({ forked, page });
  }
  
  async searchByImpact(impact: ("HIGH" | "MEDIUM" | "LOW" | "GAS")[], page = 1): Promise<VulnerabilityReport[]> {
    return this.searchWithFilters({ impact, page });
  }
  
  async advancedSearch(filters: {
    keywords?: string;
    author?: string;
    protocol?: string;
    tags?: string[];
    forked?: string[];
    impact?: ("HIGH" | "MEDIUM" | "LOW" | "GAS")[];
    minFinders?: number;
    maxFinders?: number;
    sortField?: "Recency" | "Quality" | "Impact";
    sortDirection?: "Asc" | "Desc";
    page?: number;
  }): Promise<VulnerabilityReport[]> {
    return this.searchWithFilters({
      keywords: filters.keywords,
      user: filters.author,
      protocol: filters.protocol,
      tags: filters.tags,
      forked: filters.forked,
      impact: filters.impact,
      minFinders: filters.minFinders,
      maxFinders: filters.maxFinders,
      sortField: filters.sortField,
      sortDirection: filters.sortDirection,
      page: filters.page
    });
  }
}

export const soloditAPI = new SoloditAPI(); 