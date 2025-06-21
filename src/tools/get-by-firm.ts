import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import getFindings from "../get-findings";

const inputSchema = {
  firm_name: zod.string().optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  firm_name: zod.string(),
  count: zod.number(),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "get-by-firm",
    {
      description: `Gets vulnerability reports from a specific audit firm`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const firmName = args.firm_name?.replace(/^"|"$/g, "") || "";
      const page = args.page || 1;
      
      if (!firmName) {
        throw new Error("Firm name is required");
      }
      
      // Search using firm name as keywords
      const findings = await getFindings(firmName, page);
      
      // Filter to only include reports that actually match the firm
      const firmFindings = findings.filter(f => 
        f.firm_name?.toLowerCase().includes(firmName.toLowerCase())
      );
      
      const findingsContentShort = firmFindings.map((f) => ({
        title: f.title,
        slug: f.slug,
        impact: f.impact,
        protocol_name: f.protocol_name,
        firm_name: f.firm_name,
        report_date: f.report_date,
        quality_score: f.quality_score,
        summary: f.summary,
      }));
      
      const findingsJSON = JSON.stringify(firmFindings, null, 2);
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          firm_name: firmName,
          count: firmFindings.length,
        },
        content: [
          {
            type: "text",
            text: `Found ${firmFindings.length} vulnerability reports from audit firm "${firmName}":\n\n${findingsJSON}`,
          },
        ],
      };
    }
  );
} 