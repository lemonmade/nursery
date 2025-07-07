import type {RemoteConnection} from '@remote-dom/core';
import {RemoteMutationObserver} from '@remote-dom/core/elements';

let id = 0;

export class RemoteSlotObserver {
  #controller: AbortController | undefined;
  #slotState = new Map<
    string,
    {
      slot: HTMLSlotElement;
      observer: RemoteMutationObserver;
    }
  >();
  #connections = new Map<string, RemoteConnection>();
  #id = id++;
  #observed = new Set<Node>();

  connect(connections: Record<string, RemoteConnection>) {
    for (const [id, connection] of Object.entries(connections)) {
      this.#connections.set(id, connection);
    }

    for (const node of this.#observed) {
      if (typeof (node as any).querySelectorAll !== 'function') continue;

      for (const slot of (node as Element).querySelectorAll('slot')) {
        this.#updateSlot(slot);
      }
    }
  }

  observe(node: Node) {
    this.#observed.add(node);
    this.#controller =
      this.#controller && !this.#controller.signal.aborted
        ? this.#controller
        : new AbortController();

    this.#controller.signal.addEventListener('abort', () => {
      for (const {observer} of this.#slotState.values()) {
        observer.disconnect();
      }
    });

    node.addEventListener(
      'slotchange',
      (event) => {
        this.#updateSlot(event.target as HTMLSlotElement);
      },
      {
        signal: this.#controller.signal,
      },
    );
  }

  disconnect() {
    this.#controller?.abort();
  }

  #updateSlot(slot: HTMLSlotElement) {
    let state = this.#slotState.get(slot.name);

    if (!state) {
      const connection = this.#connections.get(slot.name);
      if (!connection) return;

      state = {
        slot,
        observer: new RemoteMutationObserver(connection),
      };

      this.#slotState.set(slot.name, state);
    }

    const {observer} = state;

    const elements = slot.assignedElements();

    // TODO: handle more complex re-ordering changes
    if (elements.length === 0) {
      observer.disconnect({empty: true});
    } else {
      for (const [index, child] of Object.entries(elements)) {
        observer.observe(child, {id: `SlotObserver:${this.#id}:${index}`});
      }
    }
  }
}
