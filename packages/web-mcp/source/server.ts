import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

import type {ToolAnnotations} from '@modelcontextprotocol/sdk/types.js';

import {BrowserPostMessageTransport} from './transport.ts';

export {BrowserPostMessageTransport};

export interface BrowserMCPServerImplementation {
  name: string;
  version: string;
  tools: {
    name: string;
    description?: string;
    params?: unknown;
    annotations?: ToolAnnotations;
    execute?: string;
  }[];
}

export const MCP_SERVER_IMPLEMENTATION_SCRIPT_TAG_TYPE =
  'application/mcp-server-implementation';

export class BrowserMCPServer extends McpServer {
  constructor({
    transport,
  }: {
    transport?: ConstructorParameters<typeof BrowserPostMessageTransport>[1];
  } = {}) {
    // TODO: listen for changes, update tools/ resources as needed
    const implementationElement = document.querySelector<HTMLScriptElement>(
      `script[type=${JSON.stringify(MCP_SERVER_IMPLEMENTATION_SCRIPT_TAG_TYPE)}]`,
    );
    const implementation = implementationElement
      ? JSON.parse(implementationElement.textContent ?? '{}')
      : null;

    super({
      name: implementation?.name ?? 'browser-mcp-server',
      version: implementation?.version ?? '1.0.0',
    });

    for (const tool of implementation?.tools ?? []) {
      this.tool(
        tool.name,
        tool.description,
        tool.params,
        tool.annotations,
        makeExecutable(tool.execute),
      );
    }

    // TODO: this uses a promise, do we need to wait for it?
    this.connect(new BrowserPostMessageTransport(window, transport));
  }
}

// Split string on every property access, and call the resulting keypath
// from globalThis (e.g., `Shopify["foo-bar"].checkout.create` should become
// a function that calls that property)
function makeExecutable(execute: string) {
  const keypath = execute
    // Convert ["prop"] to .prop
    .replace(/\[["']([^"']+)["']\]/g, '.$1')
    .split('.')
    // Remove empty segments from leading/trailing dots
    .filter(Boolean);

  const method = keypath.pop()!;

  return async (...args: any[]) => {
    const obj = keypath.reduce(
      (current, key) => (current as any)[key],
      globalThis,
    );

    if (
      typeof obj !== 'object' ||
      obj === null ||
      typeof (obj as any)[method] !== 'function'
    ) {
      throw new Error(
        `Browser MCP configuration error: no method found (looked for ${execute})`,
      );
    }

    const result = await (obj as any)[method](...args);

    return result;
  };
}
