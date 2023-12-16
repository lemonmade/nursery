// @vitest-environment jsdom

import {describe, it, expect, vi} from 'vitest';

import {render as preactRender} from 'preact';
import {
  useState,
  type PropsWithChildren,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'preact/compat';

// The `SignalRemoteReceiver` library uses `@preact/signals-core`, which does not include
// the auto-updating of Preact components when they use signals. Importing this library
// applies the internal hooks that make this work.
import '@preact/signals';

import {render} from '@quilted/preact-testing';
import {matchers, type CustomMatchers} from '@quilted/preact-testing/matchers';

import {
  RemoteMutationObserver,
  createRemoteElement,
} from '@lemonmade/remote-ui/elements';
import {SignalRemoteReceiver} from '@lemonmade/remote-ui/signals';

import {createRemoteComponent} from '../index.ts';
import {RemoteRootRenderer, createRemoteComponentRenderer} from '../host.ts';

expect.extend(matchers);

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

interface ButtonProps {
  disabled?: boolean;
  onPress?(): void;
}

const HostButton = forwardRef(function HostButton(
  {children, disabled, onPress}: PropsWithChildren<ButtonProps>,
  ref,
) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    focus() {
      buttonRef.current?.focus();
    },
  }));

  return (
    <button ref={buttonRef} disabled={disabled} onClick={() => onPress?.()}>
      {children}
    </button>
  );
});

const RemoteButtonElement = createRemoteElement<ButtonProps>({
  properties: {
    disabled: {type: Boolean},
    onPress: {type: Function},
  },
  methods: ['focus'],
});

customElements.define('remote-button', RemoteButtonElement);

const RemoteButton = createRemoteComponent(
  'remote-button',
  RemoteButtonElement,
);

const components = new Map([
  ['remote-button', createRemoteComponentRenderer(HostButton)],
]);

declare global {
  interface HTMLElementTagNameMap {
    'remote-button': InstanceType<typeof RemoteButtonElement>;
  }
}

describe('remote-ui-preact', () => {
  it('can render simple remote DOM elements', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.textContent = 'Click me!';
    remoteRoot.append(remoteButton);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).not.toContainPreactComponent(HostButton);

    rendered.act(() => {
      mutationObserver.observe(remoteRoot);
    });

    expect(rendered).toContainPreactComponent(HostButton);
  });

  it('can render remote DOM elements with simple properties', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.setAttribute('disabled', '');
    remoteButton.textContent = 'Disabled button';
    remoteRoot.append(remoteButton);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).toContainPreactComponent(HostButton, {disabled: true});
  });

  it('can render remote DOM elements with event listeners', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.textContent = 'Click to disable';

    remoteButton.addEventListener(
      'press',
      () => {
        remoteButton.textContent = 'Already disabled';
        remoteButton.setAttribute('disabled', '');
      },
      {once: true},
    );

    remoteRoot.append(remoteButton);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    expect(rendered).toContainPreactComponent(HostButton, {disabled: false});

    rendered.find(HostButton)?.trigger('onPress');

    expect(rendered).toContainPreactComponent(HostButton, {disabled: true});
  });

  it('can call methods on a remote DOM element by forwarding calls to the host’s implementation component ref', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');
    const remoteButton = document.createElement('remote-button');
    remoteButton.onPress = () => {
      console.log('HERE');
      remoteButton.focus();
    };
    remoteRoot.append(remoteButton);
    mutationObserver.observe(remoteRoot);

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    const focusSpy = vi.spyOn(rendered.find(HostButton)!.domNode!, 'focus');

    rendered.find(HostButton)?.trigger('onPress');

    expect(focusSpy).toHaveBeenCalled();
  });

  it('can render remote DOM elements wrapped as Preact components', async () => {
    const receiver = new SignalRemoteReceiver();
    const mutationObserver = new RemoteMutationObserver(receiver.connection);

    const remoteRoot = document.createElement('div');

    function Remote() {
      const [disabled, setDisabled] = useState(false);

      return (
        <RemoteButton
          disabled={disabled}
          onPress={() => {
            setDisabled(true);
          }}
        >
          {disabled ? 'Click to disable' : 'Already disabled'}
        </RemoteButton>
      );
    }

    preactRender(
      <Remote />,
      // <RemoteButton disabled>Disabled button</RemoteButton>,
      remoteRoot,
    );

    const rendered = render(
      <RemoteRootRenderer receiver={receiver} components={components} />,
    );

    rendered.act(() => {
      mutationObserver.observe(remoteRoot);
    });

    expect(rendered).toContainPreactComponent(HostButton, {disabled: false});

    rendered.find(HostButton)?.trigger('onPress');

    expect(rendered).toContainPreactComponent(HostButton, {disabled: true});
  });
});
