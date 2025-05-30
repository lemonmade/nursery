# `@lemonmade/web-mcp`

## Installation

```bash
# npm:
npm install @lemonmade/web-mcp --save
# pnpm:
pnpm add @lemonmade/web-mcp
```

## Usage

### Client (embedding web page)

This library provides a client implementation that can wrap around an embedded iframe that contains the MCP “server” page. The simplest way to set this up is to load the following CDN script, and to include a `browser-mcp-server` custom element to render the iframe element that contains the server page:

```html
<script type="module" src="https://web-mcp.com/client.js"></script>

<browser-mcp-server
  src="https://my-app.com/page-with-mcp-server"
></browser-mcp-server>

<script type="module">
  const server = document.querySelector('browser-mcp-server');

  // `client` is a class that extends the `@modelcontextprotocol/sdk`
  // `Client` class, which includes methods like `callTool` that allow
  // us to execute our MCP server
  const client = server.client;

  const result = await client.callTool({
    name: 'submit',
    arguments: {name: 'Winston'},
  });
</script>
```

If you prefer not to load a CDN script, you can instead import the `BrowserMCPClient` class, and manually construct it around an existing `iframe` element:

```ts
import {BrowserMCPClient} from '@lemonmade/web-mcp/client';

const iframe = document.querySelector('iframe');
const client = new BrowserMCPClient(iframe);
```

### Server (embedded web page)

On the embedded web page, you must use this library to initialize the MCP server. Like on the client, you can do this automatically by loading the following CDN script:

```html
<script type="module" src="https://web-mcp.com/server.js"></script>
```

Alternatively, you can import the `BrowserMCPServer` class, and manually construct it:

```ts
import {BrowserMCPServer} from '@lemonmade/web-mcp/server';

const server = new BrowserMCPServer();
```

In both cases, the MCP server will look for a `script` element on the page with the type `application/mcp-server-implementation`, which should contain a JSON blob that describes the MCP server. That JSON should match the `BrowserMCPServerImplementation` interface from `@lemonmade/web-mcp/server`, which includes basic server metadata and the list of tools your page implements.

```html
<script type="application/mcp-server-implementation">
  {
    "name": "My MCP Server",
    "version": "1.0.0",
    "tools": [
      {
        "name": "submit",
        "description": "Submits the form, optionally providing some override values for the form fields",
        "execute": "Page.submit",
        "params": {
          "overrideValues": {
            "type": "object",
            "properties": {
              "name": {type: "string"},
            }
          }
        },
      }
    ]
  }
</script>
```

Importantly, each tool may have an `execute` property set to a string, which points to a globally-accessible method that will be called when that tool is invoked. These methods can be exposed directly on the global object (e.g., `execute: 'myToolFunction'`), or it can be a keypath to a nested method accessible from the global object (e.g., `execute: 'Shopify.submitCheckout'`). If no `execute` property is set, the implementation is assumed to live on `globalThis.mcpServer`, with the method name matching the tool name. Each tool can also have a `params` property, which is a JSON schema that describes the parameters that the tool accepts.
