import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import getFindings from "../get-findings";

const inputSchema = {
  keywords: zod.string().optional(),
  impact: zod.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  min_quality_score: zod.number().min(0).max(10).optional(),
  max_quality_score: zod.number().min(0).max(10).optional(),
  protocol_name: zod.string().optional(),
  firm_name: zod.string().optional(),
  sort_by: zod.enum(["quality_score", "report_date", "impact"]).optional(),
  sort_direction: zod.enum(["asc", "desc"]).optional(),
  page: zod.number().min(1).optional(),
  limit: zod.number().min(1).max(100).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  total_found: zod.number(),
  filters_applied: zod.string(),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "advanced-search",
    {
      description: `Advanced search for vulnerability reports with multiple filters and sorting options`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const keywords = args.keywords?.replace(/^"|"$/g, "") || "";
      const page = args.page || 1;
      const limit = args.limit || 20;
      
      const findings = await getFindings(keywords, page);
      
      let filteredFindings = findings;
      const appliedFilters = [];
      
      // Apply impact filter
      if (args.impact) {
        filteredFindings = filteredFindings.filter(f => f.impact === args.impact);
        appliedFilters.push(`impact=${args.impact}`);
      }
      
      // Apply quality score filters
      if (args.min_quality_score !== undefined) {
        filteredFindings = filteredFindings.filter(f => f.quality_score >= args.min_quality_score!);
        appliedFilters.push(`min_quality_score=${args.min_quality_score}`);
      }
      
      if (args.max_quality_score !== undefined) {
        filteredFindings = filteredFindings.filter(f => f.quality_score <= args.max_quality_score!);
        appliedFilters.push(`max_quality_score=${args.max_quality_score}`);
      }
      
      // Apply protocol filter
      if (args.protocol_name) {
        const protocolName = args.protocol_name.toLowerCase();
        filteredFindings = filteredFindings.filter(f => 
          f.protocol_name?.toLowerCase().includes(protocolName)
        );
        appliedFilters.push(`protocol=${args.protocol_name}`);
      }
      
      // Apply firm filter
      if (args.firm_name) {
        const firmName = args.firm_name.toLowerCase();
        filteredFindings = filteredFindings.filter(f => 
          f.firm_name?.toLowerCase().includes(firmName)
        );
        appliedFilters.push(`firm=${args.firm_name}`);
      }
      
      // Apply sorting
      if (args.sort_by) {
        const sortDirection = args.sort_direction || "desc";
        filteredFindings.sort((a, b) => {
          let aVal, bVal;
          
          switch (args.sort_by) {
            case "quality_score":
              aVal = a.quality_score;
              bVal = b.quality_score;
              break;
            case "report_date":
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
        appliedFilters.push(`sort=${args.sort_by}_${sortDirection}`);
      }
      
      // Apply limit
      const limitedFindings = filteredFindings.slice(0, limit);
      
      const findingsContentShort = limitedFindings.map((f) => ({
        title: f.title,
        slug: f.slug,
        impact: f.impact,
        protocol_name: f.protocol_name,
        firm_name: f.firm_name,
        report_date: f.report_date,
        quality_score: f.quality_score,
        summary: f.summary,
      }));
      
      const findingsJSON = JSON.stringify(findingsContentShort, null, 2);
      const filtersText = appliedFilters.length > 0 ? appliedFilters.join(", ") : "none";
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          total_found: filteredFindings.length,
          filters_applied: filtersText,
        },
        content: [
          {
            type: "text",
            text: `Advanced Search Results:\n` +
                  `Total found: ${filteredFindings.length} reports\n` +
                  `Showing: ${limitedFindings.length} reports\n` +
                  `Filters applied: ${filtersText}\n\n` +
                  `${findingsJSON}`,
          },
        ],
      };
    }
  );
} 