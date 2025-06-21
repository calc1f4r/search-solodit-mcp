# Solodit MCP Server

A comprehensive Model Context Protocol (MCP) server for searching and retrieving Solodit vulnerability reports with advanced filtering capabilities.

![Solodit MCP Demo](https://github.com/user-attachments/assets/057ca6a2-8ca2-400c-b92b-9ed585ae2e79)

## 🚀 Features

- **15 MCP Tools** for comprehensive vulnerability research
- **Real server-side filtering** using Solodit's native API
- **Caching system** for improved performance
- **Input validation** and sanitization
- **UI-matching filters** that replicate Solodit's interface
- **Statistical analysis** and reporting
- **Multiple sorting options** and pagination

## 📡 Server Endpoints

The server exposes the following HTTP endpoints:

### **Primary Endpoints**
- **`POST /mcp`** - Main MCP protocol endpoint for tool interactions
- **`GET /`** - Root endpoint with server info and available tools
- **`GET /health`** - Health check endpoint with server status

### **Endpoint Details**

#### `POST /mcp`
The main MCP endpoint where all tool interactions happen. Your MCP client should connect to this endpoint.

#### `GET /` 
Returns comprehensive server information:
```json
{
  "name": "Solodit MCP Server",
  "version": "0.3.0",
  "description": "MCP server for searching and retrieving vulnerability reports from Solodit with UI-matching filters",
  "endpoints": {
    "mcp": "/mcp",
    "health": "/health"
  },
  "tools": [...15 available tools...],
  "features": [...server capabilities...]
}
```

#### `GET /health`
Health check endpoint:
```json
{
  "status": "healthy",
  "version": "0.3.0", 
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🛠️ Available MCP Tools

### **Basic Search Tools**

#### 1. **`search`**
- **Description**: Basic keyword search for vulnerability reports
- **Input**: `{ "keywords": "your search terms", "page": 1 }`
- **Output**: Array of matching vulnerability reports

#### 2. **`get-by-slug`**
- **Description**: Retrieve specific report by its slug identifier
- **Input**: `{ "slug": "report-slug-identifier" }`
- **Output**: Full report content and metadata

### **Filtering Tools**

#### 3. **`filter-by-impact`**
- **Description**: Filter reports by impact level (HIGH/MEDIUM/LOW/GAS)
- **Input**: `{ "impact": ["HIGH", "MEDIUM"], "page": 1 }`
- **Output**: Filtered reports by impact severity

#### 4. **`get-by-protocol`**
- **Description**: Search reports for specific protocols (client-side filtering)
- **Input**: `{ "protocol_name": "Uniswap", "page": 1 }`
- **Output**: Reports related to the specified protocol

#### 5. **`get-by-firm`**
- **Description**: Search reports from specific audit firms
- **Input**: `{ "firm_name": "Trail of Bits", "page": 1 }`
- **Output**: Reports from the specified audit firm

### **Advanced Search Tools**

#### 6. **`advanced-search`**
- **Description**: Multi-criteria search with sorting options
- **Input**: `{ "keywords": "reentrancy", "impact": ["HIGH"], "sort_by": "date", "page": 1 }`
- **Output**: Advanced filtered and sorted results

#### 7. **`enhanced-filter`**
- **Description**: Enhanced filtering matching Solodit's UI filters
- **Input**: `{ "impact": ["HIGH"], "tags": ["Access Control"], "page": 1 }`
- **Output**: UI-matching filtered results

#### 8. **`search-with-ui-filters`**
- **Description**: Complete UI experience replication with all filters
- **Input**: `{ "keywords": "flash loan", "impact": ["HIGH"], "firms": ["OpenZeppelin"] }`
- **Output**: Complete filtered search results

### **Discovery Tools**

#### 9. **`get-categories-and-tags`**
- **Description**: Discover available categories, tags, and metadata
- **Input**: `{ "include_counts": true }`
- **Output**: Available filters, tags, categories, and usage statistics

#### 10. **`get-stats`**
- **Description**: Statistical analysis of vulnerability reports
- **Input**: `{ "include_trends": true }`
- **Output**: Comprehensive statistics and trends

### **🔥 Real Server-Side Filtering Tools**

These tools use Solodit's native API for true server-side filtering (not client-side):

#### 11. **`real-protocol-search`**
- **Description**: Real server-side protocol search using Solodit's native API
- **Input**: `{ "protocol_name": "chakra", "page": 1 }`
- **Output**: Server-side filtered protocol results
- **Advantage**: Faster, more accurate, uses Solodit's actual filtering

#### 12. **`real-author-search`**
- **Description**: Real server-side author search using Solodit's native API  
- **Input**: `{ "author_name": "calc1f4r", "page": 1 }`
- **Output**: Server-side filtered author results
- **Advantage**: Native user/author filtering

#### 13. **`real-tags-search`**
- **Description**: Real server-side tag search using Solodit's native API
- **Input**: `{ "tags": ["1/64 Rule", "51% Attack"], "page": 1 }`
- **Output**: Server-side filtered tag results
- **Common Tags**: "1/64 Rule", "51% Attack", "ABI Encoding", "Account Abstraction", "Access Control", "Admin Privilege", "Arbitrage", "Array Bounds", "Auction", "Authority", "Backdoor", "Bridge"

#### 14. **`real-forked-search`**
- **Description**: Real server-side forked protocol search
- **Input**: `{ "forked_protocols": ["Uniswap V2", "Compound"], "page": 1 }`
- **Output**: Server-side filtered forked protocol results
- **Use Case**: Find vulnerabilities in protocols forked from specific base protocols

#### 15. **`ultra-advanced-search`** 🔥
- **Description**: Ultimate search tool combining ALL real server-side filters
- **Input**: 
```json
{
  "keywords": "reentrancy",
  "author": "calc1f4r", 
  "protocol": "uniswap",
  "tags": ["Access Control", "Reentrancy"],
  "forked_from": ["Uniswap V2"],
  "impact": ["HIGH", "MEDIUM"],
  "min_finders": 1,
  "max_finders": 5,
  "sort_field": "Recency",
  "sort_direction": "Desc",
  "page": 1
}
```
- **Output**: Comprehensive server-side filtered results
- **Advantage**: Most powerful search tool with native Solodit API filtering

## 🚀 Quick Start

### Using NPX (Recommended)
```bash
npx @lyuboslavlyubenov/solodit-mcp
```

### Using Docker
```bash
docker run -p 3000:3000 lyuboslavl/solodit-mcp:latest
```

### Local Development
```bash
# Install dependencies
npm install -g pnpm && pnpm install

# Build and run
pnpm build && node dist/index.js
```

## 🔧 MCP Client Configuration

Add this to your MCP client configuration:

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "solodit-mcp": {
      "command": "npx",
      "args": ["@lyuboslavlyubenov/solodit-mcp"]
    }
  }
}
```

### HTTP MCP Client (`mcp.json`)
```json
{
  "mcpServers": {
    "solodit-mcp": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```



## 🔍 Example Usage

### Basic Search
```javascript
// Search for reentrancy vulnerabilities
{
  "tool": "search",
  "input": { "keywords": "reentrancy", "page": 1 }
}
```
