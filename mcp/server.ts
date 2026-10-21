// This file lets an AI agent use your product. Start it with: npm run mcp
// Session 8 replaces the search_items stub with one real feature of your product.
import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { searchProductItems } from './search.js';

const server = new McpServer({ name: 'our-product', version: '0.1.0' });

server.registerTool(
  'product_statement',
  {
    description: 'Returns the one-sentence product statement and the baseline metric from docs/PRODUCT.md',
    inputSchema: {},
  },
  async () => ({ content: [{ type: 'text', text: readFileSync('docs/PRODUCT.md', 'utf8') }] }),
);

server.registerTool(
  'search_items',
  {
    description: 'Search Quickly fictional course conversations by course, instructor, or message text.',
    inputSchema: { query: z.string().trim().min(1).describe('A phrase to find in fictional course and conversation data.') },
  },
  async ({ query }) => ({
    content: [{ type: 'text', text: JSON.stringify(searchProductItems(query), null, 2) }],
  }),
);

await server.connect(new StdioServerTransport());
