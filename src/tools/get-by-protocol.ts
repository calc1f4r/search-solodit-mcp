import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import getFindings from "../get-findings";

const inputSchema = {
  protocol_name: zod.string().optional(),
  page: zod.number().min(1).optional(),
};

const outputSchema = {
  reportsJSON: zod.string(),
  protocol_name: zod.string(),
  count: zod.number(),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "get-by-protocol",
    {
      description: `Gets vulnerability reports for a specific protocol`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const protocolName = args.protocol_name?.replace(/^"|"$/g, "") || "";
      const page = args.page || 1;
      
      if (!protocolName) {
        throw new Error("Protocol name is required");
      }
      
      // Search using protocol name as keywords
      const findings = await getFindings(protocolName, page);
      
      // Filter to only include reports that actually match the protocol
      const protocolFindings = findings.filter(f => 
        f.protocol_name?.toLowerCase().includes(protocolName.toLowerCase())
      );
      
      const findingsContentShort = protocolFindings.map((f) => ({
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
      
      return {
        structuredContent: {
          reportsJSON: findingsJSON,
          protocol_name: protocolName,
          count: protocolFindings.length,
        },
        content: [
          {
            type: "text",
            text: `Found ${protocolFindings.length} vulnerability reports for protocol "${protocolName}":\n\n${findingsJSON}`,
          },
        ],
      };
    }
  );
} 