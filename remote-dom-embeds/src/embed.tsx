import {render, type ComponentChild} from 'preact';
import {
  RemoteRootRenderer,
  SignalRemoteReceiver,
} from '@remote-dom/preact/host';
import {ThreadNestedIframe} from '@quilted/threads';
import '@preact/signals';

import {COMPONENTS} from './embed/extensions.tsx';
import type {HostAPI} from './embed/rpc.ts';

class ExtensionPoint {
  readonly rendered: ComponentChild;
  readonly receiver: SignalRemoteReceiver;

  constructor() {
    this.receiver = new SignalRemoteReceiver();
    this.rendered = (
      <RemoteRootRenderer receiver={this.receiver} components={COMPONENTS} />
    );
  }
}

const extensionPoints = {
  header: new ExtensionPoint(),
  footer: new ExtensionPoint(),
};

function App() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
      {extensionPoints.header.rendered}

      <div>Native embedded app content.</div>

      {extensionPoints.footer.rendered}
    </div>
  );
}

render(<App />, document.getElementById('app')!);

const {connect} = ThreadNestedIframe.import<HostAPI>();

await connect(
  Object.fromEntries(
    Object.entries(extensionPoints).map(([key, {receiver}]) => [
      key,
      receiver.connection,
    ]),
  ),
);
