import {randomUUID} from 'node:crypto';

import {z} from 'zod';
import {Hono} from 'hono';
import {serve, type HttpBindings} from '@hono/node-server';
import {
  McpServer,
  RegisteredTool,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {isInitializeRequest} from '@modelcontextprotocol/sdk/types.js';
import {chromium, type Browser, type Page} from 'playwright';

interface Bindings extends HttpBindings {}

const app = new Hono<{Bindings: Bindings}>();

// Health check
app.get('/.internal/pulse', (c) => {
  return c.json({
    timestamp: new Date().toISOString(),
    version: '0.0.0',
  });
});

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
  let session = sessionID ? BrowserMCPSession.get(sessionID) : undefined;

  if (session == null) {
    if (!sessionID && isInitializeRequest(await getRequestJSON())) {
      session = await BrowserMCPSession.start();
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
  }

  await session.transport.handleRequest(
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

interface Agent {
  tools: {
    [Symbol.iterator](): Iterator<any>;
    addEventListener(event: string, handler: (event: any) => void): void;
    call(name: string, arg: any): Promise<any>;
  };
}

declare global {
  var __agent_playwright_update_tools:
    | ((tools: Array<{name: string; description?: string}>) => void)
    | undefined;

  var agent: Agent | undefined;
}

const SESSIONS = new Map<string, BrowserMCPSession>();

class BrowserMCPSession {
  readonly id: string;
  readonly server: BrowserMCPServer;
  readonly transport: BrowserMCPSessionTransport;
  readonly controller: BrowserPageMCPController;

  static get(id: string) {
    return SESSIONS.get(id);
  }

  static async start() {
    let session: BrowserMCPSession;

    const server = new BrowserMCPServer();
    const controller = await BrowserPageMCPController.start({server});
    const transport = new BrowserMCPSessionTransport(() => session);

    session = new BrowserMCPSession({transport, server, controller});

    await Promise.all([server.connect(transport), controller.ready]);

    return session;
  }

  constructor({
    server,
    transport,
    controller,
  }: {
    server: BrowserMCPServer;
    transport: BrowserMCPSessionTransport;
    controller: BrowserPageMCPController;
  }) {
    this.id = randomUUID();
    this.server = server;
    this.transport = transport;
    this.controller = controller;

    SESSIONS.set(this.id, this);
  }

  async close() {
    SESSIONS.delete(this.id);

    this.transport.close();
    await this.controller.page.close();
  }
}

class BrowserMCPSessionTransport extends StreamableHTTPServerTransport {
  constructor(session: () => BrowserMCPSession) {
    super({
      sessionIdGenerator: () => session().id,
    });

    this.onclose = () => {
      if (this.sessionId) {
        SESSIONS.get(this.sessionId)?.close();
      }
    };
  }
}

class BrowserMCPServer extends McpServer {
  constructor() {
    super(
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
  }
}

class BrowserPageMCPController {
  readonly page: Page;
  readonly ready: Promise<void>;
  readonly tools = new Map<string, RegisteredTool>();
  readonly #server: McpServer;

  static async start({server}: {server: McpServer}) {
    const page = await getPlaywrightPage();
    const controller = new BrowserPageMCPController(page, {server});
    return controller;
  }

  constructor(page: Page, {server}: {server: McpServer}) {
    this.page = page;
    this.#server = server;

    page.on('request', async (request) => {
      if (request.isNavigationRequest()) {
        this.#updateTools([]);
      }
    });

    // Set up post-navigation event listener
    page.on('load', async () => {
      console.log('[PLAYWRIGHT: Navigation] Page load completed');

      await page.evaluate(async () => {
        const agent = globalThis.agent?.tools
          ? globalThis.agent
          : await new Promise<Agent>((resolve) => {
              addEventListener('agent-connection-start', (event) => {
                resolve((event as any).connection);
              });
            });

        const initialTools = Array.from(agent.tools).map((tool: any) => {
          return {name: tool.name, description: tool.description};
        });
        window.__agent_playwright_update_tools?.(initialTools);

        // TODO: listen for updates
        agent.tools.addEventListener('update-tools', (event) => {
          console.log(`[PLAYWRIGHT: tool-update]`, event);
          const tools = Array.from(agent.tools).map((tool: any) => {
            return {name: tool.name, description: tool.description};
          });
          window.__agent_playwright_update_tools?.(tools);
        });
      });
    });

    this.ready = (async () => {
      try {
        await page.exposeFunction(
          '__agent_playwright_update_tools',
          (tools: any[]) => this.#updateTools(tools),
        );
      } catch {}
    })();

    server.tool(
      'browser_navigate',
      'Navigate to a URL',
      {
        url: z.string(),
      } as any,
      async ({url}: {url: string}) => {
        try {
          // Navigate to URL
          await page.goto(url);
          const title = await page.title();

          return {
            content: [
              {
                type: 'text',
                text: `Successfully navigated to ${url}\nPage title: ${title}`,
              },
            ],
          };
        } catch (error) {
          console.error('Browser navigation error:', error);
          return {
            content: [
              {
                type: 'text',
                text: `Failed to navigate to ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          };
        }
      },
    );
  }

  #updateTools(tools: any[]) {
    for (const tool of this.tools.values()) {
      tool.remove();
    }

    this.tools.clear();

    console.log(`[PLAYWRIGHT: update-tools]`, tools);

    for (const tool of tools) {
      const registeredTool = this.#server.tool(
        tool.name,
        tool.description ?? '',
        async (...args) => {
          const arg = args.length === 1 ? undefined : args[0];

          const result = await this.page.evaluate(
            ([tool, arg]) => globalThis.agent?.tools.call(tool.name, arg),
            [tool, arg],
          );
          return result;
        },
      );

      this.tools.set(tool.name, registeredTool);
    }

    this.#server.sendToolListChanged();
  }
}

let browserPromise: Promise<Browser> | undefined;

async function getPlaywrightPage() {
  // Create browser instance if it doesn't exist
  browserPromise ??= chromium.launch({
    headless: false,
  });

  const browser = await browserPromise;
  const page = await browser.newPage();

  return page;
}
