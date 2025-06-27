import {ThreadIframe} from '@quilted/threads';
import {RemoteElement} from '@remote-dom/core/elements';

import type {HostAPI} from './embed/rpc.ts';
import {RemoteSlotObserver} from './remote-dom/RemoteSlotObserver.ts';

export class CheckoutEmbed extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'});

    this.shadowRoot!.innerHTML = `
      <style>
        slot {
          display: none;
        }

        iframe {
          width: 100%;
          height: 600px;
          border: none;
        }
      </style>
      <slot name="header"></slot>
      <slot name="footer"></slot>
      <iframe src="/embed"></iframe>
    `;

    const iframe = this.shadowRoot!.querySelector('iframe')!;

    const observer = new RemoteSlotObserver();
    observer.observe(this.shadowRoot!);

    ThreadIframe.export<HostAPI>(iframe, {
      connect: async (connections) => {
        observer.connect(connections);
      },
    });
  }
}

customElements.define('c-embed', CheckoutEmbed);

export class CheckoutExtensionButton extends RemoteElement {
  static remoteEvents = ['click'];
}

customElements.define('cx-button', CheckoutExtensionButton);

export class CheckoutExtensionStack extends RemoteElement {
  static remoteAttributes = ['gap'];
}

customElements.define('cx-stack', CheckoutExtensionStack);
