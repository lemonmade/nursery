import {render} from 'preact';
import type {RemoteConnection} from '@remote-dom/core';
import {SignalRemoteReceiver} from '@remote-dom/preact/host';
import {ThreadNestedIframe, ThreadNestedWindow} from '@quilted/threads';
import '@preact/signals';

import {ExtensionRenderer} from './embed/ExtensionRenderer.tsx';

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

interface ParentPage {
  connect(connections: Record<string, RemoteConnection>): Promise<void>;
}

const thread = window.opener
  ? new ThreadNestedWindow<ParentPage>(window.opener)
  : new ThreadNestedIframe<ParentPage>();

const connections: Parameters<ParentPage['connect']>[0] = {};

for (const [extensionPoint, {receiver, element}] of extensionPoints.entries()) {
  connections[extensionPoint] = receiver.connection;
  render(<ExtensionRenderer receiver={receiver} />, element);
}

await thread.imports.connect(connections);
