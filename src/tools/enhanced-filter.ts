import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import getFindings from "../get-findings";

const inputSchema = {
  keywords: zod.string().optional(),
  impact: zod.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  protocol_categories: zod.array(zod.string()).optional(),
  report_tags: zod.array(zod.string()).optional(),
  source: zod.string().optional(),
  protocol_name: zod.string().optional(),
  author: zod.string().optional(),
  forked_from: zod.string().optional(),
  min_range: zod.number().min(1).optional(),
  max_range: zod.number().min(1).max(100).optional(),
  sort_field: zod.enum(["recency", "quality_score", "impact"]).optional(),
  sort_direction: zod.enum(["asc", "desc"]).optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  total_found: zod.number(),
  filters_summary: zod.string(),
  pagination_info: zod.object({
    current_page: zod.number(),
    range_start: zod.number(),
    range_end: zod.number(),
    total_results: zod.number(),
  }),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "enhanced-filter",
    {
      description: `Enhanced filtering that matches Solodit interface - filter by categories, tags, source, author, and more`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const keywords = args.keywords?.replace(/^"|"$/g, "") || "";
      const page = args.page || 1;
      const minRange = args.min_range || 1;
      const maxRange = args.max_range || 100;
      
      // Build search query based on available filters
      let searchQuery = keywords;
      
      // Add protocol name to search if specified
      if (args.protocol_name) {
        searchQuery += ` ${args.protocol_name}`;
      }
      
      // Add author to search if specified
      if (args.author) {
        searchQuery += ` ${args.author}`;
      }
      
      const findings = await getFindings(searchQuery.trim() || "vulnerability", page);
      
      let filteredFindings = findings;
      const appliedFilters = [];
      
      // Apply impact filter
      if (args.impact) {
        filteredFindings = filteredFindings.filter(f => f.impact === args.impact);
        appliedFilters.push(`impact: ${args.impact}`);
      }
      
      // Apply protocol name filter (more precise filtering after search)
      if (args.protocol_name) {
        const protocolName = args.protocol_name.toLowerCase();
        filteredFindings = filteredFindings.filter(f => 
          f.protocol_name?.toLowerCase().includes(protocolName)
        );
        appliedFilters.push(`protocol: ${args.protocol_name}`);
      }
      
      // Apply author filter (more precise filtering after search)
      if (args.author) {
        const authorName = args.author.toLowerCase();
        filteredFindings = filteredFindings.filter(f => {
          // Check in firm name and issue finders
          const firmMatch = f.firm_name?.toLowerCase().includes(authorName);
          const findersMatch = f.issues_issue_finders?.some(finder => 
            finder.wardens_warden?.handle?.toLowerCase().includes(authorName)
          );
          return firmMatch || findersMatch;
        });
        appliedFilters.push(`author: ${args.author}`);
      }
      
      // Apply source filter (based on audit firm categories)
      if (args.source) {
        const sourceName = args.source.toLowerCase();
        filteredFindings = filteredFindings.filter(f => 
          f.firm_name?.toLowerCase().includes(sourceName) || 
          f.kind?.toLowerCase().includes(sourceName)
        );
        appliedFilters.push(`source: ${args.source}`);
      }
      
      // Apply range filtering (pagination-like)
      const rangeSize = maxRange - minRange + 1;
      const startIndex = (minRange - 1);
      const endIndex = Math.min(startIndex + rangeSize, filteredFindings.length);
      const rangedFindings = filteredFindings.slice(startIndex, endIndex);
      
      // Apply sorting
      if (args.sort_field) {
        const sortDirection = args.sort_direction || "desc";
        rangedFindings.sort((a, b) => {
          let aVal, bVal;
          
          switch (args.sort_field) {
            case "quality_score":
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
            default:
              return 0;
          }
          
          if (sortDirection === "asc") {
            return aVal - bVal;
          } else {
            return bVal - aVal;
          }
        });
        appliedFilters.push(`sort: ${args.sort_field}_${sortDirection}`);
      }
      
      const findingsContentShort = rangedFindings.map((f) => ({
        title: f.title,
        slug: f.slug,
        impact: f.impact,
        protocol_name: f.protocol_name,
        firm_name: f.firm_name,
        author_handles: f.issues_issue_finders?.map(finder => finder.wardens_warden?.handle).filter(Boolean) || [],
        report_date: f.report_date,
        quality_score: f.quality_score,
        summary: f.summary,
        kind: f.kind,
        source_link: f.source_link,
      }));
      
      const findingsJSON = JSON.stringify(findingsContentShort, null, 2);
      const filtersText = appliedFilters.length > 0 ? appliedFilters.join(", ") : "none";
      
      const paginationInfo = {
        current_page: page,
        range_start: minRange,
        range_end: Math.min(maxRange, filteredFindings.length),
        total_results: filteredFindings.length,
      };
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          total_found: filteredFindings.length,
          filters_summary: filtersText,
          pagination_info: paginationInfo,
        },
        content: [
          {
            type: "text",
            text: `Enhanced Filter Results:\n` +
                  `Total found: ${filteredFindings.length} reports\n` +
                  `Showing range: ${minRange}-${Math.min(maxRange, filteredFindings.length)}\n` +
                  `Page: ${page}\n` +
                  `Filters applied: ${filtersText}\n\n` +
                  `Results:\n${findingsJSON}`,
          },
        ],
      };
    }
  );
} 