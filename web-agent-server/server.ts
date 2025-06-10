import {randomUUID} from 'node:crypto';

import {z} from 'zod';
import {Hono} from 'hono';
import {serve, type HttpBindings} from '@hono/node-server';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {isInitializeRequest} from '@modelcontextprotocol/sdk/types.js';

interface Bindings extends HttpBindings {}

const app = new Hono<{Bindings: Bindings}>();

// Health check
app.get('/.internal/pulse', (c) => {
  return c.json({
    timestamp: new Date().toISOString(),
    version: '0.0.0',
  });
});

const TRANSPORTS = new Map<string, StreamableHTTPServerTransport>();

// MCP
app.post('/mcp', async (c) => {
  let jsonPromise: Promise<unknown> | undefined;
  const getRequestJSON = async () => {
    jsonPromise ??= c.req.json();
    const json = await jsonPromise;
    return json;
  };

  // Check for existing session ID
  const sessionID = c.req.header('MCP-Session-ID');
  let transport: StreamableHTTPServerTransport;

  if (sessionID && TRANSPORTS.has(sessionID)) {
    transport = TRANSPORTS.get(sessionID)!;
  } else if (!sessionID && isInitializeRequest(await getRequestJSON())) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionID) => {
        TRANSPORTS.set(sessionID, transport);
      },
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        TRANSPORTS.delete(transport.sessionId);
      }
    };

    const server = new McpServer(
      {
        name: 'web-agent-server',
        version: '0.0.0',
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
        },
      },
    );

    // ... set up server resources, tools, and prompts ...
    server.tool(
      'browser_navigate',
      'Navigate to a URL',
      {
        url: z.string(),
      },
      ({url}) => {
        console.log({url});

        return {
          content: [{type: 'text', text: `Navigating to ${url}`}],
        };
      },
    );

    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    return c.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      },
      {status: 400},
    );
  }

  await transport.handleRequest(
    c.env.incoming,
    c.env.outgoing,
    await getRequestJSON(),
  );

  // Without this, Hono tries to send the response before `transport.handleRequest`
  // has actually finished writing headers.
  await new Promise((resolve) => {
    c.env.incoming.on('close', resolve);
  });
});

const PORT = Number(process.env.PORT || 3000);
serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info: {port: number}) => {
    console.log(`MCP Server running on port ${info.port}`);
  },
);
