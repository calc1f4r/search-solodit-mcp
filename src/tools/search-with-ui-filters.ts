import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import getFindings from "../get-findings";

const inputSchema = {
  // Main search
  search_query: zod.string().optional(),
  
  // Range selector (like the 1-100 in the UI)
  result_range_start: zod.number().min(1).optional(),
  result_range_end: zod.number().min(1).max(100).optional(),
  
  // Protocol categories (dropdown in UI)
  protocol_categories: zod.array(zod.string()).optional(),
  
  // Report tags (dropdown in UI)
  report_tags: zod.array(zod.string()).optional(),
  
  // Source (dropdown in UI)
  source_filter: zod.string().optional(),
  
  // Protocol name search field
  protocol_name_filter: zod.string().optional(),
  
  // Author search field  
  author_filter: zod.string().optional(),
  
  // Forked from (dropdown in UI)
  forked_from: zod.string().optional(),
  
  // Sort options (available in main UI)
  sort_by: zod.enum(["recency", "quality", "impact", "relevance"]).optional(),
  sort_direction: zod.enum(["asc", "desc"]).optional(),
  
  // Page for pagination
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  resultsJSON: zod.string(),
  ui_summary: zod.object({
    total_results: zod.number(),
    showing_range: zod.string(),
    current_page: zod.number(),
    filters_active: zod.array(zod.string()),
    sort_applied: zod.string(),
  }),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "search-with-ui-filters",
    {
      description: `Search that mimics the exact Solodit UI filtering experience with range selector, dropdowns, and search fields`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      // Build search query combining main search with filters
      let searchTerms = [];
      
      if (args.search_query) {
        searchTerms.push(args.search_query.replace(/^"|"$/g, ""));
      }
      
      if (args.protocol_name_filter) {
        searchTerms.push(args.protocol_name_filter);
      }
      
      if (args.author_filter) {
        searchTerms.push(args.author_filter);
      }
      
      const combinedSearch = searchTerms.join(" ").trim() || "vulnerability";
      const page = args.page || 1;
      
      // Get findings
      const findings = await getFindings(combinedSearch, page);
      
      let filteredFindings = findings;
      const activeFilters = [];
      
      // Apply protocol name filter (precise matching)
      if (args.protocol_name_filter) {
        const protocolName = args.protocol_name_filter.toLowerCase();
        filteredFindings = filteredFindings.filter(f => 
          f.protocol_name?.toLowerCase().includes(protocolName)
        );
        activeFilters.push(`Protocol: ${args.protocol_name_filter}`);
      }
      
      // Apply author filter (check both firm and individual authors)
      if (args.author_filter) {
        const authorName = args.author_filter.toLowerCase();
        filteredFindings = filteredFindings.filter(f => {
          const firmMatch = f.firm_name?.toLowerCase().includes(authorName);
          const individualMatch = f.issues_issue_finders?.some(finder => 
            finder.wardens_warden?.handle?.toLowerCase().includes(authorName)
          );
          return firmMatch || individualMatch;
        });
        activeFilters.push(`Author: ${args.author_filter}`);
      }
      
      // Apply source filter
      if (args.source_filter) {
        const sourceName = args.source_filter.toLowerCase();
        filteredFindings = filteredFindings.filter(f => 
          f.firm_name?.toLowerCase().includes(sourceName) ||
          f.kind?.toLowerCase().includes(sourceName)
        );
        activeFilters.push(`Source: ${args.source_filter}`);
      }
      
      // Apply protocol categories filter
      if (args.protocol_categories && args.protocol_categories.length > 0) {
        const categories = args.protocol_categories;
        filteredFindings = filteredFindings.filter(f => {
          return categories.some(category => {
            const categoryLower = category.toLowerCase();
            return f.protocol_name?.toLowerCase().includes(categoryLower) ||
                   f.kind?.toLowerCase().includes(categoryLower);
          });
        });
        activeFilters.push(`Categories: ${categories.join(", ")}`);
      }
      
      // Apply sorting (like the Sort button in UI)
      let sortApplied = "Default";
      if (args.sort_by) {
        const sortDirection = args.sort_direction || "desc";
        filteredFindings.sort((a, b) => {
          let aVal, bVal;
          
          switch (args.sort_by) {
            case "quality":
              aVal = a.quality_score;
              bVal = b.quality_score;
              break;
            case "recency":
              aVal = new Date(a.report_date).getTime();
              bVal = new Date(b.report_date).getTime();
              break;
            case "impact":
              const impactOrder = { "HIGH": 3, "MEDIUM": 2, "LOW": 1 };
              aVal = impactOrder[a.impact];
              bVal = impactOrder[b.impact];
              break;
            case "relevance":
              // Use search order from API
              aVal = a.search_order || 0;
              bVal = b.search_order || 0;
              break;
            default:
              return 0;
          }
          
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });
        sortApplied = `${args.sort_by} (${sortDirection})`;
      }
      
      // Apply range filter (like the 1-100 selector in UI)
      const rangeStart = args.result_range_start || 1;
      const rangeEnd = args.result_range_end || Math.min(filteredFindings.length, 100);
      
      const startIndex = rangeStart - 1;
      const endIndex = Math.min(rangeEnd, filteredFindings.length);
      const rangedFindings = filteredFindings.slice(startIndex, endIndex);
      
      // Format results to match Solodit UI display
      const uiFormattedResults = rangedFindings.map((f, index) => ({
        position: rangeStart + index,
        title: f.title,
        slug: f.slug,
        impact: f.impact,
        protocol_name: f.protocol_name,
        authors: {
          firm: f.firm_name,
          individuals: f.issues_issue_finders?.map(finder => finder.wardens_warden?.handle).filter(Boolean) || [],
        },
        report_date: f.report_date,
        time_ago: calculateTimeAgo(f.report_date),
        quality_score: f.quality_score,
        summary: f.summary,
        links: {
          source: f.source_link,
          github: f.github_link,
          pdf: f.pdf_link,
        },
        tags: {
          kind: f.kind,
          impact_badge: f.impact.toLowerCase(),
        }
      }));
      
      const resultsJSON = JSON.stringify(uiFormattedResults, null, 2);
      
      const uiSummary = {
        total_results: filteredFindings.length,
        showing_range: `${rangeStart}-${Math.min(rangeEnd, filteredFindings.length)}`,
        current_page: page,
        filters_active: activeFilters,
        sort_applied: sortApplied,
      };
      
      return {
        structuredContent: {
          resultsJSON,
          ui_summary: uiSummary,
        },
        content: [
          {
            type: "text",
            text: `Solodit UI Search Results:\n\n` +
                  `📊 ${filteredFindings.length} total results found\n` +
                  `📋 Showing: ${rangeStart}-${Math.min(rangeEnd, filteredFindings.length)}\n` +
                  `📄 Page: ${page}\n` +
                  `🔍 Active Filters: ${activeFilters.length > 0 ? activeFilters.join(" | ") : "None"}\n` +
                  `🔄 Sort: ${sortApplied}\n\n` +
                  `Results:\n${resultsJSON}`,
          },
        ],
      };
    }
  );
}

function calculateTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
} 