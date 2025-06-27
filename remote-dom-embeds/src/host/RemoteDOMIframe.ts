import {
  MUTATION_TYPE_REMOVE_CHILD,
  ROOT_ID,
  type RemoteMutationRecordRemoveChild,
} from '@remote-dom/core';
import {
  RemoteMutationObserver,
  type RemoteConnection,
} from '@remote-dom/core/elements';

export class RemoteDOM extends HTMLElement {
  #observer: RemoteMutationObserver | undefined;

  connect(connection: RemoteConnection) {
    this.#observer = new RemoteMutationObserver(connection);
    this.#observer.observe(this);
    return this.#observer;
  }
}

export class RemoteDOMSlots extends HTMLElement {
  #context = new WeakMap<
    HTMLSlotElement,
    {element?: HTMLElement; observer: RemoteMutationObserver}
  >();

  connectedCallback() {
    this.attachShadow({mode: 'open'});

    this.shadowRoot!.innerHTML = `
      <style>
        :host {
          display: block;
        }

        slot {
          display: none;
        }
      </style>
    `;

    this.shadowRoot!.addEventListener('slotchange', (event) => {
      const slot = event.target as HTMLSlotElement;
      const contextForSlot = this.#context.get(slot);
      if (!contextForSlot) return;

      const {element: oldElement, observer} = contextForSlot;
      const element = slot.assignedElements()?.[0] as HTMLElement | undefined;

      this.#context.set(slot, {
        element,
        observer,
      });

      observer.disconnect();

      for (const _ of oldElement?.childNodes ?? []) {
        observer.connection.mutate([
          [
            MUTATION_TYPE_REMOVE_CHILD,
            ROOT_ID,
            0,
          ] satisfies RemoteMutationRecordRemoveChild,
        ]);
      }

      if (element) {
        observer.observe(element);
      }
    });
  }

  connect(connections: Record<string, RemoteConnection>) {
    const slots = this.shadowRoot!.querySelectorAll('slot');
    const slotsByName = new Map(
      Array.from(slots).map((slot) => [slot.name!, slot]),
    );

    for (const [name, connection] of Object.entries(connections)) {
      let slot = slotsByName.get(name);
      if (!slot) {
        slot = document.createElement('slot');
        slot.name = name;
        this.shadowRoot!.append(slot);
        slotsByName.set(name, slot);
      }

      const element = slot.assignedElements()?.[0] as HTMLElement | undefined;
      if (!element) continue;

      if (element instanceof RemoteDOM) {
        const observer = element.connect(connection);
        this.#context.set(slot, {
          element,
          observer,
        });
      } else {
        const observer = new RemoteMutationObserver(connection);
        observer.observe(element);
        this.#context.set(slot, {
          element,
          observer,
        });
      }
    }
  }
}
