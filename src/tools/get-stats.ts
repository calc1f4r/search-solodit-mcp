import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import getFindings from "../get-findings";

const inputSchema = {
  keywords: zod.string().optional(),
  page_limit: zod.number().min(1).max(10).optional(),
};

const outputSchema = {
  statsJSON: zod.string(),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "get-stats",
    {
      description: `Gets statistics about vulnerability reports including impact distribution, top protocols, and audit firms`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const keywords = args.keywords?.replace(/^"|"$/g, "") || "";
      const pageLimit = args.page_limit || 3;
      
      // Collect findings from multiple pages for better statistics
      let allFindings = [];
      for (let page = 1; page <= pageLimit; page++) {
        const findings = await getFindings(keywords, page);
        allFindings.push(...findings);
        if (findings.length === 0) break;
      }
      
      // Calculate impact distribution
      const impactCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      allFindings.forEach(f => impactCounts[f.impact]++);
      
      // Get top protocols
      const protocolCounts: Record<string, number> = {};
      allFindings.forEach(f => {
        if (f.protocol_name) {
          protocolCounts[f.protocol_name] = (protocolCounts[f.protocol_name] || 0) + 1;
        }
      });
      const topProtocols = Object.entries(protocolCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      
      // Get top audit firms
      const firmCounts: Record<string, number> = {};
      allFindings.forEach(f => {
        if (f.firm_name) {
          firmCounts[f.firm_name] = (firmCounts[f.firm_name] || 0) + 1;
        }
      });
      const topFirms = Object.entries(firmCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));
      
      // Calculate average quality score
      const qualityScores = allFindings.filter(f => f.quality_score > 0).map(f => f.quality_score);
      const avgQualityScore = qualityScores.length > 0 
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length 
        : 0;
      
      const stats = {
        total_reports: allFindings.length,
        impact_distribution: impactCounts,
        top_protocols: topProtocols,
        top_audit_firms: topFirms,
        average_quality_score: Math.round(avgQualityScore * 100) / 100,
        pages_analyzed: pageLimit,
      };
      
      const statsJSON = JSON.stringify(stats, null, 2);
      
      return {
        structuredContent: {
          statsJSON,
        },
        content: [
          {
            type: "text",
            text: `Vulnerability Report Statistics${keywords ? ` for "${keywords}"` : ""}:\n\n${statsJSON}`,
          },
        ],
      };
    }
  );
} 