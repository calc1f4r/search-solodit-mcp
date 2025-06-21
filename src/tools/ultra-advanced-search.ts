import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { soloditAPI } from "../api/advanced-solodit-api";

const inputSchema = {
  keywords: zod.string().optional(),
  author: zod.string().optional(),
  protocol: zod.string().optional(),
  tags: zod.array(zod.string()).optional(),
  forked_from: zod.array(zod.string()).optional(),
  impact: zod.array(zod.enum(["HIGH", "MEDIUM", "LOW", "GAS"])).optional(),
  min_finders: zod.number().min(1).optional(),
  max_finders: zod.number().min(1).optional(),
  sort_field: zod.enum(["Recency", "Quality", "Impact"]).optional(),
  sort_direction: zod.enum(["Asc", "Desc"]).optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  filters_applied: zod.object({
    keywords: zod.string().optional(),
    author: zod.string().optional(),
    protocol: zod.string().optional(),
    tags: zod.array(zod.string()).optional(),
    forked_from: zod.array(zod.string()).optional(),
    impact: zod.array(zod.string()).optional(),
    min_finders: zod.number().optional(),
    max_finders: zod.number().optional(),
    sort_field: zod.string().optional(),
    sort_direction: zod.string().optional(),
    page: zod.number().optional(),
  }),
  count: zod.number(),
  search_method: zod.string(),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "ultra-advanced-search",
    {
      description: `Ultra-advanced search combining ALL real server-side Solodit filters: keywords, author, protocol, tags, forked protocols, impact levels, finder counts, and sorting. This uses Solodit's native API, not client-side filtering.`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const filters = {
        keywords: args.keywords,
        author: args.author,
        protocol: args.protocol,
        tags: args.tags,
        forked: args.forked_from,
        impact: args.impact,
        minFinders: args.min_finders,
        maxFinders: args.max_finders,
        sortField: args.sort_field,
        sortDirection: args.sort_direction,
        page: args.page || 1
      };
      
      // Validate that at least one filter is provided
      const hasFilters = Object.values(filters).some(val => 
        val !== undefined && val !== null && 
        (Array.isArray(val) ? val.length > 0 : true)
      );
      
      if (!hasFilters) {
        throw new Error("At least one filter parameter is required");
      }
      
      // Use the real Solodit API with server-side filtering
      const findings = await soloditAPI.advancedSearch(filters);
      
      const findingsContentShort = findings.map((f) => ({
        title: f.title,
        slug: f.slug,
        impact: f.impact,
        protocol_name: f.protocol_name,
        firm_name: f.firm_name,
        report_date: f.report_date,
        quality_score: f.quality_score,
        summary: f.summary,
        finders_count: f.finders_count,
        authors: f.issues_issue_finders?.map(finder => finder.wardens_warden?.handle).filter(Boolean) || [],
        tags: f.tags || [],
        forked_from: f.forked_from || [],
        source_link: f.source_link,
        search_method: "ultra_advanced_server_side"
      }));
      
      const findingsJSON = JSON.stringify(findingsContentShort, null, 2);
      
      const appliedFilters = {
        keywords: args.keywords,
        author: args.author,
        protocol: args.protocol,
        tags: args.tags,
        forked_from: args.forked_from,
        impact: args.impact,
        min_finders: args.min_finders,
        max_finders: args.max_finders,
        sort_field: args.sort_field,
        sort_direction: args.sort_direction,
        page: args.page || 1
      };
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          filters_applied: appliedFilters,
          count: findings.length,
          search_method: "ultra_advanced_server_side"
        },
        content: [
          {
            type: "text",
            text: `🔥 Ultra-Advanced Search Results:\n` +
                  `📊 Found ${findings.length} reports (native server-side filtering)\n` +
                  `📄 Page: ${filters.page}\n` +
                  `🔧 Method: Solodit's native tRPC API with full filtering\n` +
                  `🎯 Filters Applied: ${JSON.stringify(appliedFilters, null, 2)}\n\n` +
                  `${findingsJSON}`,
          },
        ],
      };
    }
  );
} 