import type {ComponentType, FunctionComponent} from 'react';

import {useRemoteReceived} from './hooks/remote-received.ts';
import {useReactPropsForElement} from './hooks/react-props-for-element.ts';
import type {RemoteComponentRendererProps} from './types.ts';

export function createRemoteComponentRenderer<
  Props extends Record<string, any> = {},
>(
  Component: ComponentType<Props>,
): FunctionComponent<RemoteComponentRendererProps> {
  const RemoteComponentRenderer: FunctionComponent<RemoteComponentRendererProps> =
    function RemoteComponentRenderer({
      element,
      receiver,
      components,
    }: RemoteComponentRendererProps) {
      const currentElement = useRemoteReceived(element, receiver);
      const props = useReactPropsForElement<Props>(currentElement, {
        receiver,
        components,
      });

      return props ? <Component {...props} /> : null;
    };

  RemoteComponentRenderer.displayName = `RemoteComponentRenderer(${
    Component.displayName ?? Component.name ?? 'Component'
  })`;

  return RemoteComponentRenderer;
}
