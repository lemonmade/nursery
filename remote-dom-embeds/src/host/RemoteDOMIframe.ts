import {RemoteMutationObserver} from '@remote-dom/core/elements';
import {ThreadIframe, ThreadWindow} from '@quilted/threads';

import type {HostAPI} from '../rpc.ts';

export class RemoteDOMIframe extends HTMLElement {
  static get observedAttributes() {
    return ['src'];
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'src' && this.#iframe) {
      this.#iframe.src = newValue;
    }
  }

  get src(): string {
    return this.getAttribute('src') ?? '';
  }

  set src(value: string | null | undefined) {
    if (value) {
      this.setAttribute('src', value);
    } else {
      this.removeAttribute('src');
    }
  }

  get #iframe() {
    return this.shadowRoot?.querySelector('iframe')!;
  }

  readonly #api: HostAPI = {
    connect: async (connections) => {
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

        const element = slot.assignedElements()?.[0];
        if (!element) continue;

        const observer = new RemoteMutationObserver(connection);
        observer.observe(element);
      }
    },
  };

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
  
          iframe {
            width: 100%;
            height: 100%;
          }
        </style>
  
        <iframe></iframe>
      `;

    const iframe = this.#iframe;
    iframe.src = this.src;
    new ThreadIframe(iframe, {exports: this.#api});
  }

  open() {
    const popup = window.open(
      this.src,
      'extensible-embed-popup',
      'width=400,height=400',
    )!;

    new ThreadWindow(popup, {exports: this.#api});
  }
}
