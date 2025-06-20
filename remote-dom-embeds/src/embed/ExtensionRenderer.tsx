import {type RenderableProps} from 'preact';
import {
  SignalRemoteReceiver,
  RemoteRootRenderer,
  createRemoteComponentRenderer,
} from '@remote-dom/preact/host';

const components = new Map([
  ['extension-text', createRemoteComponentRenderer(ExtensionText)],
  ['extension-banner', createRemoteComponentRenderer(ExtensionBanner)],
  ['extension-stack', createRemoteComponentRenderer(ExtensionStack)],
  [
    'extension-button',
    createRemoteComponentRenderer(ExtensionButton, {
      eventProps: {onClick: {event: 'click'}},
    }),
  ],
]);

export function ExtensionRenderer({
  receiver,
}: {
  receiver: SignalRemoteReceiver;
}) {
  return <RemoteRootRenderer receiver={receiver} components={components} />;
}

function ExtensionText({children}: RenderableProps<{}>) {
  return <span>{children}</span>;
}

function ExtensionBanner({children}: RenderableProps<{}>) {
  return <div>{children}</div>;
}

function ExtensionStack({
  gap = 'medium',
  children,
}: RenderableProps<{gap?: 'small' | 'medium' | 'large' | 'none'}>) {
  const gapStyle = (() => {
    switch (gap) {
      case 'small':
        return '4px';
      case 'medium':
        return '8px';
      case 'large':
        return '16px';
      case 'none':
        return '0px';
    }
  })();

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: gapStyle}}>
      {children}
    </div>
  );
}

function ExtensionButton({
  children,
  onClick,
}: RenderableProps<{onClick?(): void}>) {
  return <button onClick={onClick}>{children}</button>;
}
