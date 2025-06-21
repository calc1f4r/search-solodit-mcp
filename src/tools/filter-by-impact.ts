import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import getFindings from "../get-findings";

const inputSchema = {
  keywords: zod.string().optional(),
  impact: zod.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  count: zod.number(),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "filter-by-impact",
    {
      description: `Filters solodit vulnerability reports by impact level (HIGH, MEDIUM, LOW) and optionally by keywords`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const keywords = args.keywords?.replace(/^"|"$/g, "") || "";
      const page = args.page || 1;
      const findings = await getFindings(keywords, page);
      
      let filteredFindings = findings;
      if (args.impact) {
        filteredFindings = findings.filter(f => f.impact === args.impact);
      }
      
      const findingsContentShort = filteredFindings.map((f) => ({
        title: f.title,
        slug: f.slug,
        impact: f.impact,
        protocol_name: f.protocol_name,
        firm_name: f.firm_name,
        report_date: f.report_date,
        quality_score: f.quality_score,
      }));
      
      const findingsJSON = JSON.stringify(findingsContentShort, null, 2);
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          count: filteredFindings.length,
        },
        content: [
          {
            type: "text",
            text: `Found ${filteredFindings.length} vulnerability reports${args.impact ? ` with ${args.impact} impact` : ""}:\n\n${findingsJSON}`,
          },
        ],
      };
    }
  );
} 