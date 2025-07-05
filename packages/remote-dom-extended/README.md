# `@lemonmade/remote-dom-extended`

## `<remote-dom>`

A custom element that lets you easily connect a tree of HTML elements to a remote environment:

```html
<remote-dom>
  <remote-banner tone="friendly">Hello, from the embedder!</my-embed-banner>
</remote-dom>

<script type="module">
  import {RemoteDOM} from '@lemonmade/remote-dom-extended';
  import {ThreadWorker} from '@quilted/threads';

  customElements.define('remote-dom', RemoteDOM);

  const root = document.querySelector('remote-dom');
  const worker = new Worker('/embed.js');
  ThreadWorker.export(worker, {
    connect(connection) {
      root.connect(connection);
    },
  });

  // Inside /embed.js...
  // import {RemoteReceiver} from '@remote-dom/core/receivers';
  // import {ThreadWorker} from '@quilted/threads';

  // const receiver = new RemoteReceiver();

  // const {connect} = ThreadWorker.import(self);

  // connect(receiver.connection);
</script>
```

## `RemoteSlotObserver`

This class lets you observe the slots of a particular custom element, and automatically translate some set of those slots to a remote environment. This can be useful if, for example, you provide a custom element that renders an embedded iframe or popup, and want to allow the embedder to provide some content that you inline in your UI, with the safety of Remote DOM’s allowlisted synchronization system.

Start by defining a custom element that will allow slotted remote content:

```js
class MyEmbed extends HTMLElement {
  connectedCallback() {
    this.attachShadow({mode: 'open'});

    this.shadowRoot.innerHTML = `
      <iframe src="https://my-embed.com/embed"></iframe>
    `;
  }
}

customElements.define('my-embed', MyEmbed);
```

Next, add slots to the element’s shadow root for content you will transfer using Remote DOM, and observe those slots with `RemoteSlotObserver`. You’ll want to make sure to hide any slots visually, as the elements that are slotted into your element are just a description of the actual UI you will render in your embed:

```js
import {RemoteSlotObserver} from '@lemonmade/remote-dom-extended';

class MyEmbed extends HTMLElement {
  #slotObserver = new RemoteSlotObserver();

  connectedCallback() {
    this.attachShadow({mode: 'open'});

    this.shadowRoot.innerHTML = `
      <style>
        /* don’t actually render the slot inline, we’ll handle that in the remote environment */
        slot[name="announcement"] {
          display: none;
        }
      </style>
      <slot name="announcement"></slot>
      <iframe src="https://my-embed.com/embed"></iframe>
    `;

    this.#slotObserver.observe(this);
  }

  disconnectedCallback() {
    this.#slotObserver.disconnect();
  }
}

customElements.define('my-embed', MyEmbed);
```

Your remote environment will need to provide a mapping of slot names to `RemoteConnection` objects that allow the `RemoteSlotObserver` to transfer the content of those slots to the remote environment. Here, we’ll use `@quilted/threads` to create an RPC connection to the remote environment:

```js
import {ThreadIframe} from '@quilted/threads';
import {RemoteSlotObserver} from '@lemonmade/remote-dom-extended';

class MyEmbed extends HTMLElement {
  #slotObserver = new RemoteSlotObserver();

  connectedCallback() {
    this.attachShadow({mode: 'open'});

    this.shadowRoot.innerHTML = `
      <style>
        /* don’t actually render the slot inline, we’ll handle that in the remote environment */
        slot[name="announcement"] {
          display: none;
        }
      </style>
      <slot name="announcement"></slot>
      <iframe src="https://my-embed.com/embed"></iframe>
    `;

    this.#slotObserver.observe(this);

    ThreadIframe.export(this.shadowRoot.querySelector('iframe'), {
      connect(connections) {
        this.#slotObserver.connect({announcement: connections.announcement});
      },
    });
  }

  disconnectedCallback() {
    this.#slotObserver.disconnect();
  }
}

customElements.define('my-embed', MyEmbed);
```

In your embed, you will need to send `RemoteConnection` objects that are hooked up to render any remote content sent by the embedder. In the example above, you might use the basic `RemoteReceiver`, and then use `@quilted/threads` to send its `RemoteConnection` to the embedder:

```html
<!-- Inside /embed... -->
<script type="module">
  import {RemoteReceiver} from '@remote-dom/core/receivers';
  import {ThreadIframe} from '@quilted/threads';

  const {connect} = ThreadIframe.parent.import();

  const receiver = new RemoteReceiver();

  connect({
    announcement: receiver.connection,
  });
</script>
```

Finally, you need to define remote elements for the embedder to use. You can do this with a manually-constructed custom element, but it’s easiest to use the `RemoteElement` class from Remote DOM:

```js
import {RemoteElement} from '@remote-dom/core/elements';

class MyEmbedBanner extends RemoteElement {
  static remoteAttributes = ['tone'];
}

customElements.define('my-embed-banner', MyEmbedBanner);
```

Now, a consumer can import your library, render your custom element, and provide their own content that is magically transferred to be rendered safely inside your embedded iframe:

```html
<script type="module" src="https://my-embed.com/embed.js"></script>

<my-embed>
  <my-embed-banner slot="announcement" tone="friendly">
    Hello, from the embedder!
  </my-embed-banner>
</my-embed>
```
