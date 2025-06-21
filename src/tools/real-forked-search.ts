import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { soloditAPI } from "../api/advanced-solodit-api";

const inputSchema = {
  forked_protocols: zod.array(zod.string()).optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  forked_protocols: zod.array(zod.string()),
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
    "real-forked-search",
    {
      description: `Real server-side forked protocol search using Solodit's actual API filtering. Find vulnerabilities in protocols that are forked from specific base protocols like "Uniswap V2", "Compound", "Aave", "Curve", etc.`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const forkedProtocols = args.forked_protocols || [];
      const page = args.page || 1;
      
      if (forkedProtocols.length === 0) {
        throw new Error("At least one forked protocol is required");
      }
      
      // Use the real Solodit API with server-side filtering
      const findings = await soloditAPI.searchByForked(forkedProtocols, page);
      
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
        forked_from: f.forked_from || [],
        source_link: f.source_link,
        search_method: "server_side_forked_filter"
      }));
      
      const findingsJSON = JSON.stringify(findingsContentShort, null, 2);
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          forked_protocols: forkedProtocols,
          count: findings.length,
          search_method: "server_side_forked_filter"
        },
        content: [
          {
            type: "text",
            text: `🍴 Real Forked Protocol Search Results for [${forkedProtocols.join(", ")}]:\n` +
                  `📊 Found ${findings.length} reports (server-side filtered)\n` +
                  `📄 Page: ${page}\n` +
                  `🔧 Method: Solodit's native forked filter\n\n` +
                  `${findingsJSON}`,
          },
        ],
      };
    }
  );
} 