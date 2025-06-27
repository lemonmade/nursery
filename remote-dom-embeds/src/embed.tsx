import {render} from 'preact';
import {SignalRemoteReceiver} from '@remote-dom/preact/host';
import {ThreadNestedIframe} from '@quilted/threads';
import '@preact/signals';

import {ExtensionRenderer} from './embed/ExtensionRenderer.tsx';
import type {HostAPI} from './rpc.ts';

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

const {connect} = ThreadNestedIframe.import<HostAPI>();

const connections: Parameters<typeof connect>[0] = {};

for (const [extensionPoint, {receiver, element}] of extensionPoints.entries()) {
  connections[extensionPoint] = receiver.connection;
  render(<ExtensionRenderer receiver={receiver} />, element);
}

await connect(connections);
