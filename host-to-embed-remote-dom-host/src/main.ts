import {
  RemoteElement,
  RemoteMutationObserver,
  type RemoteConnection,
} from '@remote-dom/core/elements';

import {ThreadIframe, ThreadWindow} from '@quilted/threads';

class ExtensionButton extends RemoteElement {
  static get remoteEvents() {
    return ['click'];
  }
}

class ExtensionStack extends RemoteElement {
  static get remoteAttributes() {
    return ['gap'];
  }
}

customElements.define('extension-button', ExtensionButton);
customElements.define('extension-stack', ExtensionStack);

interface PageAPI {
  connect(connections: Record<string, RemoteConnection>): Promise<void>;
}

class ExtensionEmbed extends HTMLElement {
  static get observedAttributes() {
    return ['src'];
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'src') {
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
    return this.shadowRoot!.querySelector('iframe')!;
  }

  readonly #api: PageAPI = {
    connect: async (connections) => {
      const slots = this.shadowRoot!.querySelectorAll('slot');
      const slotsByName = new Map(
        Array.from(slots).map((slot) => [slot.name!, slot]),
      );

      for (const [name, slot] of slotsByName.entries()) {
        const element = slot.assignedElements()?.[0];
        const connection = connections[name];

        if (!element || !connection) continue;

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

      <slot name="header"></slot>
      <slot name="footer"></slot>

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

customElements.define('extension-embed', ExtensionEmbed);

const now = Date.now();
const embed = document.querySelector<ExtensionEmbed>('extension-embed')!;
const renderedAgo = embed.querySelector('#extension-rendered-ago')!;

setInterval(() => {
  const seconds = Math.round((Date.now() - now) / 1000);
  renderedAgo.textContent = seconds === 1 ? `1 second` : `${seconds} seconds`;
}, 1000);

let count = 0;
const countText = embed.querySelector('#extension-button-count')!;
const button = embed.querySelector('extension-button')!;

button.addEventListener('click', () => {
  count += 1;
  countText.textContent = `clicked ${count === 1 ? `1 time` : `${count} times`}`;
});

const openAsPopupButton =
  document.querySelector<HTMLButtonElement>('#open-as-popup')!;

openAsPopupButton.addEventListener('click', () => {
  embed.open();
});
