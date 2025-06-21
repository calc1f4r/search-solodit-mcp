import zod from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import getFindings from "../get-findings";

const inputSchema = {
  sample_pages: zod.number().min(1).max(5).optional(),
  keywords: zod.string().optional(),
};

const outputSchema = {
  categoriesJSON: zod.string(),
  summary: zod.object({
    total_protocols: zod.number(),
    total_firms: zod.number(),
    impact_distribution: zod.object({
      HIGH: zod.number(),
      MEDIUM: zod.number(),
      LOW: zod.number(),
    }),
    sample_size: zod.number(),
  }),
};

type Input = typeof inputSchema;
type Output = typeof outputSchema;

type InputArg = {
  [prop in keyof Input]?: zod.infer<Input[prop]>;
};

export default function register(server: McpServer) {
  server.registerTool<Input, Output>(
    "get-categories-and-tags",
    {
      description: `Discovers available protocol categories, report tags, audit firms, and other metadata from actual Solodit data`,
      inputSchema,
      outputSchema,
    },
    async (args: InputArg) => {
      const samplePages = args.sample_pages || 3;
      const keywords = args.keywords?.replace(/^"|"$/g, "") || "vulnerability";
      
      // Collect findings from multiple pages for comprehensive metadata
      let allFindings = [];
      for (let page = 1; page <= samplePages; page++) {
        try {
          const findings = await getFindings(keywords, page);
          allFindings.push(...findings);
          if (findings.length === 0) break;
        } catch (error) {
          console.warn(`Failed to fetch page ${page}:`, error);
          break;
        }
      }
      
      // Extract unique protocols
      const protocols = new Set();
      allFindings.forEach(f => {
        if (f.protocol_name) protocols.add(f.protocol_name);
      });
      
      // Extract unique audit firms
      const firms = new Set();
      allFindings.forEach(f => {
        if (f.firm_name) firms.add(f.firm_name);
      });
      
      // Extract unique kinds/sources
      const sources = new Set();
      allFindings.forEach(f => {
        if (f.kind) sources.add(f.kind);
      });
      
      // Extract unique author handles
      const authors = new Set();
      allFindings.forEach(f => {
        f.issues_issue_finders?.forEach(finder => {
          if (finder.wardens_warden?.handle) {
            authors.add(finder.wardens_warden.handle);
          }
        });
      });
      
      // Calculate impact distribution
      const impactCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      allFindings.forEach(f => impactCounts[f.impact]++);
      
      // Extract protocol categories from the protocol data
      const protocolCategories = new Set();
      allFindings.forEach(f => {
        if (f.protocols_protocol?.protocols_protocolcategoryscore) {
          f.protocols_protocol.protocols_protocolcategoryscore.forEach(cat => {
            // Extract category information if available
            if (cat && typeof cat === 'object') {
              Object.keys(cat).forEach(key => {
                if (key.includes('category') || key.includes('tag')) {
                  protocolCategories.add(cat[key]);
                }
              });
            }
          });
        }
      });
      
      // Extract issue tags
      const issueTags = new Set();
      allFindings.forEach(f => {
        if (f.issues_issuetagscore && Array.isArray(f.issues_issuetagscore)) {
          f.issues_issuetagscore.forEach(tag => {
            if (tag && typeof tag === 'object') {
              Object.keys(tag).forEach(key => {
                if (key.includes('tag') || key.includes('category')) {
                  issueTags.add(tag[key]);
                }
              });
            }
          });
        }
      });
      
      const metadata = {
        protocols: Array.from(protocols).sort(),
        audit_firms: Array.from(firms).sort(),
        sources_kinds: Array.from(sources).sort(),
        top_authors: Array.from(authors).slice(0, 20).sort(),
        protocol_categories: Array.from(protocolCategories).filter(Boolean).sort(),
        issue_tags: Array.from(issueTags).filter(Boolean).sort(),
        impact_levels: ["HIGH", "MEDIUM", "LOW"],
        sample_data: {
          total_findings_sampled: allFindings.length,
          pages_sampled: samplePages,
          search_keywords: keywords,
        }
      };
      
      const categoriesJSON = JSON.stringify(metadata, null, 2);
      
      const summary = {
        total_protocols: protocols.size,
        total_firms: firms.size,
        impact_distribution: impactCounts,
        sample_size: allFindings.length,
      };
      
      return {
        structuredContent: {
          categoriesJSON,
          summary,
        },
        content: [
          {
            type: "text",
            text: `Solodit Metadata Discovery:\n` +
                  `Sample size: ${allFindings.length} findings from ${samplePages} pages\n` +
                  `Total unique protocols: ${protocols.size}\n` +
                  `Total unique audit firms: ${firms.size}\n` +
                  `Total unique sources: ${sources.size}\n` +
                  `Total unique authors: ${authors.size}\n\n` +
                  `Available Categories and Tags:\n${categoriesJSON}`,
          },
        ],
      };
    }
  );
} 