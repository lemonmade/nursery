import {type RenderableProps} from 'preact';
import {createRemoteComponentRenderer} from '@remote-dom/preact/host';

export const COMPONENTS = new Map([
  ['cx-text', createRemoteComponentRenderer(ExtensionText)],
  ['cx-banner', createRemoteComponentRenderer(ExtensionBanner)],
  ['cx-stack', createRemoteComponentRenderer(ExtensionStack)],
  [
    'cx-button',
    createRemoteComponentRenderer(ExtensionButton, {
      eventProps: {onClick: {event: 'click'}},
    }),
  ],
]);

function ExtensionText({children}: RenderableProps<{}>) {
  return <span>{children}</span>;
}

function ExtensionBanner({children}: RenderableProps<{}>) {
  return (
    <div
      style={{
        backgroundColor: 'rgb(198, 227, 247)',
        border: '1px solid rgb(57, 85, 111)',
        padding: '1rem',
        borderRadius: '0.75rem',
      }}
    >
      {children}
    </div>
  );
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
  return (
    <button style={{maxWidth: 'max-content'}} onClick={onClick}>
      {children}
    </button>
  );
}
