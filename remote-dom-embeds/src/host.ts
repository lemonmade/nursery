import {ExtensionButton, ExtensionStack} from './host/component-library.ts';
import {RemoteDOMIframe} from './host/RemoteDOMIframe.ts';

customElements.define('extension-button', ExtensionButton);
customElements.define('extension-stack', ExtensionStack);
customElements.define('remote-dom-iframe', RemoteDOMIframe);

const now = Date.now();
const iframe = document.querySelector<RemoteDOMIframe>('remote-dom-iframe')!;
const renderedAgo = iframe.querySelector('#extension-rendered-ago')!;

setInterval(() => {
  const seconds = Math.round((Date.now() - now) / 1000);
  renderedAgo.textContent = seconds === 1 ? `1 second` : `${seconds} seconds`;
}, 1000);

let count = 0;
const countText = iframe.querySelector('#extension-button-count')!;
const button = iframe.querySelector('extension-button')!;

button.addEventListener('click', () => {
  count += 1;
  countText.textContent = `clicked ${count === 1 ? `1 time` : `${count} times`}`;
});

const openAsPopupButton =
  document.querySelector<HTMLButtonElement>('#open-as-popup')!;

openAsPopupButton.addEventListener('click', () => {
  iframe.open();
});
