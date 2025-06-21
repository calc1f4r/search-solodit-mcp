import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import registerSearch from "./tools/search";
import registerGetByTitle from "./tools/get-by-slug";
import registerFilterByImpact from "./tools/filter-by-impact";
import registerGetStats from "./tools/get-stats";
import registerGetByProtocol from "./tools/get-by-protocol";
import registerGetByFirm from "./tools/get-by-firm";
import registerAdvancedSearch from "./tools/advanced-search";
import registerEnhancedFilter from "./tools/enhanced-filter";
import registerGetCategoriesAndTags from "./tools/get-categories-and-tags";
import registerSearchWithUIFilters from "./tools/search-with-ui-filters";

// Import REAL server-side filtering tools
import registerRealProtocolSearch from "./tools/real-protocol-search";
import registerRealAuthorSearch from "./tools/real-author-search";
import registerRealTagsSearch from "./tools/real-tags-search";
import registerRealForkedSearch from "./tools/real-forked-search";
import registerUltraAdvancedSearch from "./tools/ultra-advanced-search";

const app = express();
app.use(express.json());

function getServer() {
  const server = new McpServer({
    name: "SoloditMCPServer",
    version: "0.3.0",
  });

  // Register all tools
  registerSearch(server);
  registerGetByTitle(server);
  registerFilterByImpact(server);
  registerGetStats(server);
  registerGetByProtocol(server);
  registerGetByFirm(server);
  registerAdvancedSearch(server);
  registerEnhancedFilter(server);
  registerGetCategoriesAndTags(server);
  registerSearchWithUIFilters(server);

  // Register REAL server-side filtering tools  
  registerRealProtocolSearch(server);
  registerRealAuthorSearch(server);
  registerRealTagsSearch(server);
  registerRealForkedSearch(server);
  registerUltraAdvancedSearch(server);

  // Tools are automatically registered by the individual register functions

  return server;
}

app.post("/mcp", async (req, res) => {
  try {
    const server = getServer();
    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
    res.on("close", () => {
      console.log("Request closed");
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", version: "0.3.0", timestamp: new Date().toISOString() });
});

// Root endpoint with API info
app.get("/", (req, res) => {
  res.json({
    name: "Solodit MCP Server",
    version: "0.3.0",
    description: "MCP server for searching and retrieving vulnerability reports from Solodit with UI-matching filters",
    endpoints: {
      mcp: "/mcp",
      health: "/health"
    },
    tools: [
      "search",
      "get-by-slug", 
      "filter-by-impact",
      "get-stats",
      "get-by-protocol",
      "get-by-firm",
      "advanced-search",
      "enhanced-filter",
      "get-categories-and-tags",
      "search-with-ui-filters",
      "real-protocol-search",
      "real-author-search", 
      "real-tags-search",
      "real-forked-search",
      "ultra-advanced-search"
    ],
    features: [
      "Caching for improved performance",
      "Input validation and sanitization", 
      "UI-matching filter options",
      "Range/pagination support",
      "Protocol categories and tags discovery",
      "Author and source filtering",
      "Statistical analysis",
      "Multiple sorting options"
    ]
  });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, (err) => {
  console.log(`Search solodit MCP HTTP server listening on port ${PORT}`);
  console.log(`Available tools: search, get-by-slug, filter-by-impact, get-stats, get-by-protocol, get-by-firm, advanced-search, enhanced-filter, get-categories-and-tags, search-with-ui-filters, real-protocol-search, real-author-search, real-tags-search, real-forked-search, ultra-advanced-search`);
  if (err) {
    console.error("Server startup error:", err);
  }
});
