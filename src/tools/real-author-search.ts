import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { soloditAPI } from "../api/advanced-solodit-api";

const inputSchema = {
  author_name: zod.string().optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  author_name: zod.string(),
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
    "real-author-search",
    {
      description: `Real server-side author search using Solodit's actual API filtering (not client-side)`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const authorName = args.author_name?.replace(/^"|"$/g, "") || "";
      const page = args.page || 1;
      
      if (!authorName) {
        throw new Error("Author name is required");
      }
      
      // Use the real Solodit API with server-side filtering
      const findings = await soloditAPI.searchByAuthor(authorName, page);
      
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
        source_link: f.source_link,
        search_method: "server_side_author_filter"
      }));
      
      const findingsJSON = JSON.stringify(findingsContentShort, null, 2);
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          author_name: authorName,
          count: findings.length,
          search_method: "server_side_author_filter"
        },
        content: [
          {
            type: "text",
            text: `👤 Real Author Search Results for "${authorName}":\n` +
                  `📊 Found ${findings.length} reports (server-side filtered)\n` +
                  `📄 Page: ${page}\n` +
                  `🔧 Method: Solodit's native author filter\n\n` +
                  `${findingsJSON}`,
          },
        ],
      };
    }
  );
} 