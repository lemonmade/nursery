import {ThreadIframe} from '@quilted/threads';

import type {HostAPI} from '../rpc.ts';
import {RemoteDOM, RemoteDOMSlots} from './RemoteDOMIframe.ts';

customElements.define('remote-dom', RemoteDOM);
customElements.define('remote-dom-slots', RemoteDOMSlots);

export class Embed extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'});

    this.shadowRoot!.innerHTML = `
      <remote-dom-slots>
        <remote-dom slot="header">
          <slot name="header"></slot>
        </remote-dom>

        <remote-dom slot="footer">
          <slot name="footer"></slot>
        </remote-dom>
      </remote-dom-slots>

      <iframe src="/embed"></iframe>
    `;

    const iframe = this.shadowRoot!.querySelector('iframe')!;
    const slots =
      this.shadowRoot!.querySelector<RemoteDOMSlots>('remote-dom-slots')!;

    ThreadIframe.export<HostAPI>(iframe, {
      connect: async (connections) => {
        slots.connect(connections);
      },
    });
  }
}
