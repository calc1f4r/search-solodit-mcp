import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { soloditAPI } from "../api/advanced-solodit-api";

const inputSchema = {
  protocol_name: zod.string().optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  protocol_name: zod.string(),
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
    "real-protocol-search",
    {
      description: `Real server-side protocol search using Solodit's actual API filtering (not client-side)`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const protocolName = args.protocol_name?.replace(/^"|"$/g, "") || "";
      const page = args.page || 1;
      
      if (!protocolName) {
        throw new Error("Protocol name is required");
      }
      
      // Use the real Solodit API with server-side filtering
      const findings = await soloditAPI.searchByProtocol(protocolName, page);
      
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
        source_link: f.source_link,
        search_method: "server_side_protocol_filter"
      }));
      
      const findingsJSON = JSON.stringify(findingsContentShort, null, 2);
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          protocol_name: protocolName,
          count: findings.length,
          search_method: "server_side_protocol_filter"
        },
        content: [
          {
            type: "text",
            text: `🎯 Real Protocol Search Results for "${protocolName}":\n` +
                  `📊 Found ${findings.length} reports (server-side filtered)\n` +
                  `📄 Page: ${page}\n` +
                  `🔧 Method: Solodit's native protocol filter\n\n` +
                  `${findingsJSON}`,
          },
        ],
      };
    }
  );
} 