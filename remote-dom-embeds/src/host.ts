import {ThreadIframe} from '@quilted/threads';
import {ExtensionButton, ExtensionStack} from './host/component-library.ts';
import {RemoteDOM, RemoteDOMSlots} from './host/RemoteDOMIframe.ts';
import type {HostAPI} from './rpc.ts';

customElements.define('extension-button', ExtensionButton);
customElements.define('extension-stack', ExtensionStack);
customElements.define('remote-dom', RemoteDOM);
customElements.define('remote-dom-slots', RemoteDOMSlots);

const now = Date.now();
const iframe = document.querySelector('iframe')!;
const slots = document.querySelector<RemoteDOMSlots>('remote-dom-slots')!;

const renderedAgo = slots.querySelector('#extension-rendered-ago')!;

setInterval(() => {
  const seconds = Math.round((Date.now() - now) / 1000);
  renderedAgo.textContent = seconds === 1 ? `1 second` : `${seconds} seconds`;
}, 1000);

let count = 0;
const countText = slots.querySelector('#extension-button-count')!;
const button = slots.querySelector('extension-button')!;

button.addEventListener('click', () => {
  count += 1;
  countText.textContent = `clicked ${count === 1 ? `1 time` : `${count} times`}`;
});

ThreadIframe.export<HostAPI>(iframe, {
  connect: async (connections) => {
    slots.connect(connections);
  },
});
