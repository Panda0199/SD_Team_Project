// This file lets an AI agent use your product. Start it with: npm run mcp
// Session 8 replaces the search_items stub with one real feature of your product.
import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'our-product', version: '0.1.0' });

server.registerTool(
  'product_statement',
  {
    description: 'Returns the one-sentence product statement and the baseline metric from docs/PRODUCT.md',
    inputSchema: {},
  },
  async () => ({ content: [{ type: 'text', text: readFileSync('docs/PRODUCT.md', 'utf8') }] }),
);

// Stub until session 8. Replace the text below with a real search in your product's data.
server.registerTool(
  'search_items',
  { description: 'Search the product data. Stub until session 8.', inputSchema: { query: z.string() } },
  async ({ query }) => ({ content: [{ type: 'text', text: `No data yet for "${query}". Connect this to your product's data in session 8.` }] }),
);

await server.connect(new StdioServerTransport());
