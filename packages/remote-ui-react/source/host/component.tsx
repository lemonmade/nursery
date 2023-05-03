import type {ReactNode, ComponentType} from 'react';
import type {RemoteReceiver, RemoteElementReceived} from '@lemonmade/remote-ui';

import {useRemoteReceived} from './hooks.ts';
import {renderRemoteNode} from './node.tsx';

export interface RemoteComponentRendererProps {
  remote: RemoteElementReceived;
  receiver: RemoteReceiver;
  components: RemoteComponentRendererMap;
  children?: ReactNode;
}

export type RemoteComponentRendererMap = Map<
  string,
  ComponentType<RemoteComponentRendererProps>
>;

export function createRemoteComponentRenderer<
  Props extends Record<string, any> = {},
>(
  Component: ComponentType<Props>,
): ComponentType<RemoteComponentRendererProps> {
  function RemoteComponentRenderer({
    remote,
    receiver,
    components,
  }: RemoteComponentRendererProps) {
    const component = useRemoteReceived(remote, receiver);

    if (!component) return null;

    const renderOptions = {receiver, components};

    const {children, properties} = component;
    const normalizedChildren: ReactNode[] = [];
    const normalizedProps: Record<string, any> = {...properties};

    for (const child of children) {
      if (child.type === 1 && child.properties.slot) {
        normalizedProps[child.properties.slot as string] = renderRemoteNode(
          child,
          renderOptions,
        );
      } else {
        normalizedChildren.push(renderRemoteNode(child, renderOptions));
      }
    }

    return (
      <Component {...(normalizedProps as any)}>{normalizedChildren}</Component>
    );
  }

  (RemoteComponentRenderer as any).displayName = `RemoteComponentRenderer(${
    Component.displayName ?? Component.name ?? 'Component'
  })`;

  return RemoteComponentRenderer as any;
}
