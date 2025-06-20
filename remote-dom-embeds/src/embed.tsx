import {render} from 'preact';
import {SignalRemoteReceiver} from '@remote-dom/preact/host';
import {ThreadNestedIframe, ThreadNestedWindow} from '@quilted/threads';
import '@preact/signals';

import {ExtensionRenderer} from './embed/ExtensionRenderer.tsx';
import type {HostAPI, EmbedAPI} from './rpc.ts';

const extensionPoints = new Map(
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-extension-point]'),
  ).map((element) => {
    const extensionPoint = element.dataset.extensionPoint!;

    return [
      extensionPoint,
      {element, extensionPoint, receiver: new SignalRemoteReceiver()},
    ];
  }),
);

const thread = window.opener
  ? new ThreadNestedWindow<HostAPI, EmbedAPI>(window.opener)
  : new ThreadNestedIframe<HostAPI, EmbedAPI>();

const connections: Parameters<HostAPI['connect']>[0] = {};

for (const [extensionPoint, {receiver, element}] of extensionPoints.entries()) {
  connections[extensionPoint] = receiver.connection;
  render(<ExtensionRenderer receiver={receiver} />, element);
}

await thread.imports.connect(connections);
