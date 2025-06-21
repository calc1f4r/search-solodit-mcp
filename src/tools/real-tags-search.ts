import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { soloditAPI } from "../api/advanced-solodit-api";

const inputSchema = {
  tags: zod.array(zod.string()).optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  tags: zod.array(zod.string()),
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
    "real-tags-search",
    {
      description: `Real server-side tag search using Solodit's actual API filtering. Common tags include: "1/64 Rule", "51% Attack", "ABI Encoding", "Account Abstraction", "Access Control", "Admin Privilege", "Arbitrage", "Array Bounds", "Auction", "Authority", "Backdoor", "Bridge", etc.`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const tags = args.tags || [];
      const page = args.page || 1;
      
      if (tags.length === 0) {
        throw new Error("At least one tag is required");
      }
      
      // Use the real Solodit API with server-side filtering
      const findings = await soloditAPI.searchByTags(tags, page);
      
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
        tags: f.tags || [],
        source_link: f.source_link,
        search_method: "server_side_tags_filter"
      }));
      
      const findingsJSON = JSON.stringify(findingsContentShort, null, 2);
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          tags: tags,
          count: findings.length,
          search_method: "server_side_tags_filter"
        },
        content: [
          {
            type: "text",
            text: `🏷️ Real Tags Search Results for [${tags.join(", ")}]:\n` +
                  `📊 Found ${findings.length} reports (server-side filtered)\n` +
                  `📄 Page: ${page}\n` +
                  `🔧 Method: Solodit's native tags filter\n\n` +
                  `${findingsJSON}`,
          },
        ],
      };
    }
  );
} 