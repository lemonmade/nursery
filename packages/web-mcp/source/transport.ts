import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';

export class BrowserPostMessageTransport implements Transport {
  #onError: Transport['onerror'];
  #onMessage: Transport['onmessage'];
  #onClose: Transport['onclose'];
  readonly #target: Window;
  readonly #targetOrigin: string;
  readonly #filter: (event: MessageEvent) => boolean;

  constructor(
    target: Window,
    {
      targetOrigin = '*',
      filter = () => true,
    }: {targetOrigin?: string; filter?(event: MessageEvent): boolean} = {},
  ) {
    this.#target = target;
    this.#targetOrigin = targetOrigin;
    this.#filter = filter;
  }

  // eslint-disable-next-line compat/compat
  readonly #abortController = new AbortController();

  get onerror() {
    return this.#onError;
  }

  set onerror(value: Transport['onerror']) {
    this.#onError = value;
  }

  get onmessage() {
    return this.#onMessage;
  }

  set onmessage(value: Transport['onmessage']) {
    this.#onMessage = value;
  }

  get onclose() {
    return this.#onClose;
  }

  set onclose(value: Transport['onclose']) {
    this.#onClose = value;
  }

  async start() {
    window.addEventListener(
      'message',
      (event) => {
        const {data} = event;

        if (
          !this.#filter(event) ||
          event.source !== this.#target ||
          data == null ||
          typeof data !== 'object' ||
          data.jsonrpc !== '2.0' ||
          typeof data.method !== 'string' ||
          !new Set(['string', 'number']).has(typeof data.id)
        ) {
          return;
        }

        this.#onMessage?.(data);
      },
      {
        signal: this.#abortController.signal,
      },
    );
  }

  async close() {
    this.#abortController.abort();
  }

  async send(message: unknown) {
    this.#target?.postMessage(message, this.#targetOrigin);
  }
}
