import {render} from 'preact';
import {useImperativeHandle} from 'preact/hooks';
import {forwardRef} from 'preact/compat';
import '@preact/signals';

import {
  RemoteMutationObserver,
  createRemoteElement,
  callRemoteElementMethod,
} from '@lemonmade/remote-ui/elements';
import {SignalRemoteReceiver} from '@lemonmade/remote-ui/signals';

import {createRemoteComponent} from '../source/index.ts';
import {
  RemoteRootRenderer,
  createRemoteComponentRenderer,
} from '../source/host.ts';
import {useEffect, useState} from 'preact/hooks';

interface ButtonProps {
  disabled?: boolean;
  onPress?(): void;
}

const HostButton = forwardRef(function HostButton(
  {children, disabled, onPress, count}: PropsWithChildren<ButtonProps>,
  ref,
) {
  useImperativeHandle(ref, () => ({
    focus() {
      console.log('FOCUSING!');
    },
  }));

  return (
    <button data-count={count} disabled={disabled}>
      {children}
    </button>
  );
});

const RemoteButtonElement = createRemoteElement<ButtonProps>({
  properties: {
    count: {type: Number},
    disabled: {type: Boolean},
    onPress: {type: Function},
  },
});

RemoteButtonElement.prototype.focus = function focus() {
  callRemoteElementMethod(this, 'focus');
};

customElements.define('ui-button', RemoteButtonElement);

const RemoteButton = createRemoteComponent('ui-button', RemoteButtonElement);

const components = new Map([
  ['ui-button', createRemoteComponentRenderer(HostButton)],
]);

const receiver = new SignalRemoteReceiver();
const mutationObserver = new RemoteMutationObserver(receiver.connection);

const remoteRoot = document.createElement('div');
document.querySelector('#root').append(remoteRoot);

function Remote() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setInterval(() => {
      setCount((count) => count + 1);
    }, 1_000);
  }, []);

  return (
    <RemoteButton count={count} disabled={count % 2 === 0}>
      Disabled button ({count})
    </RemoteButton>
  );
}

render(<Remote />, remoteRoot);

const hostRoot = document.createElement('div');
document.querySelector('#root').append(hostRoot);
render(
  <RemoteRootRenderer receiver={receiver} components={components} />,
  hostRoot,
);

mutationObserver.observe(remoteRoot);

globalThis.receiver = receiver;
