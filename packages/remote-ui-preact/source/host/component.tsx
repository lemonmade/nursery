import type {RemoteElementReceived} from '@lemonmade/remote-ui';
import {forwardRef, type ForwardFn} from 'preact/compat';

import {useRemoteReceived} from './hooks/remote-received.ts';
import {usePropsForRemoteElement} from './hooks/props-for-element.ts';
import {
  REMOTE_ELEMENT_PROP,
  REMOTE_ELEMENT_ATTACHED_PROP,
} from './constants.ts';
import type {RemoteComponentRendererProps} from './types.ts';

export interface RemoteComponentRendererAdditionalProps {
  readonly [REMOTE_ELEMENT_PROP]: RemoteElementReceived;
  readonly [REMOTE_ELEMENT_ATTACHED_PROP]: boolean;
}

export function createRemoteComponentRenderer<
  Props extends Record<string, any> = {},
  Instance = never,
>(
  Component: ForwardFn<Props, Instance>,
  {name}: {name?: string} = {},
): ReturnType<typeof forwardRef<Instance, Props>> {
  const RemoteComponentRenderer = forwardRef<
    Instance,
    RemoteComponentRendererProps
  >(function RemoteComponentRenderer({element, receiver, components}, ref) {
    const attachedElement = useRemoteReceived(element, receiver);
    const resolvedElement = attachedElement ?? element;
    const props = usePropsForRemoteElement<Props>(resolvedElement, {
      receiver,
      components,
    });

    (props as any)[REMOTE_ELEMENT_PROP] = resolvedElement;
    (props as any)[REMOTE_ELEMENT_ATTACHED_PROP] = attachedElement != null;

    return Component(props, ref);
  });

  RemoteComponentRenderer.displayName =
    name ??
    `RemoteComponentRenderer(${
      Component.displayName ?? Component.name ?? 'Component'
    })`;

  return RemoteComponentRenderer as any;
}
