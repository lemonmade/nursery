import type {RemoteConnection} from '@remote-dom/core';
import {RemoteMutationObserver} from '@remote-dom/core/elements';

export class RemoteDOM extends HTMLElement {
  #mutationObserver?: RemoteMutationObserver;

  connectedCallback() {
    this.#observe();
  }

  connect(connection: RemoteConnection) {
    this.#mutationObserver?.disconnect();
    this.#mutationObserver = new RemoteMutationObserver(connection);
    if (this.isConnected) this.#observe();
  }

  disconnect() {
    this.#mutationObserver?.disconnect();
  }

  #observe() {
    this.#mutationObserver?.observe(this, {
      id: this.getAttribute('remote-id') ?? undefined,
    });
  }
}
