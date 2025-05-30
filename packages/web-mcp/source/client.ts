import {Client} from '@modelcontextprotocol/sdk/client/index.js';

import {BrowserPostMessageTransport} from './transport.ts';

export {BrowserPostMessageTransport};

export class BrowserMCPClient extends Client {
  constructor(
    target: HTMLIFrameElement,
    {
      name,
      version,
      transport,
    }: {
      name?: string;
      version?: string;
      transport?: ConstructorParameters<typeof BrowserPostMessageTransport>[1];
    } = {},
  ) {
    super({
      name: name ?? 'browser-mcp-client',
      version: version ?? '1.0.0',
    });

    this.connect(
      new BrowserPostMessageTransport(target.contentWindow!, transport),
    );
  }
}

export class BrowserMCPServerElement extends HTMLElement {
  client!: BrowserMCPClient;

  // TODO
  //   static get observedAttributes() {
  //     return ['src'];
  //   }

  connectedCallback() {
    const iframe = document.createElement('iframe');
    iframe.src = this.getAttribute('src')!;
    this.append(iframe);

    this.client = new BrowserMCPClient(iframe, {
      name: this.getAttribute('name') ?? this.dataset.mcpName ?? undefined,
      version:
        this.getAttribute('version') ?? this.dataset.mcpVersion ?? undefined,
    });
  }
}
